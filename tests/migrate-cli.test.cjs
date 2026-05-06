'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('public oto migrate dispatch supports dry-run, apply, and non-GSD failure', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }
  assert.equal(typeof migrate.main, 'function');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const dryFixture = path.join(tmp, 'dry');
  const applyFixture = path.join(tmp, 'apply');
  const plainProject = path.join(tmp, 'plain');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), dryFixture, { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), applyFixture, { recursive: true });
  fs.mkdirSync(plainProject);
  fs.writeFileSync(path.join(plainProject, 'README.md'), '# Plain\n');

  const tools = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
  const oto = path.join(REPO_ROOT, 'bin/install.js');
  const publicDryRun = spawnSync(process.execPath, [oto, 'migrate', '--dry-run'], {
    cwd: dryFixture,
    encoding: 'utf8',
  });
  assert.equal(publicDryRun.status, 0, `${publicDryRun.stderr}\n${publicDryRun.stdout}`);
  assert.match(publicDryRun.stdout, /dry-run|files|migrate/i);

  const dryRun = spawnSync(process.execPath, [tools, 'migrate', '--dry-run'], {
    cwd: dryFixture,
    encoding: 'utf8',
  });
  assert.equal(dryRun.status, 0, `${dryRun.stderr}\n${dryRun.stdout}`);
  assert.match(dryRun.stdout, /dry-run|files|migrate/i);

  const apply = spawnSync(process.execPath, [tools, 'migrate', '--apply'], {
    cwd: applyFixture,
    encoding: 'utf8',
  });
  assert.equal(apply.status, 0, `${apply.stderr}\n${apply.stdout}`);
  assert.ok(fs.readFileSync(path.join(applyFixture, 'CLAUDE.md'), 'utf8').includes('<!-- OTO:project-start'));

  const missingSignal = spawnSync(process.execPath, [tools, 'migrate'], {
    cwd: plainProject,
    encoding: 'utf8',
  });
  assert.notEqual(missingSignal.status, 0);
});
