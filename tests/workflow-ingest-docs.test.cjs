// tests/workflow-ingest-docs.test.cjs
// Workflow-shape assertions for oto/workflows/ingest-docs.md (Plan 02-03).
// Covers WF-ING-01..04 and locks Plan-02-01 hand-fixup regression guards:
// prose .planning/ cleanup, SDK fallback, classifier read-only-agent reshape,
// security-check preservation, and W3 replacement semantics.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WF = fs.readFileSync(path.join(ROOT, 'oto/workflows/ingest-docs.md'), 'utf8');

test('WF-ING-01: workflow body is the rebrand-ported executable (not deferral stub)', () => {
  assert.ok(WF.includes('<step name="banner">'), 'must have banner step');
  assert.ok(WF.includes('<step name="discover_docs">'), 'must have discovery step');
  assert.ok(WF.includes('<step name="classify_parallel">'), 'must have parallel classification step');
  assert.ok(WF.includes('<step name="synthesize">'), 'must have synthesize step');
  assert.ok(WF.includes('<step name="conflict_gate">'), 'must have conflict gate step');
  assert.ok(!/intentionally non-executable/i.test(WF), 'no deferral framing');
  assert.ok(!/DEFERRED/.test(WF), 'no DEFERRED marker');
  assert.ok(!WF.includes('gsd-doc-classifier'), 'no gsd-doc-classifier token leaked');
  assert.ok(!WF.includes('gsd-doc-synthesizer'), 'no gsd-doc-synthesizer token leaked');
});

test('WF-ING-02: discovery covers directory conventions + --manifest', () => {
  assert.ok(/docs\/adr\/|\/adr\/|\*\/adr\/\*/.test(WF), 'must cover ADR directory convention');
  assert.ok(/docs\/prd\/|\/prd\/|\*\/prd\/\*/.test(WF), 'must cover PRD directory convention');
  assert.ok(/docs\/specs\/|\/specs\/|\*\/specs\/\*/.test(WF), 'must cover specs directory convention');
  assert.ok(/docs\/rfc\/|\/rfc\/|\*\/rfc\/\*/.test(WF), 'must cover RFC directory convention');
  assert.match(WF, /--manifest/, 'must support --manifest flag');
});

test('WF-ING-03: --mode new and --mode merge both present with auto-detect', () => {
  assert.match(WF, /--mode\s+(new\|merge|new)/, 'must support --mode new');
  assert.match(WF, /--mode\s+(new\|merge|merge)/, 'must support --mode merge');
  assert.ok(WF.includes('<step name="route_new_mode">'), 'must have route_new_mode step');
  assert.ok(WF.includes('<step name="route_merge_mode">'), 'must have route_merge_mode step');
});

test('WF-ING-04: 50-doc cap and BLOCKER gate are wired', () => {
  assert.ok(WF.includes('50'), 'cap value 50 referenced');
  assert.ok(/exceeds the v1 cap of 50/i.test(WF), 'cap text present');
  assert.ok(WF.includes('BLOCKERS'), 'BLOCKER gate present');
  assert.ok(WF.includes('Exit WITHOUT'), 'gate exits without writing on blocker');
});

test('Phase 1 agents are referenced by oto- names', () => {
  assert.ok(WF.includes('oto-doc-classifier'), 'classifier referenced');
  assert.ok(WF.includes('oto-doc-synthesizer'), 'synthesizer referenced');
  assert.ok(WF.includes('oto-roadmapper'), 'roadmapper referenced for new-mode bootstrap');
});

test('Plan-02-01 regression guard 1: no prose-embedded .planning/ leaked from rebrand', () => {
  const planningHits = WF.match(/\.planning\b/g) || [];
  assert.equal(planningHits.length, 0,
    `found .planning/ in workflow body: ${planningHits.length} hits - Plan 02-01 hand-fixup pass 1 incomplete`);
});

test('Plan-02-01 regression guard 2: every oto-sdk query call has 2>/dev/null or || fallback', () => {
  const lines = WF.split('\n');
  const sdkLinesWithoutFallback = lines.filter((l) =>
    l.includes('oto-sdk query') && !/2>\/dev\/null/.test(l) && !/\|\|/.test(l)
  );
  assert.equal(sdkLinesWithoutFallback.length, 0,
    `found oto-sdk query call(s) without fallback:\n${sdkLinesWithoutFallback.join('\n')}`);
});

test('Plan-02-01 regression guard 3: classify_parallel step uses orchestrator-persistence (Phase 1 D-04)', () => {
  const match = WF.match(/<step name="classify_parallel">[\s\S]*?<\/step>/);
  assert.ok(match, 'classify_parallel step block must be findable');
  const block = match[0];
  assert.ok(/orchestrator/i.test(block),
    'classify_parallel block must contain orchestrator wording');
});

test('W3 ABSENCE regression-guard: upstream agent-writes-directly phrasing is GONE (REPLACE semantics from Plan 02-01 Task 2 Part C)', () => {
  const forbiddenFragments = [
    /agent writes the classification/i,
    /agent persists the classification/i,
    /agent persists the JSON/i,
    /the classifier writes/i,
    /classifier writes the JSON/i,
    /classifier writes\s+to\s+OUTPUT_DIR/i,
  ];
  for (const re of forbiddenFragments) {
    assert.ok(!re.test(WF),
      `forbidden upstream agent-writes-directly phrasing found in workflow body (matches /${re.source}/${re.flags})`);
  }
});

test('Pre-existing security checks survived rebrand+fixup', () => {
  assert.match(WF, /\*\.\.\*/, 'path-traversal *..* rejection preserved');
  assert.ok(WF.includes('realpath'), 'realpath containment preserved');
  assert.ok(WF.includes('Exit WITHOUT'), 'BLOCKER-gate exit clause preserved');
});

test('CMD-01 sanity: command file has no deferral framing (also asserted in workflow-no-deferral-marker.test.cjs)', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'oto/commands/oto/ingest-docs.md'), 'utf8');
  assert.ok(!/intentionally non-executable/i.test(cmd));
  assert.ok(!/\bdeferred\b/i.test(cmd));
});
