---
phase: 02-workflow-rebrand-ports-command-de-deferral
plan: 02
subsystem: testing
tags: [node-test, command-surface, deferral-guard, cmd-01, cmd-02, cmd-03]

requires:
  - phase: 1
    provides: Restored doc-intake and eval-review agents plus command surface context
provides:
  - Regression guard for CMD-01, CMD-02, and CMD-03 deferral-marker absence
affects: [workflow-rebrand-ports-command-de-deferral, command-index, oto-help]

tech-stack:
  added: []
  patterns: [node:test markdown contract assertions]

key-files:
  created:
    - tests/workflow-no-deferral-marker.test.cjs
  modified:
    - .planning/phases/02-workflow-rebrand-ports-command-de-deferral/02-02-SUMMARY.md

key-decisions:
  - "Treat CMD-01, CMD-02, and CMD-03 as assertion-only for this plan because the audited files were already clean."
  - "Keep help.md checks non-vacuous with global phrase/co-occurrence assertions plus conditional forward-compat row guards."

patterns-established:
  - "Command de-deferral contracts are locked by scoped markdown assertions instead of source markdown rewrites."

requirements-completed: [CMD-01, CMD-02, CMD-03]

duration: not captured
completed: 2026-05-18
---

# Phase 2 Plan 02-02 Summary

**Regression guard for `/oto-ingest-docs`, `/oto-eval-review`, INDEX.md, and help.md deferral-marker absence**

## Performance

- **Duration:** Not captured before the read-first gate
- **Started:** Not captured
- **Completed:** 2026-05-18T19:48:08Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `tests/workflow-no-deferral-marker.test.cjs` with five `node:test` cases covering CMD-01, CMD-02, CMD-03A, CMD-03B, and CMD-03C.
- Locked `/oto-ingest-docs` and `/oto-eval-review` command files against `deferred`, `DEFERRED`, and `intentionally non-executable` regressions.
- Locked `oto/commands/INDEX.md` scoped rows and `oto/workflows/help.md` against reintroduced `[deferred]` tags or v2-reactivation footnotes tied to the two scoped commands.

## Pre-Flight Audit

- `grep -ciE 'deferred|intentionally non-executable' oto/commands/oto/ingest-docs.md oto/commands/oto/eval-review.md`
  - `oto/commands/oto/ingest-docs.md:0`
  - `oto/commands/oto/eval-review.md:0`
- `grep -n '/oto-ingest-docs\|/oto-eval-review' oto/commands/INDEX.md oto/workflows/help.md | grep -i 'deferred\|\[deferred\]'`
  - No output.
- `grep -c -i 'intentionally non-executable' oto/workflows/help.md`
  - `0`
- Broad audit of listing files still showed only the research-known unrelated hits:
  - `oto/commands/INDEX.md:11` for `/oto-ai-integration-phase`
  - `oto/workflows/help.md:428` for `/oto-plant-seed`

## Test Map

- `CMD-01: oto/commands/oto/ingest-docs.md has no deferral framing` -> CMD-01
- `CMD-02: oto/commands/oto/eval-review.md has no deferral framing` -> CMD-02
- `CMD-03A: oto/commands/INDEX.md rows for the two commands have no [deferred] tag` -> CMD-03
- `CMD-03B: oto/workflows/help.md has no command-level deferral framing (global) and no [deferred] tag adjacent to either scoped command (forward-compat guard)` -> CMD-03
- `CMD-03C: oto/workflows/help.md has no v2-reactivation footnote co-occurring with either scoped command (global) or adjacent to a per-command row (forward-compat guard)` -> CMD-03

## W1 Fix Confirmation

- CMD-03B contains the required non-vacuous global assertion on `HELP_MD`: `!/intentionally non-executable/i.test(HELP_MD)`.
- CMD-03B includes a `DESIGN NOTE` documenting why help.md row checks are conditional and how the global assertion keeps the test non-vacuous.
- CMD-03C includes a `DESIGN NOTE` documenting the conditional row-window guard plus non-vacuous global co-occurrence checks around `reactivation criterion`.

## Verification

- `node --test tests/workflow-no-deferral-marker.test.cjs`
  - Result: PASS
  - Summary: `tests 5`, `pass 5`, `fail 0`
- Plan automated verification command:
  - `test -f tests/workflow-no-deferral-marker.test.cjs && [ $(wc -l < tests/workflow-no-deferral-marker.test.cjs) -gt 40 ] && grep -q "CMD-01" tests/workflow-no-deferral-marker.test.cjs && grep -q "CMD-02" tests/workflow-no-deferral-marker.test.cjs && grep -q "CMD-03A" tests/workflow-no-deferral-marker.test.cjs && grep -q "CMD-03B" tests/workflow-no-deferral-marker.test.cjs && grep -q "CMD-03C" tests/workflow-no-deferral-marker.test.cjs && grep -q "intentionally non-executable" tests/workflow-no-deferral-marker.test.cjs && grep -q "HELP_MD" tests/workflow-no-deferral-marker.test.cjs && grep -q "must not contain \"intentionally non-executable\" command-level deferral framing" tests/workflow-no-deferral-marker.test.cjs && grep -q "require('node:test')" tests/workflow-no-deferral-marker.test.cjs && node --test tests/workflow-no-deferral-marker.test.cjs 2>&1 | grep -q "fail 0\|fail: 0"`
  - Result: PASS
- Acceptance counts:
  - `wc -l tests/workflow-no-deferral-marker.test.cjs` -> `157`
  - `grep -c "test('CMD-01" tests/workflow-no-deferral-marker.test.cjs` -> `1`
  - `grep -c "test('CMD-02" tests/workflow-no-deferral-marker.test.cjs` -> `1`
  - `grep -c "test('CMD-03A" tests/workflow-no-deferral-marker.test.cjs` -> `1`
  - `grep -c "test('CMD-03B" tests/workflow-no-deferral-marker.test.cjs` -> `1`
  - `grep -c "test('CMD-03C" tests/workflow-no-deferral-marker.test.cjs` -> `1`
- `grep -q "intentionally non-executable" tests/workflow-no-deferral-marker.test.cjs && grep -q "must not contain \"intentionally non-executable\" command-level deferral framing" tests/workflow-no-deferral-marker.test.cjs && grep -q "DESIGN NOTE" tests/workflow-no-deferral-marker.test.cjs && grep -q "require('node:test')" tests/workflow-no-deferral-marker.test.cjs && grep -q "require('node:assert/strict')" tests/workflow-no-deferral-marker.test.cjs`
  - Result: PASS
- `git status --porcelain oto/commands oto/workflows/help.md`
  - Result: PASS, no output
- `npm test > /private/tmp/oto-phase-02-02-npm-test.log 2>&1`
  - Result: PASS
  - Summary from captured log: `tests 539`, `pass 538`, `fail 0`, `skipped 1`
- `npm test 2>&1 | tail -20`
  - Result: PASS
  - Tail summary: `tests 539`, `pass 538`, `fail 0`, `skipped 1`

## Files Created/Modified

- `tests/workflow-no-deferral-marker.test.cjs` - New regression guard for CMD-01, CMD-02, and CMD-03.
- `.planning/phases/02-workflow-rebrand-ports-command-de-deferral/02-02-SUMMARY.md` - This summary.

## Source-Tree Edits

No source-tree edits were made to:

- `oto/commands/oto/ingest-docs.md`
- `oto/commands/oto/eval-review.md`
- `oto/commands/INDEX.md`
- `oto/workflows/help.md`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The first `npm test 2>&1 | tail -20` run showed `fail 1` in the tail despite the scoped test passing. A fresh full-suite capture immediately afterward passed with `fail 0`, and a second exact `npm test 2>&1 | tail -20` rerun also passed with `fail 0`. No owned files required changes for this.

## User Setup Required

None.

## Next Phase Readiness

CMD-01, CMD-02, and CMD-03 are locked by an automated regression test. Plan 02-03 can rely on the command/listing deferral guard while it adds workflow-shape and fixture smoke coverage after 02-01 lands.

---
*Phase: 02-workflow-rebrand-ports-command-de-deferral*
*Completed: 2026-05-18*
