---
phase: 16-agent-guidance-hardening
plan: 07
subsystem: upstream-sync
tags: [upstream-sync, conflict-artifacts, provenance, node-test]

requires:
  - phase: 16-agent-guidance-hardening
    provides: "Fail-loud two-leg --upstream all execution and HARD-05 verification evidence"
provides:
  - "Per-upstream conflict sidecars and reports under .oto-sync-conflicts/<upstream>/"
  - "Provenance-safe status aggregation and accept-mode namespace resolution"
  - "End-to-end regression coverage for overlapping all-upstream conflicts"
affects: [HARD-05, upstream-sync, milestone-close-verification]

tech-stack:
  added: []
  patterns:
    - "Validate upstream names before joining them into filesystem paths"
    - "Auto-detect one provenance namespace and fail loud on ambiguous records"

key-files:
  created:
    - tests/16-07-sync-all-provenance.test.cjs
  modified:
    - scripts/sync-upstream/merge.cjs
    - bin/lib/sync-cli.cjs
    - tests/phase-09-cli.integration.test.cjs
    - docs/upstream-sync.md

key-decisions:
  - "Namespace durable conflict artifacts at the merge-stage boundary, leaving sync-merge and sync-accept helpers unchanged."
  - "Preserve legacy flat accept fallback while requiring explicit upstream disambiguation when both namespaces contain a record."

patterns-established:
  - "Conflict provenance: sidecars and REPORT.md live beneath .oto-sync-conflicts/<upstream>/."
  - "Accept safety: validate the relative path before probing either namespace."

requirements-completed: [HARD-05]

duration: 11 min
completed: 2026-07-18
---

# Phase 16 Plan 07: Provenance-Safe All-Upstream Sync Summary

**Per-upstream conflict namespaces preserve both GSD and Superpowers evidence while status and accept commands resolve provenance safely.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-17T23:50:32Z
- **Completed:** 2026-07-18T00:01:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Moved every merge sidecar and report into `.oto-sync-conflicts/<upstream>/`, preventing the Superpowers leg from overwriting GSD evidence during `--upstream all`.
- Made `--status` aggregate namespaced and legacy records without counting `REPORT.md`, with additional per-upstream breakdown lines.
- Made all three accept modes auto-detect unambiguous provenance, reject dual-upstream ambiguity, accept explicit `--upstream gsd|superpowers`, and retain legacy flat-layout fallback.
- Added an end-to-end two-upstream fixture proving both overlapping sidecars and both reports survive on disk.

## Task Commits

TDD gates were committed in order:

1. **Task 1 RED: all-upstream provenance regression** - `e0e1b61` (test)
2. **Task 1 GREEN: per-upstream conflict artifacts** - `251bfa1` (feat)
3. **Task 2 RED: provenance-safe status and accept regressions** - `fb80cc6` (test)
4. **Task 2 GREEN: namespace-aware status and accept behavior** - `02d1ef2` (feat)
5. **REFACTOR: precise acceptance-fixture literals** - `61a142b` (refactor)

## Files Created/Modified

- `tests/16-07-sync-all-provenance.test.cjs` - Exercises the real all-upstream CLI and namespace-aware accept behavior.
- `scripts/sync-upstream/merge.cjs` - Validates the upstream and routes merge outputs into its namespace.
- `bin/lib/sync-cli.cjs` - Counts namespaced status, resolves accept provenance, and rejects ambiguous records.
- `tests/phase-09-cli.integration.test.cjs` - Updates report paths and verifies aggregate/per-upstream status counts.
- `docs/upstream-sync.md` - Documents namespaced sidecars, reports, auto-detection, and disambiguation.

## Verification

- `node --test tests/16-07-sync-all-provenance.test.cjs` - 4 passed, 0 failed.
- Focused Phase 9/10 sync suite from the plan - 36 passed, 0 failed, 1 skipped because `OTO_SYNC_CORPUS` was not set.
- `node bin/install.js sync --status` - exited 0 and printed `pending conflicts: M=0 A=0 D=0` at the repo root.
- `npm test` - no Plan 07 regression: the eight approved WR-02 SDK/planning-root failures remained, plus one sandbox-only `ENOTFOUND registry.npmjs.org` install-smoke failure.
- Network-enabled `node --test tests/phase-04-mr01-install-smoke.test.cjs` - 1 passed, 0 failed.
- Scope audit - exactly the five declared plan files changed; no `sdk/`, baseline, golden row, STATE, ROADMAP, or REQUIREMENTS file changed.

## Decisions Made

- Kept namespacing at the stage/CLI boundary so existing merge and accept helper contracts remain stable.
- Used fail-loud ambiguity instead of choosing an upstream implicitly when both have the same pending target.
- Kept zero-hit resolution pointed at the flat root so existing sidecars and missing-sidecar errors retain their behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The resolved-sidecar test fixture initially inserted one extra blank line after its YAML header. The fixture was corrected during GREEN to match `emitYamlHeader`; production behavior was unchanged.
- The sandboxed full suite could not resolve the npm registry for install-smoke. The required network-enabled single-suite rerun passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HARD-05 has automated durable-evidence coverage ready for independent re-verification.
- Ready for Plan 16-08; the approved WR-02 planning-root migration remains explicitly out of scope.

## Self-Check: PASSED

- Created test and summary files exist on disk.
- All five TDD commits exist in RED-before-GREEN order.
- Task acceptance criteria and plan-level verification commands pass relative to the approved baseline.
- Scope contains only the five declared plan files plus this summary.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-18*
