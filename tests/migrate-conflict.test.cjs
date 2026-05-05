'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('apply rejects half-migrated instruction markers unless force is set', async (t) => {
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

  const claudePath = path.join(fixture, 'CLAUDE.md');
  const claude = fs.readFileSync(claudePath, 'utf8');
  fs.writeFileSync(claudePath, `<!-- OTO:foo-start -->\nforced partial marker\n<!-- OTO:foo-end -->\n\n${claude}`);

  await assert.rejects(
    () => migrate.apply(fixture, {}),
    (error) => /half-migrated|conflict/i.test(error.message)
  );

  const result = await migrate.apply(fixture, { force: true });
  assert.equal(result.exitCode, 0);
});
