'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');

function runDryrun() {
  return childProcess.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--dry-run', '--target', 'foundation-frameworks/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

test('CLI dry-run writes JSON and markdown reports', { timeout: 30000 }, () => {
  const result = runDryrun();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const jsonPath = path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json');
  const mdPath = path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.md');
  assert.equal(fs.existsSync(jsonPath), true);
  assert.equal(fs.existsSync(mdPath), true);
  assert.ok(fs.readFileSync(mdPath, 'utf8').length > 0);
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(json.unclassified_total, 0);
});

test('CLI dry-run report includes real rule-type counts', { timeout: 30000 }, () => {
  const result = runDryrun();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'), 'utf8'));
  assert.ok(json.summary_by_rule_type.identifier > 0);
  assert.ok(json.summary_by_rule_type.path > 0);
  assert.ok(json.summary_by_rule_type.command > 0);
});

test('CLI dry-run report file entries match the D-04 shape', { timeout: 30000 }, () => {
  const result = runDryrun();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const json = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'), 'utf8'));
  assert.ok(Array.isArray(json.files));
  assert.ok(json.files.length > 0);
  for (const entry of json.files.slice(0, 25)) {
    for (const key of ['path', 'file_class', 'matches', 'unclassified_count']) {
      assert.equal(Object.hasOwn(entry, key), true, `missing ${key}`);
    }
  }
});
