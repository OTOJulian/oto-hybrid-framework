---
phase: 09-upstream-sync-pipeline
plan: 04
subsystem: tooling
tags: [conflict-acceptance, path-safety, upstream-sync]
requires:
  - phase: 09-upstream-sync-pipeline
    provides: 09-03 YAML header helper and conflict sidecar contract
provides:
  - `acceptConflict`, `acceptDeletion`, and `keepDeleted` helpers
  - Start-of-line marker refusal for unresolved merge conflicts
  - Path traversal guard shared by accept operations
affects: [phase-09, sync-cli]
tech-stack:
  added: []
  patterns: [fixed-shape YAML stripping, start-of-line marker validation, path-safe accept helpers]
key-files:
  created:
    - bin/lib/sync-accept.cjs
  modified:
    - tests/phase-09-accept-helper.test.cjs
key-decisions:
  - "Accept writes strip a leading `oto/` segment when the configured output root is already the `oto/` directory."
patterns-established:
  - "Conflict acceptance refuses atomically: sidecars remain and oto output is not written when markers remain."
requirements-completed: [SYN-04, SYN-07]
duration: 15min
completed: 2026-05-04
---

# Phase 09 Plan 04 Summary

**Conflict acceptance helpers now validate resolved sidecars, accept upstream deletions, record kept deletions, and reject unsafe paths before writing.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-04T18:48:00Z
- **Completed:** 2026-05-04T19:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented `bin/lib/sync-accept.cjs` with six exports: `acceptConflict`, `acceptDeletion`, `keepDeleted`, `stripYamlHeader`, `refuseIfMarkersRemain`, and `assertSafeAcceptPath`.
- Replaced accept-helper TODOs with six real tests covering happy path, marker refusal, deletion acceptance, kept deletion, path traversal, and inline marker tolerance.
- Verified marker detection is start-of-line anchored, so upstream prose containing `<<<<<<<` mid-line does not block acceptance.

## Task Commits

1. **Task 1: Implement sync accept helpers** - `546ce3b`
2. **Task 2: Fill accept-helper tests** - `fe877ea`

## Files Created/Modified

- `bin/lib/sync-accept.cjs` - User-facing helpers for resolved conflict/deletion sidecars.
- `tests/phase-09-accept-helper.test.cjs` - Real assertions for D-15, T-09-04, and T-09-06 behavior.

## Decisions Made

- Mirrored the `oto/` root path correction from 09-03 so `oto sync --accept oto/workflows/x.md` writes to `oto/workflows/x.md`, not `oto/oto/workflows/x.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Prevented `oto/oto/...` writes in accept helpers**
- **Found during:** Task 1 (accept target path handling)
- **Issue:** The plan's `otoDir + relPath` pattern would duplicate the `oto/` path segment for real CLI usage.
- **Fix:** Added `stripOtoPrefixForOtoRoot()` before resolving targets under an output root named `oto`.
- **Files modified:** `bin/lib/sync-accept.cjs`
- **Verification:** Accept-helper tests write to `oto/workflows/...` under an `otoDir` named `oto`.
- **Committed in:** `546ce3b`

---

**Total deviations:** 1 auto-fixed (Rule 2).
**Impact on plan:** Corrects path handling while preserving sidecar naming and user-facing path shape.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- Module smoke command for six exports, YAML stripping, marker refusal, inline marker tolerance, and traversal rejection passed.
- `node --test --test-concurrency=4 tests/phase-09-accept-helper.test.cjs` passed: 6 pass, 0 fail.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed: 32 pass, 12 todo, 0 fail.

## Next Phase Readiness

Plan 09-06 can dispatch `oto sync --accept`, `--accept-deletion`, and `--keep-deleted` directly to this module.

## Self-Check: PASSED

All 09-04 acceptance checks were run, and unrelated dirty files were not staged or committed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
