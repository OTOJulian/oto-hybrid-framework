'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DECISIONS_DIR = path.join(__dirname, '..', 'decisions');

test('decisions/ contains expected reference files', () => {
  assert.ok(fs.existsSync(path.join(DECISIONS_DIR, 'skill-vs-command.md')), 'skill-vs-command.md missing');
  assert.ok(fs.existsSync(path.join(DECISIONS_DIR, 'agent-audit.md')), 'agent-audit.md missing');
});

test('decisions/ has >=18 files (14 ADRs + skill-vs-command.md + agent-audit.md + >=2 inventory)', () => {
  const all = fs.readdirSync(DECISIONS_DIR);
  assert.ok(all.length >= 18, `Expected >=18 files, found ${all.length}: ${all.join(', ')}`);
});
