'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Phase 3 Wave 0 scaffold.
// Covers: INS-01 / SC#4 (unwanted runtime exclusions)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

const EXCLUDE_FILE_BASENAMES = [
  'phase-03-no-unwanted-runtimes.test.cjs',
  'phase-03-help-output.test.cjs',
];

function walkSync(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const next = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walkSync(next));
    if (entry.isFile()) files.push(next);
  }
  return files;
}

function scanFiles() {
  return [
    ...walkSync('bin'),
    ...['scripts/install-smoke.cjs'].filter((p) => fs.existsSync(p)),
  ].filter((file) => !EXCLUDE_FILE_BASENAMES.some((base) => file.endsWith(base)));
}

test('INS-01 / SC#4: grep -E "(--opencode|--kilo|--cursor|--windsurf|--antigravity|--augment|--trae|--qwen|--codebuddy|--cline|--copilot)" returns 0 hits in bin/ and scripts/install*.cjs (excluding foundation-frameworks/, tests/, decisions/, license files, this test file)', () => {
  const prohibited = [
    '--opencode',
    '--kilo',
    '--cursor',
    '--windsurf',
    '--antigravity',
    '--augment',
    '--trae',
    '--qwen',
    '--codebuddy',
    '--cline',
    '--copilot',
  ];
  const offenders = [];
  for (const file of scanFiles()) {
    const content = fs.readFileSync(file, 'utf8');
    for (const token of prohibited) {
      if (content.includes(token)) offenders.push({ file, token });
    }
  }
  assert.deepEqual(offenders, [], `unwanted runtime tokens found: ${JSON.stringify(offenders)}`);
});

test('INS-01: bare-name scan ("opencode", "kilocode", etc.) limited to bin/ and scripts/install*.cjs returns 0 hits', () => {
  const bareNames = [
    'opencode',
    'kilocode',
    'cursor',
    'windsurf',
    'antigravity',
    'augment',
    'trae',
    'qwen',
    'codebuddy',
    'cline',
    'copilot',
  ];
  const offenders = [];
  for (const file of scanFiles()) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const name of bareNames) {
      if (content.includes(name)) offenders.push({ file, name });
    }
  }
  assert.deepEqual(offenders, [], `unwanted runtime names found: ${JSON.stringify(offenders)}`);
});
