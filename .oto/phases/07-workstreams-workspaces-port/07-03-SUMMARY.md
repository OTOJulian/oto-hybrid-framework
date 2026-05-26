---
phase: 07-workstreams-workspaces-port
plan: 03
subsystem: testing
tags: [node-test, smoke, workstreams, workspaces]
requires:
  - phase: 07-workstreams-workspaces-port
    provides: Plans 01-02 verified runtime surface and skill deference directive
provides:
  - Phase 7 structure smoke coverage
  - Workspace init-handler JSON shape smoke coverage
affects: [phase-07, tests, workstreams, workspaces]
tech-stack:
  added: []
  patterns: [node-test-smoke, temp-home-fixture]
key-files:
  created:
    - tests/07-structure.test.cjs
    - tests/07-workspace-init.test.cjs
  modified: []
key-decisions:
  - "Workspace init smoke uses a temporary HOME so real `~/oto-workspaces` is untouched."
patterns-established:
  - "Phase 7 smoke tests keep assertions shallow and deterministic while delegating behavior depth to Plan 04."
requirements-completed: [WF-26, WF-27]
duration: 3 min
completed: 2026-05-02
---

# Phase 07 Plan 03: Smoke Test Summary

**Phase 7 smoke tests now verify scoped file structure, leak cleanliness, command frontmatter, workflow handler usage, and workspace init JSON shapes.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-02T00:28:17Z
- **Completed:** 2026-05-02T00:31:44Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- Added `tests/07-structure.test.cjs` with 9-file existence checks, leak-literal checks, command frontmatter parsing, workflow `oto-sdk query` assertions, and Plan 02 skill-directive coverage.
- Added `tests/07-workspace-init.test.cjs` with smoke coverage for `init new-workspace`, `init list-workspaces`, and `init remove-workspace` JSON shapes.
- Isolated workspace-init tests from the user's real home workspace directory by using temporary `HOME` directories.

## Task Commits

1. **Task 1: Write `tests/07-structure.test.cjs`** - `534b383` (test)
2. **Task 2: Write `tests/07-workspace-init.test.cjs`** - `304fcb1` (test)

## Files Created/Modified

- `tests/07-structure.test.cjs` - Phase 7 structure and directive smoke coverage.
- `tests/07-workspace-init.test.cjs` - Workspace init-handler JSON shape smoke coverage.

## Verification

- `node --test tests/07-structure.test.cjs` exited 0.
- `node --test tests/07-workspace-init.test.cjs` exited 0.
- `grep -E "t\.todo\(" tests/07-structure.test.cjs tests/07-workspace-init.test.cjs` returned no output.
- `wc -l` reported 84 lines for `07-structure.test.cjs` and 99 lines for `07-workspace-init.test.cjs`.
- All six D-08 `new-workspace` keys are asserted.

## Decisions Made

- Used a fake workspace under a temporary `HOME` for `init remove-workspace`, because the handler intentionally requires a named existing workspace.

## Deviations from Plan

The plan described `init remove-workspace` as a pure no-argument handler smoke, but the actual handler rejects missing workspace names. The test creates a temporary `HOME` with a minimal `oto-workspaces/remove-demo/WORKSPACE.md` manifest and calls `init remove-workspace remove-demo`, preserving the same JSON-shape assertion without touching user state.

**Total deviations:** 1 behavior-aligned test harness adjustment. **Impact:** Safer test isolation and no product code change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 04 can add the heavier fixture-backed behavior tests on top of the verified smoke surface.

---
*Phase: 07-workstreams-workspaces-port*
*Completed: 2026-05-02*
