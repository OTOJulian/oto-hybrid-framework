'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 frontmatter validation.
// Will: walk oto/agents/oto-*.md, parse frontmatter, and assert name/description keys are valid.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 frontmatter-schema: every retained agent has valid frontmatter', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after Wave 1 populates oto/agents/.');
});

