---
phase: 14-key-storage-reconciliation
plan: 18
subsystem: security
tags: [config-locking, migration, concurrency, node-test, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    provides: keyfile hardening, fail-closed config mutation, and provenance-aware migration from plans 14-13 through 14-16
provides:
  - Same-lock CJS migration and integration mutation transactions
  - Skip-on-contention CJS read migration with sensitive-read withholding
  - Self-locking SDK migration with an already-locked transaction join
  - Real-process and mocked-lock regressions for interleaving, ordering, and cleanup
affects: [14-19-terminal-verification, phase-14-verification, config-mutation, secret-status]

tech-stack:
  added: []
  patterns: [same-lock read-modify-write, self-locking migration, already-locked transaction join, skip-on-contention reads]

key-files:
  created:
    - tests/14-migration-lock.test.cjs
    - sdk/src/query/migration-lock.test.ts
  modified:
    - oto/bin/lib/secrets.cjs
    - oto/bin/lib/config.cjs
    - sdk/src/query/secrets.ts
    - sdk/src/query/config-mutation.ts

key-decisions:
  - "CJS read-triggered migration waits up to two seconds for the shared planning-directory lock, then skips without writing; sensitive config-get withholds while unrelated reads fail open."
  - "Integration config-set joins migration and mutation inside one existing writer lock in both layers, using alreadyLocked to prevent nested acquisition."
  - "The SDK's pre-existing approximately two-second force-acquire behavior remains accepted and unchanged; this plan removes the unbounded unlocked window without modifying lock internals."

patterns-established:
  - "Migration helpers self-lock by default and accept an explicit already-locked opt-out only for callers that own the matching writer lock."
  - "Contention tests prove observable ordering and survivor state, not only a successful final mutation."

requirements-completed: [SECR-03, SECR-04]

duration: 8 min
completed: 2026-07-13
---

# Phase 14 Plan 18: Concurrent Migration Locking Summary

**CJS and SDK legacy-key migration now shares each layer's config-writer lock, making integration migration plus mutation one transaction and preventing read-triggered stale writes from clobbering concurrent updates.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-13T01:28:59Z
- **Completed:** 2026-07-13T01:36:56Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a CJS config-directory lock using the same `<planning-dir>/.lock` identity as `withPlanningLock`, with 30-second stale eviction, exit/finally cleanup, and two-second skip semantics for best-effort migration reads.
- Moved CJS and SDK integration migration inside each mutator's existing lock region, with `alreadyLocked` preventing self-deadlock or double-acquisition.
- Pinned the reviewer's while-locked clobber reproduction, a child-process interleave, sensitive-versus-unrelated read behavior, SDK acquisition ordering, and leak-free throw/rejection paths.

## TDD Gate Evidence

- **Task 1 RED:** `tests/14-migration-lock.test.cjs` ran 6 tests; L1, L3, L4, and L6 failed on the intended unlocked-migration and contention defects while L2/L5 controls passed.
- **Task 1 GREEN:** all 6 new CJS tests passed; the 33-test migration/config/keyfile compatibility gate also passed.
- **Task 2 RED:** `sdk/src/query/migration-lock.test.ts` ran 4 tests; S2 observed zero standalone acquisitions and S3 observed migration before acquisition, while S1/S4 controls passed.
- **Task 2 GREEN:** all 4 new SDK tests passed; the task verification set passed 91/91, the prior-wave compatibility set passed 117/117, and TypeScript checking passed.

## Task Commits

Each TDD task was committed as a RED test commit followed by a GREEN implementation commit:

1. **Task 1 RED: CJS migration-lock regressions** - `d279fac` (test)
2. **Task 1 GREEN: CJS shared-lock migration transaction** - `51d38ab` (feat)
3. **Task 2 RED: SDK migration-lock regressions** - `d6521e6` (test)
4. **Task 2 GREEN: SDK self-locking migration transaction** - `c2b6fde` (feat)

## Files Created/Modified

- `tests/14-migration-lock.test.cjs` - Covers fresh/stale locks, interleaving, transaction end state, sensitive reads, and cleanup.
- `oto/bin/lib/secrets.cjs` - Adds `withConfigDirLock` and makes legacy migration self-locking with skip-on-timeout behavior.
- `oto/bin/lib/config.cjs` - Splits the in-lock setter body and joins integration migration plus mutation in one planning-lock callback.
- `sdk/src/query/migration-lock.test.ts` - Observes real SDK lock acquisition/release and pre-acquisition state through a partial module mock.
- `sdk/src/query/secrets.ts` - Self-locks standalone migration and exposes the `alreadyLocked` join option.
- `sdk/src/query/config-mutation.ts` - Relocates integration migration to the first operation inside `configSet`'s acquired lock.

## Decisions Made

- Used the existing writer lock identities exactly: `.oto/.lock` (or the active workstream directory's `.lock`) for CJS and `config.json.lock` for SDK.
- Kept CJS best-effort reads bounded: after two seconds of live contention, migration returns `{ migrated: [], skipped: true }`, preserving externally owned lock and config bytes.
- Preserved the accepted SDK lock semantics: `acquireStateLock` can force-acquire after roughly two seconds. This plan documents that residual window and does not alter the shared lock implementation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git index writes for the isolated worktree required sandbox escalation because the worktree administration directory lives under the main repository's `.git/worktrees` path. All required `--no-verify` commits completed normally.

## User Setup Required

None - no external service configuration required.

## Verification

- Plan-level CJS gate: `node --test tests/14-migration-lock.test.cjs tests/14-migration-hardening.test.cjs tests/14-configget-guard.test.cjs` passed **20/20**.
- Task 1 compatibility gate: four existing CJS suites passed **33/33**.
- Plan-level SDK gate: migration-lock, config-mutation, and fail-closed suites passed **77/77**.
- Task 2 compatibility gate: five prior-wave SDK suites passed **117/117**.
- `cd sdk && npx tsc --noEmit` exited 0.
- Structural checks confirmed both CJS operations occur inside one `withPlanningLock` callback, SDK `alreadyLocked: true` occurs after acquisition, and all required symbol counts/minimum test-file lengths pass.
- No files under `sdk/dist` changed.

## Next Phase Readiness

- WR-01 is closed at source and regression level in both CJS and SDK layers.
- Plan 14-19 can perform the single owned `sdk/dist` rebuild and run the terminal bounded-convergence verification/review gates.
- Phase 14 is not declared complete by this plan alone.

## Self-Check: PASSED

- Both required test artifacts, all four modified production files, and this SUMMARY exist.
- All four RED/GREEN task commits resolve from git history with no tracked-file deletions.
- Every task acceptance criterion and plan-level verification command passed.
- `.oto/STATE.md`, `.oto/ROADMAP.md`, and `sdk/dist` remain unchanged from the expected base.
- No implementation stubs or unplanned threat surfaces were introduced.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
