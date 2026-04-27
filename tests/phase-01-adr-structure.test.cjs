'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DECISIONS_DIR = path.join(__dirname, '..', 'decisions');
const REQUIRED_PATTERNS = [
  /^# ADR-\d{2}: /m,
  /^Status: (Accepted|Deferred|Superseded by ADR-\d{2})$/m,
  /^Date: \d{4}-\d{2}-\d{2}$/m,
  /^Implements: D-\d{2}/m,
  /^## Context$/m,
  /^## Decision$/m,
  /^## Rationale$/m,
  /^## Consequences$/m,
];

test('decisions/ directory exists', () => {
  assert.ok(fs.existsSync(DECISIONS_DIR), `Expected ${DECISIONS_DIR} to exist`);
});

test('every ADR-NN-*.md has the 8 required structural patterns', () => {
  const files = fs.readdirSync(DECISIONS_DIR).filter((f) => /^ADR-\d{2}-.*\.md$/.test(f));
  assert.ok(files.length >= 14, `Expected >=14 ADR files, found ${files.length}`);
  for (const file of files) {
    const content = fs.readFileSync(path.join(DECISIONS_DIR, file), 'utf8');
    for (const pat of REQUIRED_PATTERNS) {
      assert.match(content, pat, `${file}: missing required pattern ${pat}`);
    }
  }
});

test('ADR numbers are sequential 01..14 with no gaps and no duplicates', () => {
  const files = fs.readdirSync(DECISIONS_DIR).filter((f) => /^ADR-\d{2}-.*\.md$/.test(f)).sort();
  const numbers = files.map((f) => parseInt(f.match(/^ADR-(\d{2})-/)[1], 10));
  for (let i = 0; i < 14; i++) {
    assert.equal(numbers[i], i + 1, `ADR-${String(i + 1).padStart(2, '0')} missing or out of order`);
  }
});
