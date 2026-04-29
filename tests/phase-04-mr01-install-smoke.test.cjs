'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: MR-01 automated Claude install smoke.
// Will: npm-pack the repo, install into a temp prefix, run oto install --claude, and inspect the install state.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 mr01-install-smoke: packed oto installs Claude payload into temp config dir', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after Phase 4 payload files exist.');
});

