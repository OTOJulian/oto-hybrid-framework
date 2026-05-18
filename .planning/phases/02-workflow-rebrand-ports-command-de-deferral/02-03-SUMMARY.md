---
phase: 02-workflow-rebrand-ports-command-de-deferral
plan: 03
subsystem: testing
tags: [node-test, workflows, ingest-docs, eval-review, fixtures]
requires:
  - phase: 02-workflow-rebrand-ports-command-de-deferral
    provides: Plan 02-01 workflow bodies and Plan 02-02 command deferral guards
provides:
  - Workflow-shape regression tests for /oto-ingest-docs and /oto-eval-review
  - Fixture-tree smoke coverage for ingest-docs new, merge, blocker, and over-cap cases
  - Regression guards for Phase 2 engine blind spots and W3 replacement semantics
affects: [phase-02, phase-03, workflow-tests, ingest-docs, eval-review]
tech-stack:
  added: []
  patterns: [node:test workflow-shape assertions, tmpdir-generated over-cap fixture]
key-files:
  created:
    - tests/workflow-ingest-docs.test.cjs
    - tests/workflow-eval-review.test.cjs
    - tests/workflow-ingest-docs-fixture.test.cjs
    - tests/fixtures/ingest-docs/new-mode-mixed/
    - tests/fixtures/ingest-docs/merge-mode-existing/
    - tests/fixtures/ingest-docs/conflict-block/
  modified:
    - oto/workflows/eval-review.md
key-decisions:
  - "Over-cap fixture is generated in os.tmpdir() and cleaned up by t.after instead of committed."
  - "Workflow-shape tests assert prompt contracts rather than attempting to execute LLM workflows."
patterns-established:
  - "W3 absence guards forbid upstream agent-writes-directly phrasing after read-only-agent reshapes."
requirements-completed: [WF-ING-01, WF-ING-02, WF-ING-03, WF-ING-04, WF-EVAL-01, WF-EVAL-02]
completed: 2026-05-18
---

# Phase 2 Plan 02-03 Summary

**Workflow-shape and fixture-tree regression coverage now locks the restored ingest-docs and eval-review workflow contracts.**

## Fixture Trees

Task 1a seeded `tests/fixtures/ingest-docs/new-mode-mixed/`:
- `docs/adr/`: 3 ADRs
- `docs/prd/`: 3 PRDs
- `docs/specs/`: 2 SPECs
- `docs/rfc/`: 2 RFCs
- Total committed docs: 10

Task 1b seeded:
- `merge-mode-existing/.oto/`: 4 skeleton files (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`)
- `merge-mode-existing/docs/`: 3 new docs
- `conflict-block/docs/adr/`: 2 contradictory accepted ADRs, PostgreSQL vs MongoDB
- `conflict-block/docs/prd/`: 1 PRD

The 51-doc over-cap fixture is generated in `os.tmpdir()` during the test and removed with `t.after()`.

## Tests Added

- `tests/workflow-ingest-docs.test.cjs`: 11 tests covering WF-ING-01..04, Phase 1 agent references, no `.planning/` leak, SDK fallback, classifier orchestrator-persistence, W3 absence guard, security preservation, and CMD-01 sanity.
- `tests/workflow-eval-review.test.cjs`: 7 tests covering WF-EVAL-01..02, no `.planning/` leak, SDK fallback, auditor orchestrator-persistence, W3 absence guard, and CMD-02 sanity.
- `tests/workflow-ingest-docs-fixture.test.cjs`: 4 tests covering the three committed fixture trees plus tmpdir-generated over-cap fixture cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. Direct Phase 2 blocker: eval-review workflow lacked scoring vocabulary**
- Found during: Task 3 focused workflow-shape test.
- Issue: `oto/workflows/eval-review.md` referenced `EVAL-REVIEW.md` and AI-SPEC state handling, but the workflow body did not contain the required `COVERED` / `PARTIAL` / `MISSING` scoring vocabulary from WF-EVAL-02.
- Fix: Narrowly amended the `oto-eval-auditor` dispatch paragraph to require returned reviews to score each evaluation dimension as `COVERED`, `PARTIAL`, or `MISSING`.
- Files modified outside original write scope by explicit exception: `oto/workflows/eval-review.md`.
- Verification: `node --test tests/workflow-ingest-docs.test.cjs tests/workflow-eval-review.test.cjs` passed after the edit.

### Issues Encountered

- The Task 1b combined shell snippet used `grep -q '^---$\\|^#'`, which is not portable for `---` lines under this local grep. The fixture files kept the planned frontmatter format; equivalent explicit first-line checks passed.
- `npm test` rewrote `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md` as a generated test side effect. Those files are outside Plan 02-03 scope and were restored before commit.

**Total deviations:** 1 auto-fixed direct blocker.
**Impact:** The workflow edit is deliberately narrow and aligns the workflow body with WF-EVAL-02. No shared phase state files were modified.

## Verification

Focused workflow tests:

```text
node --test tests/workflow-ingest-docs.test.cjs tests/workflow-eval-review.test.cjs
tests: 18
pass: 18
fail: 0
```

Focused fixture test:

```text
node --test tests/workflow-ingest-docs-fixture.test.cjs
tests: 4
pass: 4
fail: 0
```

Combined focused rerun after report restoration:

```text
node --test tests/workflow-ingest-docs.test.cjs tests/workflow-eval-review.test.cjs tests/workflow-ingest-docs-fixture.test.cjs
tests: 22
pass: 22
fail: 0
```

Full relevant verification:

```text
npm test
tests: 562
pass: 561
fail: 0
skipped: 1
```

Tmpdir cleanup:

```text
test "$(ls $(node -e "console.log(require('os').tmpdir())") | grep -c '^oto-over-cap-')" = "0"
pass
```

Structural acceptance checks:
- Test file line counts: ingest workflow test 104 lines, eval workflow test 80 lines, fixture test 85 lines.
- W3 absence guard count: 1 in each workflow-shape test file.
- Required WF test declarations: exactly one each for WF-ING-01..04 and WF-EVAL-01..02.

## Regression Guards Now Locked

- Prose `.planning/` leaks in both workflow bodies.
- `oto-sdk query` calls without `2>/dev/null` or `||` fallback.
- Classifier/auditor read-only-agent reshape through orchestrator persistence.
- Pre-existing ingest-docs security checks: `*..*`, `realpath`, and `Exit WITHOUT`.
- W3 REPLACE semantics: upstream agent-writes-directly phrasing is forbidden in both workflow bodies.

## Next Phase Readiness

Plan 02-03 verification surface is in place for Phase 2. Phase 3 can port deeper runtime/fixture behavior tests without needing to recreate these prompt-shape and fixture-shape guards.

---
*Phase: 02-workflow-rebrand-ports-command-de-deferral*
*Completed: 2026-05-18*
