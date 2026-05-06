'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

function delimiterLines(body) {
  return body.split('\n').map((line, index) => ({ line, index })).filter((entry) => entry.line === '---');
}

test('apply rewrites gsd_state_version frontmatter key without moving STATE.md', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), fixture, { recursive: true });

  const statePath = path.join(fixture, '.planning/STATE.md');
  const before = fs.readFileSync(statePath, 'utf8');
  assert.ok(before.includes('gsd_state_version: 1.0'));
  assert.deepEqual(delimiterLines(before).map((entry) => entry.index), [0, 3]);

  await migrate.apply(fixture, {});
  const after = fs.readFileSync(statePath, 'utf8');

  assert.ok(after.includes('oto_state_version: 1.0'));
  assert.equal(after.includes('gsd_state_version'), false);
  assert.deepEqual(delimiterLines(after).map((entry) => entry.index), [0, 3]);
  assert.equal(fs.existsSync(path.join(fixture, '.planning/STATE.md')), true);
  assert.equal(fs.existsSync(path.join(fixture, '.oto/STATE.md')), false);
});
