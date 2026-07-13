---
phase: 14-key-storage-reconciliation
plan: 15
subsystem: security
tags: [config-new-project, input-validation, keyfiles, compensation, node-test, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    provides: hardened empty/symlink keyfile handling from 14-13 and fail-closed SDK config mutation from 14-14
provides:
  - Plain-object and top-level key allowlist guards before new-project side effects in CJS and SDK
  - Deep integration-string rejection with sanitized dot-path-only errors, including empty strings
  - Two-phase legacy-default migration with caller provenance and compensated keyfile writes
  - Mirrored CJS and SDK regressions for shape, parse-echo, atomicity, provenance, and rollback
affects: [14-19-terminal-verification, config-new-project, integration-key-storage]

tech-stack:
  added: []
  patterns: [validate-before-side-effects, provenance-aware-reconciliation, compensating-keyfile-writes, mirrored-cjs-sdk-security-tests]

key-files:
  created:
    - tests/14-newproject-shape-guard.test.cjs
    - sdk/src/query/config-newproject-shape.test.ts
  modified:
    - oto/bin/lib/config.cjs
    - oto/bin/lib/secrets.cjs
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/secrets.ts

key-decisions:
  - "Both new-project entry points validate root shape and caller key names before reading defaults or creating the project planning directory."
  - "Caller booleans control committed config independently from raw legacy-default strings, which still migrate to canonical keyfiles."
  - "Keyfile migration classifies every candidate before writing and compensates every attempted target if a later write fails."
  - "CJS heals oto-owned defaults after migration, while SDK keeps the foreign GSD defaults source byte-identical under D-08."
  - "sdk/dist remains untouched until plan 14-19 performs the phase's single rebuild."

patterns-established:
  - "Secret-bearing argv validation: fixed parse errors, key-name-only allowlist errors, and dot-path-only nested-value errors."
  - "Two-phase secret migration: validate/classify first, then write with reverse-order compensation before finalizing config booleans."

requirements-completed: [SECR-01, SECR-02]

duration: 8 min
completed: 2026-07-13
---

# Phase 14 Plan 15: New-Project Shape Guard and Two-Phase Reconciliation Summary

**CJS and SDK new-project creation now reject every secret-smuggling JSON shape before project side effects and migrate legacy defaults through provenance-aware, compensated keyfile commits.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-13T01:14:44Z
- **Completed:** 2026-07-13T01:22:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Closed CR-02 across both source layers with fixed malformed-JSON errors, non-array object guards, documented key allowlists, and deep integration-string scans that include nested empty strings.
- Closed WR-06 by validating all caller values before migration, preserving raw-default provenance under caller boolean overrides, and compensating earlier keyfile writes when a later write fails.
- Moved project-directory creation after full reconciliation and pinned zero-project-side-effect rejection with real-process CJS and direct SDK tests.
- Preserved D-02 keyfile-wins conflicts, D-08 read-only SDK defaults, CJS defaults healing, and boolean-only committed integration flags.

## TDD Gate Evidence

- **Task 1 RED:** 11 of 12 CJS regressions failed on the intended shape, nesting, ordering, parse-message, provenance, and compensation defects; the documented positive control passed.
- **Task 1 GREEN:** 12/12 new CJS tests passed, followed by 36/36 existing config/keyfile/migration regressions.
- **Task 2 RED:** 10 of 11 SDK regressions failed on the mirrored defects; the documented positive control passed.
- **Task 2 GREEN:** 11/11 new SDK tests passed, followed by 95/95 existing mutation/secret regressions and a clean TypeScript check.

## Task Commits

Each TDD task was committed as a RED test commit followed by a GREEN implementation commit:

1. **Task 1 RED: CJS new-project security regressions** - `4ac24bc` (test)
2. **Task 1 GREEN: CJS shape guard and two-phase reconciliation** - `0234cae` (feat)
3. **Task 2 RED: SDK new-project security regressions** - `8f4eabe` (test)
4. **Task 2 GREEN: SDK mirror and compensated reconciliation** - `c28a9f4` (feat)

## Files Created/Modified

- `tests/14-newproject-shape-guard.test.cjs` - Real-process shape, no-echo, no-side-effect, provenance, and compensation regressions.
- `sdk/src/query/config-newproject-shape.test.ts` - Mirrored Vitest coverage against the SDK source handler.
- `oto/bin/lib/config.cjs` - Fixed parse message, root/key guards, raw-default threading, and mkdir-after-validation ordering.
- `oto/bin/lib/secrets.cjs` - Deep scanner plus provenance-aware, two-phase migration with compensation and defaults healing.
- `sdk/src/query/config-mutation.ts` - Mirrored choices validation, raw-default threading, and delayed project mkdir.
- `sdk/src/query/secrets.ts` - Mirrored scanner and compensated two-phase reconciler with classified SDK errors.

## Verification

- `node --test tests/14-newproject-shape-guard.test.cjs tests/14-newproject-boolean.test.cjs tests/14-config-boolean.test.cjs` - 28/28 passed.
- `node --test tests/14-newproject-boolean.test.cjs tests/14-config-boolean.test.cjs tests/14-secrets-keyfile.test.cjs tests/14-migration-hardening.test.cjs` - 36/36 passed.
- `cd sdk && npx vitest run src/query/config-newproject-shape.test.ts src/query/config-mutation.test.ts src/query/secrets.test.ts` - 83/83 passed.
- `cd sdk && npx vitest run src/query/config-mutation.test.ts src/query/secrets.test.ts src/query/secrets-empty-keyfile.test.ts src/query/config-mutation-failclosed.test.ts` - 95/95 passed.
- `cd sdk && npx tsc --noEmit` - passed.
- All structural acceptance checks passed: fixed parse messages, scanner ordering, mkdir-after-reconcile, fixture markers, and empty-string scanning.
- `git diff -- sdk/dist` is empty; no generated SDK output was rebuilt.

## Decisions Made

- Derived caller allowlists from each layer's materialized top-level config shape plus `mode`, `granularity`, and deprecated `depth` compatibility keys.
- Kept validation messages value-free: fixed parse text, caller key names only, and nested dot-paths only.
- Classified candidate keyfile state during Phase A and restored prior contents or absence in reverse order when Phase B failed.
- Kept SDK defaults byte-identical while retaining the existing CJS best-effort defaults heal.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The isolated worktree's Git administrative index is under the main repository's `.git/worktrees` directory, so the four required commits needed sandbox escalation. All completed normally with `--no-verify`.
- Pre-existing untracked `node_modules` and `sdk/node_modules` setup symlinks were left untouched and were not included in any commit.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- CR-02 and WR-06 are closed at both source layers with direct regression evidence.
- Plan 14-19 can rebuild `sdk/dist` once and rerun the verifier's reproductions against the shipped CLI.
- Phase 14 remains open until the bounded terminal convergence gate completes.

## Self-Check: PASSED

- All six declared implementation/test files and this SUMMARY exist.
- All four RED/GREEN task commits resolve from Git history with no tracked-file deletions.
- Every task acceptance criterion and plan-level verification command passed.
- `.oto/STATE.md`, `.oto/ROADMAP.md`, and `sdk/dist` remain unchanged from the worktree base.
- No implementation stubs or unplanned threat surfaces were introduced.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
