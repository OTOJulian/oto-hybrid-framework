---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 05
subsystem: integration
tags: [claude, mcp, json, exa, installer, round-trip]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: ADR-16 launcher-stdio transport and launcher path contract
provides:
  - Environment-resolved Claude `.claude.json` registration hooks
  - Additive Exa MCP merge with user-owned and corrupt-file refusal
  - Fingerprint-gated Claude MCP removal with drift preservation
affects: [phase-15-installer-dispatch, mcp-state, claude-runtime]

tech-stack:
  added: []
  patterns: [strict JSON read-modify-write, key-sorted fingerprint equality, fingerprint-gated unmerge]

key-files:
  created:
    - tests/15-claude-mcp-merge.test.cjs
  modified:
    - bin/lib/runtime-claude.cjs

key-decisions:
  - "Claude MCP registration resolves .claude.json exclusively from CLAUDE_CONFIG_DIR or HOME, independent of the installer settings directory."
  - "Claude state is rewritten only after strict JSON parsing and ownership checks; drifted, user-owned, and unparseable content remains untouched."

patterns-established:
  - "Claude MCP ownership is the exact parsed entry object persisted by installer state, with no breadcrumb in .claude.json."
  - "Unmerge deletes only mcpServers.exa after a deep stable fingerprint match and retains the surrounding mcpServers object."

requirements-completed: [MCP-03, HARD-02]

duration: 5 min
completed: 2026-07-14
---

# Phase 15 Plan 05: Claude MCP Registration Summary

**Claude now registers Exa additively in the environment-resolved `.claude.json`, preserving live user state while refusing unowned, drifted, or unparseable entries.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-14T01:35:11Z
- **Completed:** 2026-07-14T01:39:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `CLAUDE_CONFIG_DIR` and home fallback resolution for Claude's user-scope `.claude.json`, independent of `settingsFilename` and `ctx.configDir`.
- Added strict-JSON additive registration that preserves projects, onboarding state, startup counters, and unrelated MCP servers.
- Refused user-owned and unparseable Exa entries without changing file bytes.
- Added fingerprint-safe unmerge, drift diagnostics, exact object-graph round-trip coverage, and byte-identical double-merge coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Claude MCP merge behavior tests** - `862b307` (test)
2. **Task 1 GREEN: Claude MCP registration hooks** - `ba630fc` (feat)
3. **Task 2: Claude HARD-02 round-trip and drift coverage** - `8559157` (test)

## Files Created/Modified

- `bin/lib/runtime-claude.cjs` - Environment-based `.claude.json` resolution plus merge and fingerprint-gated unmerge hooks.
- `tests/15-claude-mcp-merge.test.cjs` - Path, preservation, refusal, corruption, round-trip, drift, user-owned, and idempotence coverage.

## Decisions Made

- Followed D-12 by resolving Claude's MCP state from `ctx.env`, never the installer-resolved `ctx.configDir`.
- Followed D-13/D-14 by treating the exact parsed Exa entry as the ownership fingerprint and leaving all non-matching live entries untouched.
- Kept ownership exclusively in installer state; no marker or breadcrumb was added to Claude's live state file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored the OTO state frontmatter marker after workflow tracking**
- **Found during:** Plan metadata tracking
- **Issue:** `oto-sdk query state.advance-plan` rewrote `oto_state_version` to the known legacy `gsd_state_version` marker.
- **Fix:** Restored the canonical `oto_state_version: 1.0` marker after all state mutations completed.
- **Files modified:** `.oto/STATE.md`
- **Verification:** `sed -n '2p' .oto/STATE.md` reports the canonical marker and the state remains under 150 lines.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Tracking metadata remains valid for this OTO-managed repository; no implementation scope changed.

## Issues Encountered

- The sandboxed full suite stalled during process/network integration coverage. Re-running the identical `npm test` command with normal approved process/network access completed successfully with 778 passing, 0 failing, and 3 skipped tests.

## TDD Gate Compliance

- Task 1 RED failed because `claudeJsonPath` and `mergeMcp` were not yet exported, then all six behavior tests passed after the adapter implementation.
- Task 2's four coverage-only tests passed on their first run because Task 1 explicitly required the full `unmergeMcp` implementation; they pin the already-required round-trip, drift, user-owned, and double-merge behavior.

## Verification

- `node --test tests/15-claude-mcp-merge.test.cjs` - 10/10 passed.
- `node --test tests/05-merge-settings.test.cjs` - 6/6 passed.
- `npm test` - 778 passed, 0 failed, 3 skipped (781 tests total).
- Export, path-resolution, preservation, byte-safe refusal, strict-parse, named-test, and no-new-breadcrumb acceptance checks passed.
- No test touches the real `~/.claude.json`; all effectful cases use temporary `CLAUDE_CONFIG_DIR` directories.

## User Setup Required

None - later Phase 15 consent and installer-dispatch plans own live registration.

## Next Phase Readiness

- Claude registration is ready for Plan 15-07's installer dispatcher and fingerprint persistence.
- Ready for the next incomplete Phase 15 runtime-adapter plan with no plan-specific blockers.

## Self-Check: PASSED

- Both declared artifacts exist, and all three `15-05` task commits are present in history.
- All task acceptance criteria and plan-level verification commands pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
