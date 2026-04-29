'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-02 Superpowers code-reviewer collision removal.
// Will: assert oto/agents/code-reviewer.md is absent and oto/agents/oto-code-reviewer.md exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 superpowers code-reviewer absent', () => {
  assert.ok(
    !fs.existsSync(path.join(REPO_ROOT, 'oto/agents/code-reviewer.md')),
    'Superpowers code-reviewer.md should not exist (AGT-02 collision resolution)',
  );
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, 'oto/agents/oto-code-reviewer.md')),
    'Rebranded oto-code-reviewer.md should exist',
  );
});
