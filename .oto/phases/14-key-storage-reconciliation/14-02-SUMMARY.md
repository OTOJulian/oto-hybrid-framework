---
phase: 14-key-storage-reconciliation
plan: 02
subsystem: security
tags: [secrets, sdk, keyfiles, config, migration, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    plan: 01
    provides: CJS secret-helper contract and pinned user-facing behavior
provides:
  - TypeScript integration keyfile CRUD with 0600 storage and permission healing
  - Boolean-only SDK config enforcement for Exa, Brave, and Firecrawl
  - SDK legacy-string migration through configGet and loadConfig
affects: [14-03, 14-04, phase-15-exa-mcp-registration]

tech-stack:
  added: []
  patterns: [both-write-paths secret parity, guarded read-time migration, explicit-baseDir filesystem tests]

key-files:
  created:
    - sdk/src/query/secrets.ts
    - sdk/src/query/secrets.test.ts
  modified:
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/config-mutation.test.ts
    - sdk/src/query/config-query.ts
    - sdk/src/config.ts
    - .oto/STATE.md

key-decisions:
  - "SDK integration validation runs before the config lock or write, so non-boolean values never reach tracked config."
  - "Both SDK read paths invoke best-effort legacy migration, preserving normal missing or malformed config behavior."

patterns-established:
  - "The SDK secrets module mirrors the CJS contract and accepts an explicit baseDir for isolated filesystem tests."
  - "Integration source detection returns stable envVar, keyfile, masked, and shadowedKeyfile fields for secret-status consumers."

requirements-completed: [SECR-01, SECR-02, SECR-03]

duration: 8min
completed: 2026-07-10
---

# Phase 14 Plan 02: SDK Key Storage Reconciliation Summary

**The SDK now keeps integration keys in 0600 `~/.oto` keyfiles, accepts booleans only in tracked config, and self-heals legacy strings on either read path.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-10T21:57:41Z
- **Completed:** 2026-07-10T22:05:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added the complete TypeScript secret-helper surface for Exa, Brave, and Firecrawl, including allowlisted CRUD, source precedence, masking, permission repair, and atomic migration.
- Rejected non-boolean integration config values before persistence while warning but allowing an enabled flag with no detected key.
- Corrected SDK keyfile detection from the foreign `~/.gsd` trust domain to canonical `~/.oto`, and wired guarded migration into `configGet` and `loadConfig`.

## Task Commits

Each TDD task used separate RED and GREEN commits:

1. **Task 1 RED: SDK secret-helper behavior tests** - `bbf8466` (test)
2. **Task 1 GREEN: TypeScript secret storage helpers** - `972e936` (feat)
3. **Task 2 RED: SDK config validation and migration tests** - `c572aa1` (test)
4. **Task 2 GREEN: SDK config reconciliation hooks** - `9649732` (feat)

## Files Created/Modified

- `sdk/src/query/secrets.ts` - Integration metadata, 0600 keyfile CRUD, source detection, validation, warnings, and legacy migration.
- `sdk/src/query/secrets.test.ts` - Fourteen Vitest cases covering modes, permission repair, precedence, masking, validation, migration, conflicts, and safe no-ops.
- `sdk/src/query/config-mutation.ts` - Boolean-only integration checks and canonical `~/.oto` keyfile detection.
- `sdk/src/query/config-mutation.test.ts` - Config rejection, warning, path-cutover, and read-hook regressions.
- `sdk/src/query/config-query.ts` - Best-effort migration before direct config reads.
- `sdk/src/config.ts` - Best-effort migration before shared config loads.
- `.oto/STATE.md` - Records the intentionally deferred global-defaults path divergence.

## Decisions Made

- Followed Plan 01's pinned CJS messages and conflict policy so both independent write paths remain behavior-identical.
- Kept the global-defaults `~/.gsd/defaults.json` lookup unchanged because D-08 is limited to integration keyfiles; the divergence is tracked for `/oto-quick` cleanup.

## TDD Gate Compliance

| Task | RED | GREEN | Refactor |
|------|-----|-------|----------|
| SDK secret helpers | `bbf8466` (missing module; expected RED) | `972e936` (14/14 pass) | Not needed |
| SDK config reconciliation | `c572aa1` (6 expected behavior failures) | `9649732` (47/47 pass) | Not needed |

## Verification

- `npx vitest run src/query/config-mutation.test.ts src/query/config-query.test.ts src/query/secrets.test.ts` - 81/81 directly relevant tests pass.
- `npm run build` - exits 0 (`tsc` clean); generated `sdk/dist` output was intentionally not retained because Plan 03 owns the live CLI rebuild.
- All Task 1 and Task 2 grep/count acceptance checks pass: required exports exist, secret helpers contain no `.gsd` path, all three SDK keyfile checks use `.oto`, and both migration hooks are present.
- The plan's four-file command additionally runs the pre-existing `src/config.test.ts` suite: 87/97 pass, with the same 10 legacy-fixture failures when that file runs alone because it writes unmarked `.planning/config.json` while the current resolver correctly selects `.oto`. Per the supplied execution baseline, those unrelated failures were not repaired.

## Deviations from Plan

None - implementation executed exactly as written. The supplied baseline instruction replaced the known-red broad SDK suite criterion with exact directly relevant targets and build verification.

## Issues Encountered

- `src/config.test.ts` retains ten pre-existing `.planning` fixture assumptions. The directly relevant `loadConfig` legacy-migration and missing-config behaviors are covered and green in `config-mutation.test.ts`; changing the unrelated historical fixture file was outside this plan's allowlist.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The typed secret-helper contract is ready for Plan 14-03's `secret-set`, `secret-clear`, and `secret-status` handlers.
- No implementation blockers remain; Plan 03 must rebuild and commit `sdk/dist` after registering the new commands.

## Self-Check: PASSED

- Both created files exist and all four RED/GREEN commits are present.
- No tracked files were deleted and the protected unrelated working-tree changes remain unstaged.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-10*
