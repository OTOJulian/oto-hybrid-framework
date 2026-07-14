---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 07
subsystem: installer
tags: [mcp, exa, install-state, fingerprints, node-test]

# Dependency graph
requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: Claude, Codex, and Gemini mergeMcp/unmergeMcp adapter hooks plus the shipped Exa launcher
provides:
  - Install lifecycle dispatch for Exa MCP registration and unregistration
  - Stored-copy MCP fingerprints in runtime install state
  - Three-runtime lifecycle coverage for idempotency, drift, ownership, and carry-forward
affects: [15-08, 15-09, 15-10, mcp-status, installer-uninstall]

# Tech tracking
tech-stack:
  added: []
  patterns: [optional adapter lifecycle hooks, stored-copy ownership fingerprints, state-before-delete uninstall ordering]

key-files:
  created: [bin/lib/mcp-register.cjs, tests/15-mcp-state.test.cjs]
  modified: [bin/lib/install.cjs, bin/lib/install-state.cjs]

key-decisions:
  - "Carry prior MCP state forward unless an explicit register or unregister action produces a new ownership result."
  - "Consume the stored MCP fingerprint before removeTree deletes the runtime install state."

patterns-established:
  - "MCP lifecycle hooks remain optional adapter capabilities dispatched at the installer commit boundary."
  - "Uninstall removes a live registration only when it exactly matches the entry stored in .install.json."

requirements-completed: [MCP-07, MCP-08, HARD-02]

# Metrics
duration: 14 min
completed: 2026-07-14
---

# Phase 15 Plan 07: MCP Registration Lifecycle Summary

**Idempotent Exa MCP registration with stored-copy ownership fingerprints and drift-safe uninstall across Claude, Codex, and Gemini**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-14T01:50:00Z
- **Completed:** 2026-07-14T02:03:49Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added canonical launcher-path and MCP state-record helpers plus explicit validation for optional `state.mcp` fingerprints.
- Wired `mergeMcp` before the install-state commit and `unmergeMcp` before install-state deletion while preserving fingerprints on plain re-install.
- Proved idempotent registration, matched uninstall, drift preservation, user-owned refusal, launcher removal, and state carry-forward for all three runtimes.

## Task Commits

Each task was committed atomically:

1. **Task 1: MCP helper and state validation** - `8449332` (feat)
2. **Task 2: Installer MCP lifecycle dispatch** - `c81a4a4` (feat)
3. **Task 3: Three-runtime lifecycle round trips** - `99675dd` (test)

## Files Created/Modified

- `bin/lib/mcp-register.cjs` - Builds launcher paths, stable fingerprints, and timestamped MCP state records.
- `bin/lib/install.cjs` - Dispatches adapter registration/unregistration and threads MCP ownership state through the commit point.
- `bin/lib/install-state.cjs` - Rejects malformed optional MCP ownership records.
- `tests/15-mcp-state.test.cjs` - Covers validation and end-to-end lifecycle behavior for all three runtime adapters.

## Decisions Made

- Preserved prior `state.mcp` by default so a no-action re-install cannot silently discard uninstall ownership evidence.
- Kept launcher cleanup in the existing `state.files` removal loop and used the already-read state object for MCP unmerge before `removeTree` deletes `.install.json`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The full suite initially appeared to hang after all visible tests passed. Process isolation found `phase-04-mr01-install-smoke.test.cjs` blocked in a synchronous temporary `npm install` whose fresh cache required network access. Running the unchanged test and full suite with approved network access resolved the environmental block; no implementation change was needed.

## Verification

- `node --test tests/15-mcp-state.test.cjs` — 17/17 passed.
- Focused HARD-02 family — 62/62 passed.
- Lifecycle ordering check — `mergeMcp` precedes `writeState`; `unmergeMcp` precedes `removeTree`.
- `npm test` — 808 tests, 805 passed, 3 skipped, 0 failed; exited 0 in 15.482 seconds.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Registration state is now durable and uninstall-safe for the Phase 15 status and consent surfaces.
- Ready for 15-08.

## Self-Check: PASSED

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
