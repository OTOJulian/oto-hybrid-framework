---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 11
subsystem: runtime-adapters
tags: [mcp, claude, gemini, json, preservation, lifecycle]
requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: Exa MCP adapter registration and ownership-state lifecycle
provides:
  - Fail-closed plain-object validation for Claude and Gemini MCP config roots and containers
  - Byte-preserving adapter refusals and safe unmerge skips for incompatible JSON shapes
  - Installer lifecycle coverage proving refusals never record phantom MCP ownership
affects: [phase-15-verification, exa-mcp, runtime-config-preservation]
tech-stack:
  added: []
  patterns: [plain-object shape guard, structured refusal, failing-first lifecycle regression]
key-files:
  created: []
  modified:
    - bin/lib/runtime-claude.cjs
    - bin/lib/runtime-gemini.cjs
    - tests/15-claude-mcp-merge.test.cjs
    - tests/15-gemini-mcp-merge.test.cjs
    - tests/15-mcp-state.test.cjs
key-decisions:
  - "Treat any non-plain-object JSON root or existing mcpServers container as incompatible and refuse before mutation."
  - "Keep Gemini mergeSettings null and primitive root behavior outside CR-01 while pinning its fail-safe lifecycle outcome."
patterns-established:
  - "MCP JSON adapters validate roots and existing containers before reading or mutating nested entries."
  - "Structured registration refusal flows through the installer registered gate without creating an ownership fingerprint."
requirements-completed: [MCP-03, MCP-05]
duration: 8 min
completed: 2026-07-14
---

# Phase 15 Plan 11: Incompatible MCP Shape Refusal Summary

**Claude and Gemini MCP adapters now fail closed on incompatible JSON shapes, preserve user configuration, and prevent phantom ownership fingerprints.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-14T19:15:00Z
- **Completed:** 2026-07-14T19:23:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added plain-object guards to both JSON runtime adapters before any nested MCP access or mutation.
- Covered seven incompatible root/container shapes per adapter, plus Gemini unparseable settings, with byte-preservation assertions.
- Added ten installer-lifecycle regressions proving Claude refusals preserve exact bytes, Gemini tolerated shapes preserve semantics, and no refusal records MCP ownership.

## Task Commits

Each task was committed atomically with failing-first coverage:

1. **Task 1 RED: incompatible-shape adapter regressions** - `b30c69d` (test)
2. **Task 2 RED: installer lifecycle refusal regressions** - `d539096` (test)
3. **Task 1 GREEN / shared fix: guarded Claude and Gemini adapters** - `a90111d` (fix)

## Files Created/Modified

- `bin/lib/runtime-claude.cjs` - Refuses incompatible roots and containers; unmerge skips them without writing.
- `bin/lib/runtime-gemini.cjs` - Adds the same shape guard and converts parse failures into structured refusal/skip results.
- `tests/15-claude-mcp-merge.test.cjs` - Pins byte-identical refusal and unmerge behavior across seven fixtures.
- `tests/15-gemini-mcp-merge.test.cjs` - Pins the same fixture matrix plus unparseable JSON behavior.
- `tests/15-mcp-state.test.cjs` - Proves refusal paths do not create installer ownership fingerprints.

## Decisions Made

- Shape validation occurs immediately after parsing and before desired-entry construction or nested reads.
- Gemini lifecycle assertions are semantic where `mergeSettings` legitimately rewrites the shared settings file; adapter-level tests retain the byte-identity contract.
- Gemini null and primitive lifecycle roots remain known pre-existing `mergeSettings` aborts outside CR-01; tests prove no state file is written and bytes remain untouched.

## Deviations from Plan

### Execution-order adjustment

The Task 2 lifecycle RED tests were committed before the shared adapter GREEN implementation. Both tasks exercise the same adapter defect, so this preserved the plan's mandatory failing-first evidence for Task 2; implementation scope and final task behavior were unchanged.

**Total deviations:** 1 execution-order adjustment. **Impact on plan:** No scope expansion; stronger TDD evidence for both task families.

## Issues Encountered

- `npm test` completed with 889 passing, 3 skipped, and 2 failures. Neither failure is caused by Plan 15-11: the install-smoke test hit the known sandbox DNS baseline (`ENOTFOUND registry.npmjs.org`), and the Phase 13 state-marker guard observed the workflow-start mutation from `oto_state_version` to `gsd_state_version`. The metadata update restores the OTO marker and the focused 76-test Plan 15-11 suite is green.

## Verification

- Adapter RED run: 17 failures reproduced before implementation.
- Lifecycle RED run: 8 failures reproduced before implementation.
- `node --test tests/15-claude-mcp-merge.test.cjs tests/15-gemini-mcp-merge.test.cjs tests/15-mcp-state.test.cjs`: 76 passed, 0 failed.
- All Task 1 and Task 2 grep acceptance gates passed.
- Manual CR-01 reproduction returned `incompatible-shape` and preserved the seeded Claude file byte-for-byte.
- `npm test`: 889 passed, 2 baseline/environment failures, 3 skipped; no Plan 15-11 regression.

## Re-review Scope

The follow-up review for this gap-closure run is limited to files changed by gap plans 15-11 and 15-12 only: `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-gemini.cjs`, `tests/15-claude-mcp-merge.test.cjs`, `tests/15-gemini-mcp-merge.test.cjs`, `tests/15-mcp-state.test.cjs`, `sdk/src/query/mcp-status.ts`, `sdk/src/query/mcp-status.test.ts`, `tests/15-mcp-status.test.cjs`, plus generated `sdk/dist/**`. Plans 15-01..15-10 are executed and MUST NOT be modified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

CR-01 is closed in code and regression coverage. Plan 15-12 can close WR-01 before fresh Phase 15 review and independent verification.

## Self-Check: PASSED

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
