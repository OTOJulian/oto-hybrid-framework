'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { validate } = require('./helpers/load-schema');

const REPO_ROOT = path.join(__dirname, '..');
const INVENTORY_PATH = path.join(REPO_ROOT, 'decisions', 'file-inventory.json');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schema', 'file-inventory.json');

test('schema/file-inventory.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(SCHEMA_PATH), 'schema missing');
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  assert.equal(schema.version || schema.$schema && schema.$schema.includes('json-schema'), true, 'schema malformed');
});

test('decisions/file-inventory.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(INVENTORY_PATH), 'inventory missing - run scripts/gen-inventory.cjs');
  JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
});

test('inventory validates against schema', () => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const result = validate(data, schema);
  assert.ok(result.valid, `Schema errors:\n${result.errors.slice(0, 10).join('\n')}`);
});

test('entry count matches filesystem walk', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const fsCount = parseInt(
    execSync('find foundation-frameworks/get-shit-done-main foundation-frameworks/superpowers-main -type f | wc -l', { cwd: REPO_ROOT }).toString().trim(),
    10
  );
  assert.equal(data.entries.length, fsCount, `Expected ${fsCount} entries, got ${data.entries.length}`);
});

test('every keep/merge has target_path', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    if (e.verdict === 'keep' || e.verdict === 'merge') {
      assert.ok(e.target_path && e.target_path.length > 0, `${e.path}: ${e.verdict} but no target_path`);
    }
  }
});

test('every merge has merge_source_files', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    if (e.verdict === 'merge') {
      assert.ok(Array.isArray(e.merge_source_files) && e.merge_source_files.length >= 1, `${e.path}: merge but no source files`);
    }
  }
});

test('license entries use explicit consolidation contract', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const licenseEntries = data.entries.filter((e) => e.category === 'license');
  assert.equal(licenseEntries.length, 2, 'expected two upstream license entries');

  for (const e of licenseEntries) {
    assert.equal(e.verdict, 'merge', `${e.upstream}/${e.path}: license entries should merge into attribution file`);
    assert.equal(e.target_path, 'THIRD-PARTY-LICENSES.md');
    assert.ok(!e.target_path.includes('('), `${e.upstream}/${e.path}: target_path should be a real path, not a note`);
    assert.deepEqual(e.merge_source_files, [
      'foundation-frameworks/get-shit-done-main/LICENSE',
      'foundation-frameworks/superpowers-main/LICENSE',
    ]);
  }
});

test('entries sorted by path ASC', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (let i = 1; i < data.entries.length; i++) {
    const a = `${data.entries[i - 1].upstream}/${data.entries[i - 1].path}`;
    const b = `${data.entries[i].upstream}/${data.entries[i].path}`;
    assert.ok(a < b, `Out of order: ${a} >= ${b}`);
  }
});

test('no duplicate (upstream, path)', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const seen = new Set();
  for (const e of data.entries) {
    const k = `${e.upstream}::${e.path}`;
    assert.ok(!seen.has(k), `Duplicate entry: ${k}`);
    seen.add(k);
  }
});

test('no unclassified verdicts', () => {
  const data = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  for (const e of data.entries) {
    assert.ok(['keep', 'drop', 'merge'].includes(e.verdict), `${e.path}: invalid verdict ${e.verdict}`);
  }
});
