'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../scripts/rebrand/lib/engine.cjs');

test('engine prints one summary line for dry-run mode', { timeout: 30000 }, async () => {
  const originalLog = console.log;
  const chunks = [];
  console.log = function log(line) {
    chunks.push(String(line));
  };
  try {
    const result = await engine.run({ mode: 'dry-run', target: 'foundation-frameworks/' });
    assert.equal(result.exitCode, 0);
  } finally {
    console.log = originalLog;
  }
  const lines = chunks;
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^engine: dry-run — \d+ files, \d+ matches, 0 unclassified, \d+ms$/);
});
