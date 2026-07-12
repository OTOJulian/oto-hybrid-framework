---
phase: 14-key-storage-reconciliation
plan: 12
subsystem: security
tags: [sdk, typescript, secrets, config, tty, vitest, dist]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation (plan 08)
    provides: SDK loader scrub, migrate-before-overwrite, and committed dist baseline
  - phase: 14-key-storage-reconciliation (plan 09)
    provides: Executable settings-integrations workflow whose hidden prompt uses readSecretInput
provides:
  - Boolean-only SDK loadConfig results across project and pre-project fallback branches
  - Byte-preserving in-memory scrub for legacy ~/.gsd/defaults.json integration strings
  - Post-migration missing-key warnings in SDK configSet
  - TTY EOF cancellation and guarded readline echo suppression
  - Rebuilt SDK dist carrying all three fixes
affects: [phase-14-verification, sdk-consumers, settings-integrations, secret-set]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boundary normalization: scrub legacy integration strings at every loader return path without mutating the read-only source"
    - "TTY promise settlement: reject readline close, but detach the close listener before successful line-driven shutdown"

key-files:
  created: []
  modified:
    - sdk/src/config.ts
    - sdk/src/config.test.ts
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/config-mutation.test.ts
    - sdk/src/query/secret-commands.ts
    - sdk/src/query/secret-commands.test.ts
    - sdk/dist/config.js
    - sdk/dist/query/config-mutation.js
    - sdk/dist/query/secret-commands.js

key-decisions:
  - "Use one scrubIntegrationStrings helper for every SDK loadConfig return path and pass copied user defaults so ~/.gsd remains read-only"
  - "Run legacy migration before warnIfNoKeyDetected so newly created keyfiles suppress contradictory guidance"
  - "Treat readline close as an interruption and remove that listener before closing after a successful line"

patterns-established:
  - "Fallback security gates must be shared with the primary parsed-config branch rather than duplicated inline"
  - "Undocumented Node readline internals are capability-checked so runtime drift degrades without crashing"

requirements-completed: [SECR-01, SECR-02, SECR-04]

# Metrics
duration: 10min
completed: 2026-07-12
---

# Phase 14 Plan 12: SDK Fallback Scrub and Hidden-Prompt Hardening Summary

**SDK config loading now returns boolean integration flags from every fallback, while hidden TTY secret entry cancels cleanly on EOF and config-set warnings observe migrated keyfiles**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-12T01:44:18Z
- **Completed:** 2026-07-12T01:54:14Z
- **Tasks:** 3
- **Files modified:** 16 (15 implementation/test/dist files plus this summary)

## Accomplishments

- Added a single `scrubIntegrationStrings` boundary helper and applied it to the parsed project branch plus both pre-project fallback returns; copied user defaults prevent any write-back alias to legacy `~/.gsd/defaults.json`.
- Pinned missing-config, whitespace-config, byte-identical source, and all-three-integration behavior with RED-first Vitest coverage.
- Reordered SDK `configSet` so legacy key migration finishes before missing-key guidance, eliminating the contradictory warning for a just-migrated key.
- Made hidden TTY input reject with `API key entry cancelled` on EOF, retained successful line handling, and guarded the private readline mute hook.
- Rebuilt and committed the SDK distribution; the verifier's dist reproduction now prints `boolean true` while the seeded defaults file remains byte-identical.

## Task Commits

Each task was committed atomically (TDD tasks include separate RED and GREEN commits):

1. **Task 1 RED: fallback scrub and read-only defaults tests** - `6ee337c` (test)
2. **Task 1 GREEN: shared scrub across every loadConfig path** - `0c169a0` (fix)
3. **Task 2 RED: warning-order and TTY EOF regressions** - `8659825` (test)
4. **Task 2 GREEN: migrate-before-warn and settled TTY close handling** - `98ffb35` (fix)
5. **Task 3: rebuilt committed SDK dist** - `af50a30` (chore)

## Files Created/Modified

- `sdk/src/config.ts` - shared integration-string scrub used by both fallback returns and the parsed project branch.
- `sdk/src/config.test.ts` - four fallback security cases plus current `.oto` fixture alignment.
- `sdk/src/query/config-mutation.ts` - missing-key warning moved after legacy migration.
- `sdk/src/query/config-mutation.test.ts` - proves a migrated keyfile suppresses the stale warning.
- `sdk/src/query/secret-commands.ts` - guarded mute plus readline close cancellation and success-path listener removal.
- `sdk/src/query/secret-commands.test.ts` - time-bounded EOF rejection and successful TTY line coverage.
- `sdk/dist/config.js` and maps - compiled all-path fallback scrub.
- `sdk/dist/query/config-mutation.js` and maps - compiled warning reorder.
- `sdk/dist/query/secret-commands.js` and maps - compiled TTY close and mute hardening.

## Decisions Made

- Scrub copied fallback data before merging defaults instead of mutating the object returned by `loadUserDefaults`; this makes the D-08 read-only boundary explicit even if future code retains that object.
- Keep the existing SIGINT handler: a close-triggered second rejection is a settled-promise no-op, while EOF now has a deterministic interruption result.
- Treat the repository-wide Vitest fixture drift as pre-existing out-of-scope debt: a clean archive of the required base commit reproduces it, and repairing dozens of unrelated suites would violate the parallel executor's plan-owned-file boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aligned the config test fixture with the current planning-root contract**
- **Found during:** Task 1 RED baseline
- **Issue:** `sdk/src/config.test.ts` created an unmarked `.planning/`, which the current resolver intentionally treats as non-oto and redirects to `.oto/`; 10 pre-existing cases therefore read defaults instead of their fixtures.
- **Fix:** Changed that plan-owned fixture and its config paths to `.oto/` before adding the new failing cases.
- **Files modified:** `sdk/src/config.test.ts`
- **Verification:** Existing file baseline became 16/16 green; the new security cases then failed only on the missing fallback scrub.
- **Committed in:** `6ee337c`

**2. [Rule 3 - Blocking] Reused the installed SDK dependency tree in the isolated worktree**
- **Found during:** Task 1 baseline verification
- **Issue:** The fresh worktree had no `sdk/node_modules`, so Vitest and TypeScript were unavailable locally.
- **Fix:** Added an ignored, temporary symlink to the main checkout's existing `sdk/node_modules`; no dependency or lockfile changed.
- **Files modified:** None committed.
- **Verification:** Vitest and `npm run build` executed successfully from the isolated worktree.

---

**Total deviations:** 2 auto-fixed (2 blocking prerequisites).
**Impact on plan:** Both were execution/test-infrastructure corrections; no production scope was added.

## Issues Encountered

- The exact repository-wide gate `cd sdk && npx vitest run` is pre-existing red: 41/81 files fail, with 268 failed and 1,227 passed tests. Failures cluster in legacy fixtures that create unmarked `.planning/` roots while the Phase 12 resolver correctly chooses `.oto/` unless `.planning/STATE.md` carries `oto_state_version`. A clean `git archive` of required base `b46516d` reproduces the same failures (for example, 12/17 failures in `context-engine.test.ts` and 3/21 in `query/verify.test.ts`), and this plan modifies none of those implementation or fixture files.
- Plan-owned and Phase 14-adjacent SDK verification is green: 5 files, 137/137 tests. The CJS Phase 14 gate is also green at 46/46. This baseline issue is surfaced rather than expanded into an unrelated repository-wide test migration.

## Known Stubs

None - no placeholders or unwired data paths were introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 2 and SDK warning/TTY ride-alongs are implemented in source and committed dist, with focused regression coverage and a passing dist-level reproduction.
- Re-verification can exercise the SDK fallback against `sdk/dist/config.js` immediately.
- Repository-wide SDK fixture migration remains a separate baseline blocker if the milestone requires `npx vitest run` with every historical suite green.

## Self-Check: PASSED

All plan-owned source, test, and dist artifacts exist; all five task commits are present; no `.oto/STATE.md` or `.oto/ROADMAP.md` changes were made.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-12*
