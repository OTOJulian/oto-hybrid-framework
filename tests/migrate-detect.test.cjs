'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('detectGsdProject returns isGsdEra=true on gsd-project-minimal fixture', async () => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const fixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const result = migrate.detectGsdProject(fixture);

  assert.equal(result.isGsdEra, true);
  assert.ok(result.signals.includes('gsd-state-frontmatter'));
  assert.ok(result.signals.includes('gsd-instruction-markers'));
});

test('detectGsdProject returns isGsdEra=false on non-GSD directory', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.writeFileSync(path.join(tmp, 'README.md'), '# Plain Project\n');

  const result = migrate.detectGsdProject(tmp);
  assert.equal(result.isGsdEra, false);
});
