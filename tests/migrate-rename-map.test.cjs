'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('dryRun records migrate-scoped engine invocation with derived map', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixtureDir = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-full'), fixtureDir, { recursive: true });

  const result = await migrate.dryRun(fixtureDir);
  const invocation = result.summary.engine_invocation;

  assert.ok(invocation.mapPath.endsWith('.json'));
  assert.equal(invocation.target, fixtureDir);
  assert.equal(invocation.mode, 'dry-run');
  assert.notEqual(invocation.mapPath, path.join(REPO_ROOT, 'rename-map.json'));
});
