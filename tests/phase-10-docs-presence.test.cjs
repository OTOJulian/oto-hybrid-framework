'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SYNC_DOC = path.join(REPO_ROOT, 'docs/upstream-sync.md');
const REBRAND_DOC = path.join(REPO_ROOT, 'docs/rebrand-engine.md');

test('DOC-03: docs/upstream-sync.md exists with required sections', (t) => {
  if (!fs.existsSync(SYNC_DOC)) {
    t.todo('Wave 1 must create docs/upstream-sync.md');
    return;
  }

  const body = fs.readFileSync(SYNC_DOC, 'utf8');
  assert.ok(body.includes('## Quick start'));
  assert.ok(body.includes('## How sync works'));
  assert.ok(body.includes('oto sync'));
  assert.ok(body.includes('.oto-sync-conflicts/'));
});

test('DOC-04: docs/rebrand-engine.md exists with required sections', (t) => {
  if (!fs.existsSync(REBRAND_DOC)) {
    t.todo('Wave 1 must create docs/rebrand-engine.md');
    return;
  }

  const body = fs.readFileSync(REBRAND_DOC, 'utf8');
  assert.ok(body.includes('## Rule classes'));
  assert.ok(body.includes('## Allowlist'));
  assert.ok(body.includes('--dry-run'));
  assert.ok(body.includes('--verify-roundtrip'));
});
