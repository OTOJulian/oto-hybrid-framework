---
phase: 16-agent-guidance-hardening
plan: 09
subsystem: upstream-sync
tags: [upstream-sync, conflict-artifacts, provenance, deletion-acceptance]

requires:
  - phase: 16-agent-guidance-hardening
    provides: Plan 16-07 namespaced conflict sidecars and deletion acceptance CLI
provides:
  - Provenance-safe deletion acceptance matched by target path and upstream
  - Validated legacy-flat sidecar fallback with fail-loud duplicate handling
  - CLI regressions for explicit, auto-detected, ambiguous, and keep-deleted flows
affects: [phase-16-verification, HARD-05, milestone-close]

tech-stack:
  added: []
  patterns: [identity-carrying resolution, both-field inventory matching, fail-before-mutation]

key-files:
  created: []
  modified:
    - bin/lib/sync-cli.cjs
    - bin/lib/sync-accept.cjs
    - tests/16-07-sync-all-provenance.test.cjs
    - docs/upstream-sync.md

key-decisions:
  - "Namespaced deletion acceptance carries the resolver-selected upstream into the inventory mutation."
  - "Legacy flat sidecars use only an exact gsd or superpowers header, otherwise duplicate rows fail loud instead of guessing."

patterns-established:
  - "Selected provenance remains explicit from sidecar resolution through inventory mutation."
  - "Ambiguity errors occur before inventory writes or target and sidecar unlinks."

requirements-completed: [HARD-05]

duration: 7 min
completed: 2026-07-18
---

# Phase 16 Plan 09: Deletion-Acceptance Provenance Closure Summary

**Deletion acceptance now preserves the selected upstream end-to-end, updates only the matching inventory row, and refuses ambiguous legacy provenance before mutation.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-18T13:34:17Z
- **Completed:** 2026-07-18T13:41:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Reproduced WR-01 with real CLI fixtures ordered GSD first, then proved explicit and auto-detected Superpowers deletion acceptance select only the Superpowers row.
- Preserved upstream identity through all accept resolution call sites and added validated legacy-flat header handling with a unique-row compatibility fallback.
- Locked ambiguity refusal, namespaced `--keep-deleted`, legacy-flat header selection, and headerless duplicate refusal in automated regressions.
- Documented the path-plus-upstream inventory contract and path-level divergence behavior.

## TDD Gate Evidence

- **RED:** `node --test tests/16-07-sync-all-provenance.test.cjs` produced 4 expected failures: explicit, auto-detected, and legacy-header fixtures mutated `gsd` instead of `superpowers`; the headerless duplicate fixture exited 0 instead of refusing.
- **GREEN:** The three-file targeted suite passed 25/25 after the minimal resolver and inventory-match changes.
- **REFACTOR:** No separate refactor was needed; the implementation follows the plan's bounded logic directly.

## Task Commits

1. **Task 1 RED: deletion-acceptance provenance regressions** - `45c485c` (test)
2. **Task 1 GREEN: both-field deletion acceptance** - `5914718` (fix)
3. **Task 2: document deletion-acceptance provenance** - `88f2f56` (docs)

## Files Created/Modified

- `tests/16-07-sync-all-provenance.test.cjs` - Adds seven CLI-level deletion provenance regressions and fixture helpers.
- `bin/lib/sync-cli.cjs` - Returns both conflict directory and upstream identity from accept resolution.
- `bin/lib/sync-accept.cjs` - Matches inventory rows by target path and upstream with validated legacy fallback.
- `docs/upstream-sync.md` - Documents the both-field rule, legacy refusal policy, and keep-deleted behavior.

## Verification

- Targeted compatibility suite: 25 passed, 0 failed.
- Focused eight-file sync sweep: 43 passed, 0 failed, 1 expected corpus skip.
- Repo-root `node bin/install.js sync --status`: exited 0 and printed `pending conflicts: M=0 A=0 D=0`.
- Full `npm test`: 976 passed, 1 failed, 3 skipped; the sole failure was sandbox DNS `ENOTFOUND registry.npmjs.org` in install-smoke.
- Network-enabled install-smoke rerun: 1 passed, 0 failed.
- `tests/phase-09-accept-helper.test.cjs` remained byte-identical at SHA-256 `ce4c017d0929ad14f93f206363c9967fb0fef40de7e2b59078ab60a5d106abda`.

## Decisions Made

- Namespaced sidecars use the upstream already validated by CLI parsing and selected by namespace resolution.
- Legacy flat sidecars may select duplicate inventory provenance only from an exact `upstream: gsd` or `upstream: superpowers` header; otherwise duplicate rows are rejected before mutation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The sandboxed full suite could not resolve `registry.npmjs.org` for the install-smoke dependency fetch. The network-enabled isolated rerun passed, confirming the known environment-only baseline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HARD-05's bounded WR-01 implementation gap is closed and ready for the prescribed limited re-review and independent re-verification.
- WR-02 remains deferred and untouched, as required.

## Self-Check: PASSED

- All four declared implementation/test/doc files and this summary exist.
- RED, GREEN, and documentation commits are present in the required order.
- Summary requirement and evidence sections are complete.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-18*
