'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-02 Superpowers code-reviewer collision removal.
// Will: assert oto/agents/code-reviewer.md is absent and oto/agents/oto-code-reviewer.md exists.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 superpowers-code-reviewer-removed: only oto-code-reviewer ships', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after Wave 1 creates oto/agents/.');
});

