'use strict';

/**
 * Phase 14 gap-closure (WR-01 / SECR-03 / SECR-04) — migration locking.
 *
 * Pins the shared CJS lock identity, skip-on-contention read semantics, stale
 * lock recovery, multi-process interleaving, and the config-set transaction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const SECRETS = path.join(REPO_ROOT, 'oto/bin/lib/secrets.cjs');
const {
  migrateLegacyIntegrationKeys,
  withConfigDirLock,
} = require(SECRETS);

function seedFixture(t, config) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migration-lock-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migration-lock-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));

  const planningDir = path.join(project, '.oto');
  const keyfileDir = path.join(home, '.oto');
  const configPath = path.join(planningDir, 'config.json');
  const lockPath = path.join(planningDir, '.lock');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return { project, home, planningDir, keyfileDir, configPath, lockPath };
}

function cleanEnv(home) {
  return {
    ...process.env,
    HOME: home,
    EXA_API_KEY: '',
    BRAVE_API_KEY: '',
    FIRECRAWL_API_KEY: '',
  };
}

function runConfig(fixture, ...args) {
  return spawnSync(process.execPath, [OTO_TOOLS, ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

function assertNoLockOrTempFiles(fixture) {
  const entries = fs.readdirSync(fixture.planningDir);
  assert.equal(fs.existsSync(fixture.lockPath), false, 'config lock must be released');
  assert.deepEqual(entries.filter((name) => name.includes('.tmp.')), []);
}

test('L1 fresh config lock skips migration without changing bytes or writing a keyfile', (t) => {
  const marker = 'sk-legacy-lock-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, commit_docs: false });
  const before = fs.readFileSync(fixture.configPath, 'utf8');
  fs.writeFileSync(fixture.lockPath, JSON.stringify({ pid: process.pid }));

  const result = migrateLegacyIntegrationKeys(fixture.configPath, fixture.keyfileDir);

  assert.deepEqual(result, { migrated: [], skipped: true });
  assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(fixture.keyfileDir, 'exa_api_key')), false);
});

test('L2 migration proceeds after contention clears and preserves unrelated config', (t) => {
  const marker = 'sk-legacy-lock-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, commit_docs: false });
  fs.writeFileSync(fixture.lockPath, JSON.stringify({ pid: process.pid }));
  fs.unlinkSync(fixture.lockPath);

  const result = migrateLegacyIntegrationKeys(fixture.configPath, fixture.keyfileDir);

  assert.deepEqual(result.migrated, ['exa_search']);
  assert.equal(fs.readFileSync(path.join(fixture.keyfileDir, 'exa_api_key'), 'utf8'), marker + '\n');
  assert.equal(fs.statSync(path.join(fixture.keyfileDir, 'exa_api_key')).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')), {
    exa_search: true,
    commit_docs: false,
  });
  assertNoLockOrTempFiles(fixture);
});

test('L3 stale lock is evicted and a thrown locked callback still releases the lock', (t) => {
  const marker = 'sk-legacy-lock-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, commit_docs: false });
  fs.writeFileSync(fixture.lockPath, JSON.stringify({ pid: process.pid }));
  const stale = new Date(Date.now() - 31_000);
  fs.utimesSync(fixture.lockPath, stale, stale);

  const result = migrateLegacyIntegrationKeys(fixture.configPath, fixture.keyfileDir);

  assert.deepEqual(result.migrated, ['exa_search']);
  assert.equal(fs.existsSync(fixture.lockPath), false);
  assert.throws(
    () => withConfigDirLock(fixture.configPath, () => { throw new Error('synthetic callback failure'); }),
    /synthetic callback failure/,
  );
  assertNoLockOrTempFiles(fixture);
});

test('L4 contending child skips, then unrelated writer and migration both survive', (t) => {
  const marker = 'sk-legacy-lock-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, commit_docs: false });
  const before = fs.readFileSync(fixture.configPath, 'utf8');
  fs.writeFileSync(fixture.lockPath, JSON.stringify({ pid: process.pid }));

  const script = [
    `const { migrateLegacyIntegrationKeys } = require(${JSON.stringify(SECRETS)});`,
    `const result = migrateLegacyIntegrationKeys(${JSON.stringify(fixture.configPath)}, ${JSON.stringify(fixture.keyfileDir)});`,
    'process.stdout.write(JSON.stringify(result));',
  ].join(' ');
  const child = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });

  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { migrated: [], skipped: true });
  assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(fixture.keyfileDir, 'exa_api_key')), false);

  fs.writeFileSync(fixture.configPath, JSON.stringify({ exa_search: marker, commit_docs: true }, null, 2) + '\n');
  fs.unlinkSync(fixture.lockPath);
  migrateLegacyIntegrationKeys(fixture.configPath, fixture.keyfileDir);

  assert.deepEqual(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')), {
    exa_search: true,
    commit_docs: true,
  });
  assert.equal(fs.readFileSync(path.join(fixture.keyfileDir, 'exa_api_key'), 'utf8'), marker + '\n');
  assertNoLockOrTempFiles(fixture);
});

test('L5 integration config-set migrates and mutates inside one leak-free transaction', (t) => {
  const marker = 'sk-legacy-brave-0123456789';
  const fixture = seedFixture(t, { brave_search: marker, commit_docs: false });

  const result = runConfig(fixture, 'config-set', 'exa_search', 'true');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')), {
    brave_search: true,
    commit_docs: false,
    exa_search: true,
  });
  const keyfile = path.join(fixture.keyfileDir, 'brave_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), marker + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
  assertNoLockOrTempFiles(fixture);
});

test('L6 contention withholds sensitive config-get but unrelated reads fail open', (t) => {
  const marker = 'sk-legacy-lock-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, commit_docs: false });
  const before = fs.readFileSync(fixture.configPath, 'utf8');
  fs.writeFileSync(fixture.lockPath, JSON.stringify({ pid: process.pid }));

  const sensitive = runConfig(fixture, 'config-get', 'exa_search');
  const unrelated = runConfig(fixture, 'config-get', 'commit_docs');

  assert.notEqual(sensitive.status, 0);
  assert.match(sensitive.stdout + sensitive.stderr, /legacy key migration failed — value withheld/);
  assert.doesNotMatch(sensitive.stdout + sensitive.stderr, new RegExp(marker));
  assert.equal(unrelated.status, 0, unrelated.stderr);
  assert.match(unrelated.stdout, /false/);
  assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(fixture.keyfileDir, 'exa_api_key')), false);
});
