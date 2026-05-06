'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');
const OTO_TOOLS_PATH = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');

test('progress init treats default-migrated .planning layout as an OTO project', async (t) => {
  const migrate = require(MIGRATE_PATH);
  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-progress-migrated-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, '.planning', 'PROJECT.md'), '# Project\n\nGSD-era project.\n');
  const migrateResult = await migrate.apply(fixture, {});
  assert.equal(migrateResult.exitCode, 0);
  assert.equal(fs.existsSync(path.join(fixture, '.planning')), true);
  assert.equal(fs.existsSync(path.join(fixture, '.oto')), false);

  const progress = spawnSync(process.execPath, [
    OTO_TOOLS_PATH,
    'init',
    'progress',
    '--cwd',
    fixture,
    '--raw',
  ], {
    cwd: fixture,
    encoding: 'utf8',
  });

  assert.equal(progress.status, 0, progress.stderr);
  const result = JSON.parse(progress.stdout);
  assert.equal(result.project_exists, true);
  assert.equal(result.roadmap_exists, true);
  assert.equal(result.state_exists, true);
  assert.equal(result.state_path, '.planning/STATE.md');
  assert.equal(result.roadmap_path, '.planning/ROADMAP.md');
  assert.equal(result.project_path, '.planning/PROJECT.md');
});
