'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const { validateRef } = require('./sync-pull.cjs');
const { acceptConflict, acceptDeletion, keepDeleted } = require('./sync-accept.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STAGE_SCRIPTS = {
  'pull-gsd': path.join(REPO_ROOT, 'scripts/sync-upstream/pull-gsd.cjs'),
  'pull-superpowers': path.join(REPO_ROOT, 'scripts/sync-upstream/pull-superpowers.cjs'),
  rebrand: path.join(REPO_ROOT, 'scripts/sync-upstream/rebrand.cjs'),
  merge: path.join(REPO_ROOT, 'scripts/sync-upstream/merge.cjs'),
};

function parseSyncArgs(argv) {
  const toIndex = argv.indexOf('--to');
  if (toIndex !== -1 && argv[toIndex + 1] && argv[toIndex + 1].startsWith('-')) {
    validateRef(argv[toIndex + 1]);
  }
  const { values } = parseArgs({
    args: argv,
    options: {
      upstream: { type: 'string' },
      to: { type: 'string' },
      apply: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      accept: { type: 'string' },
      'accept-deletion': { type: 'string' },
      'keep-deleted': { type: 'string' },
      status: { type: 'boolean', default: false },
      'fixture-url': { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  const actionFlags = [
    values.status,
    values.accept,
    values['accept-deletion'],
    values['keep-deleted'],
  ].filter(Boolean);
  if (actionFlags.length > 1) {
    throw new Error('--status, --accept, --accept-deletion, and --keep-deleted are mutually exclusive');
  }
  if (values.apply && values['dry-run']) {
    throw new Error('--apply cannot be combined with --dry-run');
  }

  let mode = 'full';
  if (values.status) mode = 'status';
  else if (values.accept) mode = 'accept';
  else if (values['accept-deletion']) mode = 'accept-deletion';
  else if (values['keep-deleted']) mode = 'keep-deleted';

  if (mode !== 'full' && mode !== 'status' && (values.upstream || values.to)) {
    throw new Error('--accept / --accept-deletion / --keep-deleted cannot be combined with --upstream/--to');
  }
  if (mode === 'status' && (values.upstream || values.to || values.apply || values['dry-run'])) {
    throw new Error('--status cannot be combined with sync target flags');
  }
  if (mode === 'full' && (!values.upstream || !values.to)) {
    throw new Error('--upstream and --to are required (or use --accept/--status)');
  }
  if (mode === 'full') validateRef(values.to);

  return { mode, ...values, apply: values.apply === true };
}

function runStage(stageName, args) {
  const script = STAGE_SCRIPTS[stageName];
  if (!script) throw new Error(`unknown stage: ${stageName}`);
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  if (result.status === null) {
    throw new Error(`stage ${stageName} did not run: ${result.error?.message}`);
  }
  return result.status;
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function rotateRebrandedSnapshot(upstream) {
  const syncDir = path.resolve(`.oto-sync/rebranded/${upstream}`);
  const current = path.join(syncDir, 'current');
  const prior = path.join(syncDir, 'prior');
  if (!await pathExists(current)) return;
  if (await pathExists(prior)) await fsp.rm(prior, { recursive: true, force: true });
  await fsp.mkdir(syncDir, { recursive: true });
  await fsp.rename(current, prior);
}

async function runOneFullSync(upstream, parsed) {
  const pullStage = upstream === 'gsd' ? 'pull-gsd' : 'pull-superpowers';
  const pullArgs = ['--to', parsed.to];
  let dryDir = null;
  if (parsed['fixture-url']) pullArgs.push('--url', parsed['fixture-url']);
  if (!parsed.apply) {
    dryDir = await fsp.mkdtemp(path.join(os.tmpdir(), `oto-sync-dryrun-${upstream}-`));
    pullArgs.push('--dest-dir', dryDir);
  }

  const pullStatus = runStage(pullStage, pullArgs);
  if (pullStatus !== 0) return pullStatus;

  const rebrandArgs = ['--upstream', upstream];
  if (dryDir) {
    rebrandArgs.push('--target', path.join(dryDir, 'current'));
    rebrandArgs.push('--out', path.join(dryDir, 'rebranded-current'));
    rebrandArgs.push('--map', path.resolve('rename-map.json'));
  } else {
    await rotateRebrandedSnapshot(upstream);
  }
  const rebrandStatus = runStage('rebrand', rebrandArgs);
  if (rebrandStatus !== 0) return rebrandStatus;

  const mergeArgs = ['--upstream', upstream];
  if (parsed.apply) mergeArgs.push('--apply');
  if (dryDir) {
    mergeArgs.push('--rebranded-dir', path.join(dryDir, 'rebranded-current'));
    mergeArgs.push('--prior-rebranded-dir', path.join(dryDir, 'rebranded-prior'));
    mergeArgs.push('--pin-file', path.join(dryDir, 'last-synced-commit.json'));
    mergeArgs.push('--prior-pin-file', path.join(dryDir, 'prior-last-synced-commit.json'));
  }
  return runStage('merge', mergeArgs);
}

async function runFullSync(parsed) {
  const upstreams = parsed.upstream === 'all' ? ['gsd', 'superpowers'] : [parsed.upstream];
  for (const upstream of upstreams) {
    if (upstream !== 'gsd' && upstream !== 'superpowers') {
      throw new Error(`unknown upstream '${upstream}' (must be gsd, superpowers, or all)`);
    }
    const status = await runOneFullSync(upstream, parsed);
    if (status !== 0) return status;
  }
  return 0;
}

async function countConflicts(conflictsDir) {
  const counts = { modified: 0, added: 0, deleted: 0 };
  async function walk(dir, rel = '') {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
      const nextRel = path.join(rel, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, nextRel);
      else if (nextRel === 'REPORT.md') continue;
      else if (nextRel.endsWith('.added.md')) counts.added += 1;
      else if (nextRel.endsWith('.deleted.md')) counts.deleted += 1;
      else if (nextRel.endsWith('.md')) counts.modified += 1;
    }
  }
  try {
    await walk(conflictsDir);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return counts;
}

async function runStatus() {
  const lines = ['oto sync — status'];
  for (const upstream of ['gsd', 'superpowers']) {
    const pinPath = path.resolve(`.oto-sync/upstream/${upstream}/last-synced-commit.json`);
    let pin = null;
    try {
      pin = JSON.parse(await fsp.readFile(pinPath, 'utf8'));
    } catch {
      pin = null;
    }
    if (pin) {
      lines.push(`  ${upstream}: ref=${pin.ref} sha=${pin.sha.slice(0, 7)} at ${pin.timestamp}`);
    } else {
      lines.push(`  ${upstream}: not synced`);
    }
  }
  const counts = await countConflicts(path.resolve('.oto-sync-conflicts'));
  lines.push(`  pending conflicts: M=${counts.modified} A=${counts.added} D=${counts.deleted}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

async function runSync(argv) {
  let parsed;
  try {
    parsed = parseSyncArgs(argv);
  } catch (error) {
    process.stderr.write(`oto sync: ${error.message}\n`);
    return 3;
  }

  try {
    const otoDir = path.resolve('oto');
    const conflictsDir = path.resolve('.oto-sync-conflicts');
    const inventoryPath = path.resolve('decisions/file-inventory.json');
    const allowlistPath = path.resolve('decisions/sync-allowlist.json');

    if (parsed.mode === 'status') return await runStatus();
    if (parsed.mode === 'accept') {
      await acceptConflict({ relPath: parsed.accept, otoDir, conflictsDir });
      process.stdout.write(`accepted: ${parsed.accept}\n`);
      return 0;
    }
    if (parsed.mode === 'accept-deletion') {
      await acceptDeletion({ relPath: parsed['accept-deletion'], otoDir, conflictsDir, inventoryPath });
      process.stdout.write(`accepted-deletion: ${parsed['accept-deletion']}\n`);
      return 0;
    }
    if (parsed.mode === 'keep-deleted') {
      await keepDeleted({ relPath: parsed['keep-deleted'], conflictsDir, allowlistPath });
      process.stdout.write(`kept-deleted: ${parsed['keep-deleted']}\n`);
      return 0;
    }
    return await runFullSync(parsed);
  } catch (error) {
    process.stderr.write(`oto sync: ${error.message}\n`);
    return 1;
  }
}

module.exports = { runSync, parseSyncArgs, runStatus, runFullSync };
