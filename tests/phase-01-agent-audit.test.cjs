'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AUDIT_FILE = path.join(__dirname, '..', 'decisions', 'agent-audit.md');
// Canonical 33 GSD agent names verified against foundation-frameworks/get-shit-done-main/agents/.
const GSD_AGENTS = [
  'gsd-advisor-researcher',
  'gsd-ai-researcher',
  'gsd-assumptions-analyzer',
  'gsd-code-fixer',
  'gsd-code-reviewer',
  'gsd-codebase-mapper',
  'gsd-debug-session-manager',
  'gsd-debugger',
  'gsd-doc-classifier',
  'gsd-doc-synthesizer',
  'gsd-doc-verifier',
  'gsd-doc-writer',
  'gsd-domain-researcher',
  'gsd-eval-auditor',
  'gsd-eval-planner',
  'gsd-executor',
  'gsd-framework-selector',
  'gsd-integration-checker',
  'gsd-intel-updater',
  'gsd-nyquist-auditor',
  'gsd-pattern-mapper',
  'gsd-phase-researcher',
  'gsd-plan-checker',
  'gsd-planner',
  'gsd-project-researcher',
  'gsd-research-synthesizer',
  'gsd-roadmapper',
  'gsd-security-auditor',
  'gsd-ui-auditor',
  'gsd-ui-checker',
  'gsd-ui-researcher',
  'gsd-user-profiler',
  'gsd-verifier',
];

test('agent-audit.md exists and references all 33 GSD agents', () => {
  assert.ok(fs.existsSync(AUDIT_FILE), 'agent-audit.md missing');
  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  for (const agent of GSD_AGENTS) {
    assert.match(content, new RegExp(`\\b${agent}\\b`), `agent-audit.md missing ${agent}`);
  }
});

test('agent-audit.md verdict counts: KEEP=23, DROP=10', () => {
  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  const lines = content.split(/\r?\n/);
  let keep = 0;
  let drop = 0;
  for (const line of lines) {
    const m = line.match(/^\|\s*`?gsd-[a-z-]+`?\s*\|\s*(KEEP|DROP|MERGE)\b/i)
      || line.match(/^- `gsd-[a-z-]+`.*\b(KEEP|DROP|MERGE)\b/i);
    if (m) {
      const v = m[1].toUpperCase();
      if (v === 'KEEP') keep++;
      else if (v === 'DROP') drop++;
    }
  }
  assert.equal(keep, 23, `Expected 23 KEEP rows, got ${keep}`);
  assert.equal(drop, 10, `Expected 10 DROP rows, got ${drop}`);
});
