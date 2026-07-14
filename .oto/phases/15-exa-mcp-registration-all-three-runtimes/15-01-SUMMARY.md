---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 01
subsystem: architecture
tags: [exa, mcp, adr, stdio, node-test]

requires:
  - phase: 14-key-storage-reconciliation
    provides: 0600 integration keyfiles and environment-first secret resolution
provides:
  - ADR-16 launcher-stdio transport decision with exact Exa server and tool pins
  - Automated content regression coverage for the Phase 15 transport contract
affects: [phase-15-mcp-registration, runtime-adapters, exa-launcher]

tech-stack:
  added: []
  patterns: [launcher-stdio secret indirection, exact MCP package and tool-surface pinning]

key-files:
  created:
    - decisions/ADR-16-exa-mcp-transport.md
    - tests/15-adr.test.cjs
  modified: []

key-decisions:
  - "Exa MCP uses a shipped launcher-stdio process pinned to exa-mcp-server@3.2.1 with no credential material in runtime configuration."
  - "All implementations share the same environment-first, regular-keyfile D-15 usability rule, while write paths retain O_NOFOLLOW protection."
  - "Remote HTTP remains an evaluated alternative and anchors EXA-F-01, but is rejected because runtime header support would duplicate literal credentials."

patterns-established:
  - "MCP transport decisions land as tested ADRs before adapter implementation."
  - "The exact three-tool surface is selected with the server's positional tools= argument."

requirements-completed: [MCP-02]

duration: 8 min
completed: 2026-07-13
---

# Phase 15 Plan 01: Exa MCP Transport ADR Summary

**Launcher-stdio transport contract with an exact Exa server pin, deterministic three-tool surface, shared key-usability rules, and a tested remote-HTTP disposition**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-14T01:01:44Z
- **Completed:** 2026-07-14T01:10:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Recorded ADR-16 before adapter code, selecting launcher-stdio and `exa-mcp-server@3.2.1`.
- Specified the corrected empty-stdin pre-warm and one D-15 key-usability table for CJS, SDK, and launcher implementations.
- Added four content tests pinning the transport, package, exact tool list, remote alternative, and decision identifiers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write decisions/ADR-16-exa-mcp-transport.md** - `6d138a6` (docs)
2. **Task 2: Add tests/15-adr.test.cjs content assertions** - `935e8ff` (test)

## Files Created/Modified

- `decisions/ADR-16-exa-mcp-transport.md` - Defines the Phase 15 transport, secret, pre-warm, tool-surface, and alternative decisions.
- `tests/15-adr.test.cjs` - Prevents the ADR's critical content contract from being removed or weakened.

## Decisions Made

- Selected a shipped launcher-stdio process so all three runtimes resolve one environment/keyfile secret source without writing credentials into runtime configuration.
- Pinned the Exa server and positional three-tool argument so later runtime adapters implement one deterministic surface.
- Kept remote HTTP as a documented alternative and backlog anchor while rejecting its incompatible and duplicated credential-header requirements.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored the OTO state-version marker after workflow startup**
- **Found during:** Task 2 full-suite verification
- **Issue:** Workflow startup rewrote `.oto/STATE.md` from `oto_state_version` to `gsd_state_version`, causing the existing Phase 13 root guard to fail before it reached this plan's tests.
- **Fix:** Restored only the workflow-owned frontmatter marker while preserving all current Phase 15 execution state.
- **Files modified:** `.oto/STATE.md`
- **Verification:** The full test suite passed after the marker correction and network-enabled install-smoke rerun.
- **Committed in:** Plan metadata commit (workflow-owned tracking artifact)

---

**Total deviations:** 1 auto-fixed (1 blocking workflow-state issue).  
**Impact on plan:** The correction restored the repository's established OTO marker and did not alter product implementation scope.

## Issues Encountered

- The sandboxed full-suite run could not resolve `registry.npmjs.org` in the tarball install-smoke test. The required network-enabled rerun passed with no test failures.

## TDD Gate Compliance

Task 2's behavior tests were added after Task 1 intentionally created the ADR they assert, so a genuine RED failure was not possible without introducing a false expectation. The test commit remains independently atomic, and both the focused and full suites pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ADR-16 is the implementation contract for Plans 15-02 through 15-10.
- Ready for 15-02-PLAN.md with no plan-specific blockers.

## Self-Check: PASSED

- Both declared key files exist.
- Task commits `6d138a6` and `935e8ff` are present in repository history.
- Focused ADR verification and the full repository suite pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-13*
