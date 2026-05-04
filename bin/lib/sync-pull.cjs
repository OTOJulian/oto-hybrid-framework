'use strict';

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const { validate } = require('../../scripts/rebrand/lib/validate-schema.cjs');
const lastSyncedSchema = require('../../schema/last-synced-commit.json');

const REF_RE = /^[A-Za-z0-9._/+-]+$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

function validateRef(ref) {
  if (typeof ref !== 'string' || !REF_RE.test(ref) || ref.startsWith('-')) {
    throw new Error(`Invalid ref: '${ref}' contains characters outside [A-Za-z0-9._/+-]`);
  }
}

function classifyRef(ref) {
  if (SHA_RE.test(ref)) return 'sha';
  if (ref === 'main' || ref === 'master') return 'branch';
  return 'tag-or-branch';
}

function assertGitVersion(runner = spawnSync) {
  const result = runner('git', ['--version'], { encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const match = /git version (\d+)\.(\d+)/.exec(output);
  if (!match || Number(match[1]) < 2) {
    throw new Error(`oto sync requires git ≥ 2.0 on PATH (could not parse: '${output}')`);
  }
}

function runGit(args, opts = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8', ...opts });
  const stderr = (result.stderr || '').trim();
  if (result.status === null) {
    throw new Error(`git ${args.join(' ')} did not run: ${result.error?.message}`);
  }
  if (result.status === 255) {
    throw new Error(`git ${args.join(' ')} failed (exit 255): ${stderr}`);
  }
  if (result.status > 0) {
    throw new Error(`git ${args.join(' ')} failed (status ${result.status}): ${stderr}`);
  }
  return result.stdout;
}

function resolveSha(url, ref) {
  const stdout = runGit(['ls-remote', url, ref]);
  const line = stdout.split(/\r?\n/).find((entry) => entry.trim().length > 0);
  if (!line) throw new Error(`git ls-remote returned no refs for '${ref}' at ${url}`);
  return line.split(/\s+/)[0];
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function rotateSnapshots(syncDir) {
  const prior = path.join(syncDir, 'prior');
  const current = path.join(syncDir, 'current');
  if (await pathExists(prior)) await fsp.rm(prior, { recursive: true, force: true });
  if (await pathExists(current)) await fsp.rename(current, prior);
}

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validatePinRecord(record) {
  const result = validate(record, lastSyncedSchema);
  if (!result.valid) {
    throw new Error(`pin record schema violation: ${result.errors.join('; ')}`);
  }
}

async function pullUpstream({ name, url, ref, destDir }) {
  assertGitVersion();
  validateRef(ref);

  if (ref === 'main' || ref === 'master') {
    process.stderr.write(`oto sync: warning — branch pin '${ref}' drifts silently between syncs. Prefer a tag.\n`);
  }

  await fsp.mkdir(destDir, { recursive: true });
  const pinFile = path.join(destDir, 'last-synced-commit.json');
  const current = path.join(destDir, 'current');
  const kind = classifyRef(ref);

  let resolvedSha = null;
  try {
    resolvedSha = resolveSha(url, ref);
  } catch {
    resolvedSha = null;
  }

  const prior = loadJsonIfExists(pinFile);
  if (resolvedSha && prior && prior.sha === resolvedSha && await pathExists(current)) {
    return { ...prior, shortCircuited: true };
  }

  await rotateSnapshots(destDir);

  if (kind === 'sha') {
    runGit(['clone', url, current]);
    runGit(['checkout', ref], { cwd: current });
  } else {
    try {
      runGit(['clone', '--depth', '1', '--branch', ref, url, current]);
    } catch (error) {
      if (await pathExists(current)) await fsp.rm(current, { recursive: true, force: true });
      runGit(['clone', url, current]);
      runGit(['checkout', ref], { cwd: current });
    }
  }

  const sha = runGit(['rev-parse', 'HEAD'], { cwd: current }).trim();
  const record = {
    upstream: name,
    ref_kind: kind === 'sha' ? 'sha' : kind === 'branch' ? 'branch' : 'tag-or-branch',
    ref,
    sha,
    timestamp: new Date().toISOString(),
  };

  validatePinRecord(record);
  const priorPinPath = path.join(destDir, 'prior-last-synced-commit.json');
  if (await pathExists(pinFile)) {
    await fsp.copyFile(pinFile, priorPinPath);
  }
  await fsp.writeFile(pinFile, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

module.exports = { pullUpstream, classifyRef, resolveSha, validateRef, assertGitVersion };
