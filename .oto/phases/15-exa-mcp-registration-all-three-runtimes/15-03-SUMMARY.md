---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 03
subsystem: integration
tags: [exa, mcp, launcher, stdio, keyfiles, hooks]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: ADR-16 launcher-stdio transport and D-15 key usability contract
provides:
  - Self-contained Exa MCP stdio launcher with environment-only credential injection
  - Exact exa-mcp-server 3.2.1 and three-tool surface pin
  - Hook-channel build output and launcher behavior regression matrix
affects: [phase-15-runtime-registration, installer-hooks, mcp-consent]

tech-stack:
  added: []
  patterns: [self-contained installed launcher, environment-only child credential, generated hook distribution]

key-files:
  created:
    - oto/hooks/oto-exa-mcp.js
    - tests/15-launcher.test.cjs
  modified:
    - tests/05-build-hooks.test.cjs

key-decisions:
  - "The launcher resolves D-15 credentials locally and passes key bytes only through the child environment."
  - "The Exa server version and exact three-tool surface are fixed in one spawn-command helper."

requirements-completed: [MCP-06]

duration: 3 min
completed: 2026-07-14
---

# Phase 15 Plan 03: Exa MCP Launcher Summary

**A self-contained hook-channel launcher now starts Exa MCP 3.2.1 with exactly three tools while keeping credential bytes out of process arguments and runtime configuration.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-14T01:20:41Z
- **Completed:** 2026-07-14T01:23:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented ADR-16's launcher-stdio process with environment-first, regular-keyfile D-15 resolution and static error messages.
- Pinned `exa-mcp-server@3.2.1` and `tools=web_search_exa,web_fetch_exa,web_search_advanced_exa` in an exported, testable spawn-command helper.
- Added key-resolution, argv secrecy, and no-key process tests that never contact the network or spawn `npx`.
- Extended the standard hook build expectation; syntax validation emits `oto/hooks/dist/oto-exa-mcp.js` as the seventh built hook artifact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the self-contained launcher** - `ca09a38` (feat)
2. **Task 2: Launcher test suite + build-hooks pass** - `8be3d4c` (test)

## Files Created/Modified

- `oto/hooks/oto-exa-mcp.js` - Standalone D-15 credential resolver and pinned Exa MCP child-process launcher.
- `tests/15-launcher.test.cjs` - Eight launcher unit and process regression tests.
- `tests/05-build-hooks.test.cjs` - Seven-file hook build inventory including the new launcher.
- `oto/hooks/dist/oto-exa-mcp.js` - Generated, syntax-validated distribution copy (intentionally gitignored and rebuilt by `postinstall`).

## Decisions Made

- Followed ADR-16 exactly: no credential is interpolated into argv or diagnostics; the child receives it only as `EXA_API_KEY` in its environment.
- Kept the launcher independent of repository libraries because installed hook files live alone under each runtime configuration directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored the OTO state-version marker after workflow mutations**
- **Found during:** Plan metadata update
- **Issue:** The state mutation SDK rewrote `.oto/STATE.md` from `oto_state_version` to the obsolete `gsd_state_version`, which breaks the repository's Phase 13 root guard.
- **Fix:** Restored only the workflow-owned frontmatter marker after all SDK state mutations completed.
- **Files modified:** `.oto/STATE.md`
- **Verification:** The full root suite passed before metadata mutation; the final marker assertion and state self-check pass.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 blocking workflow-state correction).
**Impact:** No production scope expansion; the correction preserves the repository's OTO state contract.

## Issues Encountered

None.

## TDD Gate Compliance

- The Task 1 preflight launcher assertion failed with `MODULE_NOT_FOUND` before implementation and passed after the launcher was created.
- The permanent Task 2 matrix then passed 8/8, with the hook-build integration test passing independently.

## Verification

- `node --test tests/15-launcher.test.cjs` - 8/8 passed.
- `node --test tests/05-build-hooks.test.cjs` - 1/1 passed.
- `node scripts/build-hooks.js` - passed; emitted 7 syntax-validated hook artifacts.
- `grep -c "exaApiKey=" oto/hooks/oto-exa-mcp.js` - `0`.
- `npm test` - full root suite passed.

## User Setup Required

None - later registration plans own runtime setup and consent.

## Next Phase Readiness

- The launcher path and stable argv contract are ready for the Claude, Codex, and Gemini registration adapters.
- Ready for the next incomplete Phase 15 plan with no plan-specific blockers.

## Self-Check: PASSED

- Declared source and test artifacts exist; the generated dist artifact is present after the standard build.
- Both `15-03` task commits are present in repository history.
- All task acceptance criteria and plan-level verification commands pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
