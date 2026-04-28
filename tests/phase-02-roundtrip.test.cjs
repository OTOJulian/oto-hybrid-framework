'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const childProcess = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');

test('CLI verify-roundtrip passes on the real upstream tree', { timeout: 60000 }, () => {
  const result = childProcess.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--verify-roundtrip', '--target', 'foundation-frameworks/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('CLI verify-roundtrip prints the engine summary line', { timeout: 60000 }, () => {
  const result = childProcess.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--verify-roundtrip', '--target', 'foundation-frameworks/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /engine: verify-roundtrip — /);
});
