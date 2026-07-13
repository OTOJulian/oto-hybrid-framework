---
phase: 14-key-storage-reconciliation
plan: 13
subsystem: security
tags: [keyfiles, filesystem, symlink, migration, node-test, vitest]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation
    provides: keyfile storage, legacy migration, key-source detection, warnings, and secret status from plans 01-12
provides:
  - Empty and whitespace-only keyfiles are absent credentials after permission healing
  - Symlink and non-regular keyfile targets are refused before reads, chmod, or writes
  - Keyfile writes heal loose modes before truncation and use O_NOFOLLOW
  - Mirrored CJS and SDK regressions for migration, detection, warning, and status paths
affects: [14-15, 14-19, phase-14-verification, secret-status]

# Tech tracking
tech-stack:
  added: []
  patterns: [lstat-before-chmod, heal-before-truncation, no-follow-keyfile-open, mirrored-cjs-sdk-tests]

key-files:
  created:
    - tests/14-empty-keyfile.test.cjs
    - tests/14-keyfile-symlink.test.cjs
    - sdk/src/query/secrets-empty-keyfile.test.ts
    - sdk/src/query/secrets-symlink.test.ts
  modified:
    - oto/bin/lib/secrets.cjs
    - sdk/src/query/secrets.ts

key-decisions:
  - "Permission healing precedes the trimmed-empty check, so an empty loose-mode keyfile is still repaired before being treated as absent."
  - "Keyfile reads refuse non-regular targets before chmod; writes additionally use O_NOFOLLOW after the lstat guard and heal-before-truncation step."
  - "The residual lstat-to-open regular-file race is accepted for this personal-tool threat model; O_NOFOLLOW closes the symlink-swap case at open time."
  - "sdk/dist remains untouched until the single plan 14-19 rebuild."

patterns-established:
  - "Filesystem secret targets: lstat and reject non-regular files before any operation that can dereference them."
  - "Empty credential files: heal permissions first, then treat trimmed-empty content as absent."

requirements-completed: [SECR-01, SECR-03, SECR-04]

# Metrics
duration: 5 min
completed: 2026-07-13
---

# Phase 14 Plan 13: Empty-Keyfile and Symlink Hardening Summary

**CJS and SDK keyfile paths now preserve legacy credentials past empty files, reject symlink targets, and write secrets only after permission healing through no-follow opens**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-13T00:49:42Z
- **Completed:** 2026-07-13T00:55:07Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Closed CR-01 by returning `null` for zero-byte and whitespace-only keyfiles after the D-12 permission-healing step, allowing legacy migration to preserve the only valid credential.
- Closed WR-07 for read/write paths by refusing symlinks and non-regular files before chmod or content access, and by using `O_NOFOLLOW` for writes after heal-before-truncation.
- Pinned source detection, no-key warnings, masked secret-status output, migration conflicts, and victim-file preservation in both CJS and SDK suites.

## TDD Gate Evidence

- **Task 1 RED:** 10 of 12 CJS assertions failed on the intended empty-keyfile and symlink defects before implementation.
- **Task 1 GREEN:** 12/12 new CJS tests passed; 20/20 existing permission and migration tests remained green.
- **Task 2 RED:** 10 of 12 SDK assertions failed on the mirrored defects before implementation.
- **Task 2 GREEN:** 12/12 new SDK tests passed; 36/36 existing SDK secret tests remained green.

## Task Commits

Each TDD task was committed as a RED test commit followed by a GREEN implementation commit:

1. **Task 1 RED: CJS empty-keyfile and symlink regressions** - `e548235` (test)
2. **Task 1 GREEN: CJS keyfile hardening** - `e656a86` (feat)
3. **Task 2 RED: SDK empty-keyfile and symlink regressions** - `93803cb` (test)
4. **Task 2 GREEN: SDK keyfile hardening mirror** - `7501d7d` (feat)

## Files Created/Modified

- `oto/bin/lib/secrets.cjs` - Adds lstat rejection, heal-before-empty behavior, and no-follow writes.
- `sdk/src/query/secrets.ts` - Mirrors the CJS hardening with classified SDK write errors.
- `tests/14-empty-keyfile.test.cjs` - Covers empty reads, detection, warnings, migration preservation, and conflict behavior.
- `tests/14-keyfile-symlink.test.cjs` - Covers victim preservation, migration fail-closed behavior, and heal-before-truncation.
- `sdk/src/query/secrets-empty-keyfile.test.ts` - Mirrors empty-file coverage and pins secret-status rendering.
- `sdk/src/query/secrets-symlink.test.ts` - Mirrors symlink and regular-file write coverage.

## Verification

- `node --test tests/14-empty-keyfile.test.cjs tests/14-keyfile-symlink.test.cjs tests/14-secrets-keyfile.test.cjs tests/14-migration-hardening.test.cjs` - 32/32 passed.
- `cd sdk && npx vitest run src/query/secrets-empty-keyfile.test.ts src/query/secrets-symlink.test.ts src/query/secrets.test.ts src/query/secret-commands.test.ts` - 48/48 passed.
- `cd sdk && npx tsc --noEmit` - passed.
- All CJS and SDK structural acceptance checks passed; `sdk/dist` has no changes.

## Decisions Made

- Followed the plan's user-mandated heal-first ordering, even for files whose trimmed content is empty.
- Kept both implementations behaviorally mirrored while using `GSDError` with `Execution` classification for the SDK refusal path.
- Deferred generated SDK output to plan 14-19's single rebuild, preserving the bounded convergence contract.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 14-13 is ready for orchestrator merge with the other Wave 1 gap-closure plans.
- Phase 14 remains open through the bounded terminal gate in plan 14-19; this plan does not advance STATE or ROADMAP.

## Self-Check: PASSED

- All six declared implementation/test files and this SUMMARY exist.
- All four RED/GREEN task commits are present in history.
- Task acceptance criteria and plan-level verification commands pass.
- `.oto/STATE.md`, `.oto/ROADMAP.md`, and `sdk/dist` remain unchanged.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
