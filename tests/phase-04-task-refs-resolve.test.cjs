'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 Task refs and D-09 retained-agent reference enforcement.
// Will: scan command/workflow subagent_type refs and assert each resolves to a retained agent or generic allowlist item.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 task-refs-resolve: workflow subagent refs resolve to retained agents', (t) => {
  t.todo('Implemented in Wave 3 (plan 04-07) after command and workflow payloads exist.');
});

