// tests/workflow-eval-review.test.cjs
// Workflow-shape assertions for oto/workflows/eval-review.md (Plan 02-03).
// Covers WF-EVAL-01..02 and locks Plan-02-01 hand-fixup regression guards:
// SDK fallback, auditor read-only-agent reshape, and W3 replacement semantics.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WF = fs.readFileSync(path.join(ROOT, 'oto/workflows/eval-review.md'), 'utf8');

test('WF-EVAL-01: workflow body is the rebrand-ported executable (not deferral stub)', () => {
  assert.ok(WF.includes('oto-eval-auditor'), 'must reference the eval auditor agent');
  assert.ok(!/intentionally non-executable/i.test(WF), 'no deferral framing');
  assert.ok(!/DEFERRED/.test(WF), 'no DEFERRED marker');
  assert.ok(!WF.includes('gsd-eval-auditor'), 'no gsd- token leaked');
  const lines = WF.split('\n').length;
  assert.ok(lines >= 100, `expected >=100 lines for rebranded body, got ${lines}`);
});

test('WF-EVAL-02: workflow produces EVAL-REVIEW.md with COVERED/PARTIAL/MISSING scoring', () => {
  assert.ok(WF.includes('EVAL-REVIEW.md'), 'output target named');
  assert.ok(WF.includes('COVERED'), 'COVERED scoring vocabulary');
  assert.ok(WF.includes('PARTIAL'), 'PARTIAL scoring vocabulary');
  assert.ok(WF.includes('MISSING'), 'MISSING scoring vocabulary');
  assert.ok(WF.includes('AI-SPEC.md'), 'State A/B trigger (AI-SPEC.md presence) referenced');
});

test('Plan-02-01 regression guard 1: no prose-embedded .planning/ in eval-review workflow', () => {
  const planningHits = WF.match(/\.planning\b/g) || [];
  assert.equal(planningHits.length, 0,
    `found .planning/ in workflow body: ${planningHits.length} hits`);
});

test('Plan-02-01 regression guard 2: every oto-sdk query call has 2>/dev/null or || fallback', () => {
  const lines = WF.split('\n');
  const sdkLinesWithoutFallback = lines.filter((l) =>
    l.includes('oto-sdk query') && !/2>\/dev\/null/.test(l) && !/\|\|/.test(l)
  );
  assert.equal(sdkLinesWithoutFallback.length, 0,
    `found oto-sdk query call(s) without fallback:\n${sdkLinesWithoutFallback.join('\n')}`);
});

test('Plan-02-01 regression guard 3: auditor dispatch uses orchestrator-persistence (Phase 1 D-04)', () => {
  const lines = WF.split('\n');
  let foundReshape = false;
  lines.forEach((line, idx) => {
    if (line.includes('oto-eval-auditor')) {
      const start = Math.max(0, idx - 10);
      const end = Math.min(lines.length, idx + 20);
      const window = lines.slice(start, end).join('\n');
      if (/orchestrator/i.test(window)) foundReshape = true;
    }
  });
  assert.ok(foundReshape,
    'audit step must contain orchestrator wording near an oto-eval-auditor reference');
});

test('W3 ABSENCE regression-guard: upstream auditor-writes-directly phrasing is GONE (REPLACE semantics from Plan 02-01 Task 2 Part C)', () => {
  const forbiddenFragments = [
    /auditor writes EVAL-REVIEW/i,
    /the auditor writes/i,
    /auditor persists EVAL-REVIEW/i,
    /agent writes EVAL-REVIEW/i,
    /agent persists EVAL-REVIEW/i,
  ];
  for (const re of forbiddenFragments) {
    assert.ok(!re.test(WF),
      `forbidden upstream auditor-writes-directly phrasing found in workflow body (matches /${re.source}/${re.flags})`);
  }
});

test('CMD-02 sanity: command file has no deferral framing', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'oto/commands/oto/eval-review.md'), 'utf8');
  assert.ok(!/intentionally non-executable/i.test(cmd));
  assert.ok(!/\bdeferred\b/i.test(cmd));
});
