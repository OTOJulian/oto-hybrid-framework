'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

test('apply rewrites GSD markers to OTO markers in all runtime instruction files', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-full'), fixture, { recursive: true });

  await migrate.apply(fixture, {});

  for (const file of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md']) {
    const body = fs.readFileSync(path.join(fixture, file), 'utf8');
    assert.equal(body.includes('<!-- GSD:'), false, `${file} still has GSD markers`);
    assert.ok((body.match(/<!-- OTO:/g) || []).length >= 3, `${file} should contain OTO markers`);
    assert.ok(body.includes('<!-- OTO:project-start source:PROJECT.md -->'), `${file} lost project source attribute`);
    assert.ok(body.includes('<!-- OTO:stack-start source:research/STACK.md -->'), `${file} lost stack source attribute`);
    assert.ok(body.includes('<!-- OTO:workflow-start source:GSD defaults -->'), `${file} lost workflow source attribute`);
  }
});
