'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

function fileManifest(root) {
  const entries = [];
  function walk(dir) {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        walk(abs);
      } else {
        const rel = path.relative(root, abs);
        const hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
        entries.push(`${rel}:${hash}`);
      }
    }
  }
  walk(root);
  return entries.sort();
}

test('apply is idempotent on second run', async (t) => {
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

  await migrate.apply(fixture, {});
  const beforeSecondRun = fileManifest(fixture);
  const result = await migrate.apply(fixture, {});
  const afterSecondRun = fileManifest(fixture);

  assert.deepEqual(afterSecondRun, beforeSecondRun);
  assert.ok(result.filesChanged.length === 0 || result.reason === 'no GSD signals');
});
