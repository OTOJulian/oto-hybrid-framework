---
phase: 16-agent-guidance-hardening
plan: 03
subsystem: sdk-query
tags: [brave, keyfiles, workstreams, secret-status, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    provides: SDK keyfile storage, legacy integration migration, and root/workstream config merge semantics
  - phase: 15-exa-mcp-registration
    provides: D-15 usable-keyfile read contract
provides:
  - Brave websearch resolves BRAVE_API_KEY first and ~/.oto/brave_api_key second
  - Workstream secret-status reports effective root-under-workstream integration flags
  - Selected-workstream status heals legacy integration strings in both root and workstream configs
affects: [HARD-01, settings-integrations, workstream-status]

tech-stack:
  added: []
  patterns:
    - Environment-first credential resolution with readKeyfile fallback
    - Root-first migration followed by effective loadConfig status reads

key-files:
  created:
    - sdk/src/query/secret-status-inheritance.test.ts
  modified:
    - sdk/src/query/websearch.ts
    - sdk/src/query/websearch.test.ts
    - sdk/src/query/secret-commands.ts
    - sdk/dist/query/websearch.js
    - sdk/dist/query/secret-commands.js

key-decisions:
  - "Reuse readKeyfile for the Brave fallback while preserving environment-first precedence."
  - "Use loadConfig for status flags after explicitly healing root and selected-workstream config layers."

patterns-established:
  - "Search credential rungs use canonical keyfile helpers instead of direct filesystem checks."
  - "Workstream status surfaces consume the same effective merged config as runtime loaders."

requirements-completed: [HARD-01]

duration: 8 min
completed: 2026-07-17
---

# Phase 16 Plan 03: SDK Search and Secret-Status Coherence Summary

**Brave websearch now honors the canonical keyfile rung, while workstream secret-status heals and reports effective root-to-workstream integration state without exposing plaintext.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-17T17:36:17Z
- **Completed:** 2026-07-17T17:44:10Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added five Brave credential-resolution regressions covering no-key degradation, keyfile-only use, empty files, environment precedence, and missing-query behavior.
- Added four FRESH-CR-03 regressions covering inherited root enablement, workstream override precedence, root legacy migration, and the root-only path.
- Rebuilt and committed the SDK distribution after both source changes; focused source and parity suites pass with masked-only status output intact.

## Task Commits

Each TDD gate was committed atomically:

1. **Task 1 RED: Brave keyfile-rung coverage** - `46d2930` (test)
2. **Task 1 GREEN: Brave keyfile fallback** - `ce91d4d` (feat)
3. **Task 2 RED: secret-status inheritance reproductions** - `457fc5f` (test)
4. **Task 2 GREEN: root-aware status and SDK dist rebuild** - `ddb5c5a` (feat)

## Files Created/Modified

- `sdk/src/query/websearch.test.ts` - Covers the complete Brave environment/keyfile fallback behavior.
- `sdk/src/query/websearch.ts` - Resolves the Brave key through environment-first `readKeyfile` fallback.
- `sdk/src/query/secret-status-inheritance.test.ts` - Captures inherited flags, overrides, root migration, and plaintext-exclusion behavior.
- `sdk/src/query/secret-commands.ts` - Migrates both relevant config layers and computes enabled flags through `loadConfig`.
- `sdk/dist/query/websearch.*` - Rebuilt Brave handler JavaScript, declarations, and source maps.
- `sdk/dist/query/secret-commands.*` - Rebuilt secret-status JavaScript and source maps.

## Decisions Made

- Preserved the existing websearch request, response, and error shapes; only credential resolution and no-key guidance changed.
- Deleted the private single-file `readConfig` helper after `secretStatus` adopted the canonical asynchronous merged loader.
- Left `.oto/STATE.md` and `.oto/ROADMAP.md` untouched because the parallel orchestrator owns shared tracking.

## Deviations from Plan

None - implementation followed the plan exactly.

## Verification

- RED Task 1: `npx vitest run src/query/websearch.test.ts` failed in the two intended behaviors (missing keyfile guidance and keyfile-only fetch).
- RED Task 2: `npx vitest run src/query/secret-status-inheritance.test.ts` failed in the two intended FRESH-CR-03 behaviors (root inheritance and root legacy migration).
- Focused Brave suite: 5/5 tests passed.
- Focused secret-status inheritance suite: 4/4 tests passed.
- Existing affected suites: 41/41 tests passed across secret commands, empty-keyfile behavior, and config-loader parity.
- TypeScript: `npx tsc --noEmit` passed.
- SDK build: `npm run build` passed; committed dist is newer than source and clean in `git status`.
- Static acceptance counts: HARD-01 marker/import/read call and FRESH-CR-03 marker/root migration/loadConfig call are each present exactly once.

## Issues Encountered

- The repository-wide SDK command `npx vitest run` remains red on the pre-existing broad `.planning` versus `.oto` fixture baseline: 40 test files failed, 51 passed; 271 tests failed, 1330 passed. The affected secret-command suite passed 22/22 within that run, and all five directly relevant suites pass 50/50 when run together.
- The repository-wide CJS `npm test` also remains red on pre-existing shared planning state. The emitted failure for `tests/13-oto-root-guard.test.cjs` requires `oto_state_version`, while the plan base commit already contains `gsd_state_version: 1.0`. This plan changed neither tests nor `.oto/STATE.md`; the parallel orchestrator owns that shared file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-03 implementation and distribution artifacts are ready for orchestration and independent verification.
- Repository-wide baseline failures must be adjudicated centrally; no plan-specific regression is present in the affected suites.

## Self-Check: FAILED

Plan artifacts, commits, focused acceptance criteria, typecheck, and build checks pass. The self-check is marked failed because the plan explicitly requires repository-wide SDK and CJS suites to exit zero, and both retain unrelated base-state failures described above.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
