'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseCliArgs } = require('../bin/lib/args.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const adapters = [
  require(path.join(REPO_ROOT, 'bin/lib/runtime-claude.cjs')),
  require(path.join(REPO_ROOT, 'bin/lib/runtime-codex.cjs')),
  require(path.join(REPO_ROOT, 'bin/lib/runtime-gemini.cjs')),
];
const { installAll } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-all-test-'));
  t.after(() => {
    fs.rmSync(d, { recursive: true, force: true });
  });
  return d;
}

function mkdirRuntimeDirs(homeDir, names) {
  for (const name of names) {
    fs.mkdirSync(path.join(homeDir, `.${name}`), { recursive: true });
  }
}

function statePath(homeDir, runtime) {
  return path.join(homeDir, `.${runtime}`, 'oto', '.install.json');
}

test('INS-06: --all with all 3 fake runtime dirs present installs to all 3', async (t) => {
  const homeDir = tmpDir(t);
  mkdirRuntimeDirs(homeDir, ['claude', 'codex', 'gemini']);

  const results = await installAll(adapters, { homeDir, repoRoot: REPO_ROOT });

  assert.deepEqual(results.map((result) => result.runtime), ['claude', 'codex', 'gemini']);
  assert.ok(fs.existsSync(statePath(homeDir, 'claude')));
  assert.ok(fs.existsSync(statePath(homeDir, 'codex')));
  assert.ok(fs.existsSync(statePath(homeDir, 'gemini')));
});

test('INS-06: --all skips absent runtime dirs (only installs to ones whose ~/.<runtime>/ exists)', async (t) => {
  const homeDir = tmpDir(t);
  mkdirRuntimeDirs(homeDir, ['claude']);

  const results = await installAll(adapters, { homeDir, repoRoot: REPO_ROOT });

  assert.deepEqual(results.map((result) => result.runtime), ['claude']);
  assert.ok(fs.existsSync(statePath(homeDir, 'claude')));
  assert.equal(fs.existsSync(statePath(homeDir, 'codex')), false);
  assert.equal(fs.existsSync(statePath(homeDir, 'gemini')), false);
});

test('INS-06: --all with no present runtimes exits 4 with stderr message containing "no runtimes detected"', async (t) => {
  const homeDir = tmpDir(t);
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk, ...args) => {
    writes.push(String(chunk));
    if (typeof args.at(-1) === 'function') args.at(-1)();
    return true;
  };
  t.after(() => {
    process.stderr.write = originalWrite;
  });

  await assert.rejects(
    () => installAll(adapters, { homeDir, repoRoot: REPO_ROOT }),
    (error) => error.exitCode === 4,
  );
  assert.match(writes.join(''), /no runtimes detected/);
});

test('INS-06: --all + --config-dir rejected at parse time (exit 3, stderr contains "--config-dir cannot be used with --all")', () => {
  assert.throws(
    () => parseCliArgs(['install', '--all', '--config-dir', '/tmp/x']),
    (error) => error.exitCode === 3 && error.message.includes('--config-dir cannot be used with --all'),
  );
});
