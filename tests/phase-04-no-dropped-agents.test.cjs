'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 no-dropped enforcement and D-09.
// Will: scan shipped payload roots and assert dropped-agent substrings from the retained-agents fixture are absent.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 no-dropped-agents: shipped payload contains no dropped agent names', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after Wave 2 dropped-agent fixups land.');
});

