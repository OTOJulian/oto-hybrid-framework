'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-runtime-sync.cjs');

test('check-runtime-sync exits 0 (installed runtime roots are in sync or skipped)', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(
    result.status,
    0,
    `check-runtime-sync reported drift (exit ${result.status}).\n` +
      `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
});
