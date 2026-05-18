// tests/workflow-no-deferral-marker.test.cjs
// Locks CMD-01, CMD-02, CMD-03 from .planning/REQUIREMENTS.md (v0.3.0).
// Phase 2 made no source-tree edits to these files — they were already clean per
// .planning/phases/02-workflow-rebrand-ports-command-de-deferral/02-RESEARCH.md.
// This test fails if any future change reintroduces a deferral marker for either command.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const INGEST_CMD = fs.readFileSync(path.join(ROOT, 'oto/commands/oto/ingest-docs.md'), 'utf8');
const EVAL_CMD = fs.readFileSync(path.join(ROOT, 'oto/commands/oto/eval-review.md'), 'utf8');
const INDEX_MD = fs.readFileSync(path.join(ROOT, 'oto/commands/INDEX.md'), 'utf8');
const HELP_MD = fs.readFileSync(path.join(ROOT, 'oto/workflows/help.md'), 'utf8');

// ---- CMD-01: /oto-ingest-docs command file has no deferral framing ----

test('CMD-01: oto/commands/oto/ingest-docs.md has no deferral framing', () => {
  assert.ok(
    !/intentionally non-executable/i.test(INGEST_CMD),
    'ingest-docs.md must not contain "intentionally non-executable" refusal'
  );
  assert.ok(
    !/\bdeferred\b/i.test(INGEST_CMD),
    'ingest-docs.md must not contain the word "deferred"'
  );
  assert.ok(
    !/DEFERRED/.test(INGEST_CMD),
    'ingest-docs.md must not contain the uppercase DEFERRED marker'
  );
});

// ---- CMD-02: /oto-eval-review command file has no deferral framing ----

test('CMD-02: oto/commands/oto/eval-review.md has no deferral framing', () => {
  assert.ok(
    !/intentionally non-executable/i.test(EVAL_CMD),
    'eval-review.md must not contain "intentionally non-executable" refusal'
  );
  assert.ok(
    !/\bdeferred\b/i.test(EVAL_CMD),
    'eval-review.md must not contain the word "deferred"'
  );
  assert.ok(
    !/DEFERRED/.test(EVAL_CMD),
    'eval-review.md must not contain the uppercase DEFERRED marker'
  );
});

// ---- CMD-03 part A: INDEX.md rows for /oto-ingest-docs and /oto-eval-review have no [deferred] tag ----

test('CMD-03A: oto/commands/INDEX.md rows for the two commands have no [deferred] tag', () => {
  const lines = INDEX_MD.split('\n');
  const scoped = lines.filter(
    (l) => l.includes('/oto-ingest-docs') || l.includes('/oto-eval-review')
  );
  assert.ok(
    scoped.length >= 2,
    `expected at least 2 INDEX.md rows mentioning /oto-ingest-docs or /oto-eval-review, got ${scoped.length}`
  );
  for (const line of scoped) {
    assert.ok(
      !/\[deferred\]/i.test(line),
      `INDEX.md row must not contain [deferred] tag: ${line}`
    );
  }
});

// ---- CMD-03 part B: help.md has no command-level deferral framing (global, non-vacuous) ----
// ---- and no [deferred] tag adjacent to either scoped command (forward-compat guard).  ----
//
// DESIGN NOTE: help.md by design lists no per-command rows for /oto-ingest-docs
// or /oto-eval-review (research-confirmed during Phase 2 audit). The line-iterator
// assertions below are conditional and would only fire if either command is ever
// added as a help.md row in a future commit. To make THIS test non-vacuous today,
// we ALSO assert globally on help.md content that the upstream
// "intentionally non-executable" command-level deferral framing never reappears
// anywhere in help.md, regardless of which commands are currently listed.

test('CMD-03B: oto/workflows/help.md has no command-level deferral framing (global) and no [deferred] tag adjacent to either scoped command (forward-compat guard)', () => {
  // Non-vacuous global assertion — fires regardless of whether the two commands
  // are listed in help.md. Locks help.md against regaining upstream deferral framing.
  assert.ok(
    !/intentionally non-executable/i.test(HELP_MD),
    'help.md must not contain "intentionally non-executable" command-level deferral framing'
  );

  // Forward-compatibility guard: if either scoped command is ever added as a
  // help.md row, fail on adjacent [deferred] tags. Today this loop body does not
  // execute because help.md has no /oto-ingest-docs or /oto-eval-review rows.
  const lines = HELP_MD.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('/oto-ingest-docs') || line.includes('/oto-eval-review')) {
      // Same line check
      assert.ok(
        !/\[deferred\]/i.test(line),
        `help.md line ${idx + 1} mentions a scoped command and contains [deferred]: ${line}`
      );
      // Window check: 5 lines before / 5 after must not contain [deferred] tag
      const start = Math.max(0, idx - 5);
      const end = Math.min(lines.length, idx + 6);
      const window = lines.slice(start, end).join('\n');
      assert.ok(
        !/\[deferred\]/i.test(window),
        `help.md lines ${start + 1}-${end} include a scoped command mention and a [deferred] tag within 5 lines`
      );
    }
  });
});

// ---- CMD-03 part C: help.md has no v2-reactivation footnote tied to either command ----
//
// DESIGN NOTE: same as CMD-03B — the per-command line-iterator block below is
// conditional and acts as a forward-compatibility guard. A non-vacuous global
// assertion (string-co-occurrence within 500 chars) guards against a
// "reactivation criterion" footnote getting tied to either scoped command's
// framing anywhere in help.md, regardless of whether the commands are listed
// line-by-line. We deliberately allow "reactivation criterion" to appear in
// help.md for unrelated commands (e.g., /oto-plant-seed line 428) — the
// co-occurrence check only fires when paired with /oto-ingest-docs or
// /oto-eval-review in the same 500-char window.

test('CMD-03C: oto/workflows/help.md has no v2-reactivation footnote co-occurring with either scoped command (global) or adjacent to a per-command row (forward-compat guard)', () => {
  // Non-vacuous global co-occurrence assertion: no "reactivation criterion"
  // footnote should appear within 500 chars of either scoped command mention.
  assert.ok(
    !/(oto-ingest-docs|oto-eval-review)[\s\S]{0,500}reactivation criterion/i.test(HELP_MD),
    'help.md must not contain a "reactivation criterion" footnote within 500 chars after an ingest-docs/eval-review mention'
  );
  assert.ok(
    !/reactivation criterion[\s\S]{0,500}(oto-ingest-docs|oto-eval-review)/i.test(HELP_MD),
    'help.md must not contain a "reactivation criterion" footnote within 500 chars before an ingest-docs/eval-review mention'
  );

  // Forward-compatibility guard, line-window scoped. Conditional — fires only
  // if either scoped command is ever added as a help.md row.
  const lines = HELP_MD.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('/oto-ingest-docs') || line.includes('/oto-eval-review')) {
      const start = Math.max(0, idx - 5);
      const end = Math.min(lines.length, idx + 11);
      const window = lines.slice(start, end).join('\n');
      assert.ok(
        !/reactivation criterion/i.test(window),
        `help.md lines ${start + 1}-${end} mention a scoped command and contain a "reactivation criterion" footnote`
      );
      assert.ok(
        !/\bv2\s+reactivation\b/i.test(window),
        `help.md lines ${start + 1}-${end} mention a scoped command and contain a "v2 reactivation" footnote`
      );
    }
  });
});
