'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-04 Codex sandbox map coverage.
// Will: require runtime-codex.cjs and assert agentSandboxes has set equality with the retained-agents fixture.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 codex-sandbox-coverage: retained agents have Codex sandbox entries', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after plan 04-06 populates agentSandboxes.');
});

