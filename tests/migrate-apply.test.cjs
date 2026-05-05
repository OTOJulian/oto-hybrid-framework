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

test('apply rewrites planning artifacts while preserving source fixture and .planning directory', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const sourceBefore = fileManifest(sourceFixture);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });

  const result = await migrate.apply(fixture, {});
  const state = fs.readFileSync(path.join(fixture, '.planning/STATE.md'), 'utf8');
  const claude = fs.readFileSync(path.join(fixture, 'CLAUDE.md'), 'utf8');
  const plan = fs.readFileSync(path.join(fixture, '.planning/phases/01-example/01-PLAN.md'), 'utf8');

  assert.equal(result.mode, 'apply');
  assert.equal(result.exitCode, 0);
  assert.ok(state.includes('oto_state_version'));
  assert.equal(state.includes('gsd_state_version'), false);
  assert.ok(claude.includes('<!-- OTO:project-start'));
  assert.equal(claude.includes('<!-- GSD:project-start'), false);
  assert.ok(plan.includes('/oto-execute-phase'));
  assert.equal(plan.includes('/gsd-execute-phase'), false);
  assert.deepEqual(fileManifest(sourceFixture), sourceBefore);
  assert.equal(fs.existsSync(path.join(fixture, '.planning')), true);
  assert.equal(fs.existsSync(path.join(fixture, '.oto')), false);
});

test('apply with renameStateDir backs up and rewrites gitignore planning entry', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, '.gitignore'), '.planning/\nnode_modules/\n');

  const result = await migrate.apply(fixture, { renameStateDir: true });

  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(path.join(fixture, '.planning')), false);
  assert.equal(fs.existsSync(path.join(fixture, '.oto')), true);
  assert.equal(fs.readFileSync(path.join(fixture, '.gitignore'), 'utf8'), '.oto/\nnode_modules/\n');
  assert.ok(result.backupDir, 'backupDir should be reported');
  assert.equal(
    fs.readFileSync(path.join(result.backupDir, '.gitignore'), 'utf8'),
    '.planning/\nnode_modules/\n'
  );
});
