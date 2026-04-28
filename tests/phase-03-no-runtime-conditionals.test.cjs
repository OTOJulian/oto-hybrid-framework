'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 / SC#2 (runtime-conditional exclusion)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

function countRuntimeConditionals(file) {
  const source = fs.readFileSync(file, 'utf8');
  return (source.match(/if\s*\(\s*runtime\s*===/g) || []).length;
}

function walkCjsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkCjsFiles(next));
    if (entry.isFile() && entry.name.endsWith('.cjs')) files.push(next);
  }
  return files;
}

test('INS-02 / SC#2: orchestrator (bin/lib/install.cjs) has zero "if (runtime ===" branches', () => {
  assert.equal(countRuntimeConditionals('bin/lib/install.cjs'), 0);
});

test('INS-02 / SC#2: bin/install.js has zero "if (runtime ===" branches', () => {
  assert.equal(countRuntimeConditionals('bin/install.js'), 0);
});

test('INS-02 / SC#2: bin/lib/args.cjs has zero "if (runtime ===" branches', () => {
  assert.equal(countRuntimeConditionals('bin/lib/args.cjs'), 0);
});

test('INS-02 / SC#2: scan covers bin/lib/ EXCLUDING bin/lib/runtime-*.cjs (those are the legitimate adapter homes)', () => {
  const files = walkCjsFiles('bin/lib').filter((file) => !path.basename(file).startsWith('runtime-'));
  assert.ok(files.includes(path.join('bin', 'lib', 'install.cjs')));
  assert.ok(files.includes(path.join('bin', 'lib', 'args.cjs')));

  const offenders = files
    .map((file) => ({ file, count: countRuntimeConditionals(file) }))
    .filter((result) => result.count > 0);
  assert.deepEqual(offenders, []);
});
