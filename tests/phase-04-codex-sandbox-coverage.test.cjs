'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-04 Codex sandbox map coverage.
// Will: require runtime-codex.cjs and assert agentSandboxes has set equality with the retained-agents fixture.
const test = require('node:test');
const assert = require('node:assert/strict');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');
const adapter = require('../bin/lib/runtime-codex.cjs');

test('phase-04 codex-sandbox-coverage: agentSandboxes covers exactly the retained set', () => {
  assert.ok(adapter.agentSandboxes && typeof adapter.agentSandboxes === 'object', 'agentSandboxes must be an object');
  const keys = Object.keys(adapter.agentSandboxes).sort();
  const expected = [...retainedAgents.agents].sort();
  assert.deepEqual(keys, expected, 'agentSandboxes keys must equal retained-agents fixture');
  assert.equal(keys.length, 23);
  for (const [k, v] of Object.entries(adapter.agentSandboxes)) {
    assert.ok(v === 'workspace-write' || v === 'read-only', `${k}: invalid sandbox mode "${v}"`);
  }
});
