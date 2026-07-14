---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 06
subsystem: integration
tags: [gemini, mcp, json, exa, installer, round-trip]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: ADR-16 launcher-stdio transport and launcher path contract
provides:
  - Gemini settings.json Exa MCP registration hooks independent of enableAgents
  - Stdio-only Gemini entry shape with no url or httpUrl transport keys
  - Fingerprint-gated Gemini MCP removal with drift and user-entry preservation
affects: [phase-15-installer-dispatch, mcp-state, gemini-runtime]

tech-stack:
  added: []
  patterns: [JSONC-tolerant read-modify-write, key-sorted fingerprint equality, separate settings hooks]

key-files:
  created:
    - tests/15-gemini-mcp-merge.test.cjs
  modified:
    - bin/lib/runtime-gemini.cjs

key-decisions:
  - "Gemini MCP registration is a separate adapter hook from mergeSettings, so experimental.enableAgents false cannot suppress Exa registration."
  - "Gemini writes only command and args for Exa; ownership is the exact parsed entry persisted by installer state."

patterns-established:
  - "Gemini MCP merge and hook-settings merge may share settings.json but preserve and remove their state independently."
  - "Unmerge deletes only mcpServers.exa after a deep stable fingerprint match and retains the surrounding mcpServers object."

requirements-completed: [MCP-05, HARD-02]

duration: 9 min
completed: 2026-07-14
---

# Phase 15 Plan 06: Gemini MCP Registration Summary

**Gemini now registers Exa as a stdio-only `mcpServers.exa` entry independently of agent-hook settings, preserving user configuration and refusing unowned or drifted entries.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-14T01:40:00Z
- **Completed:** 2026-07-14T01:49:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `mergeMcp` and `unmergeMcp` to the Gemini adapter as separate lifecycle hooks that never consult `experimental.enableAgents`.
- Wrote the exact Gemini stdio entry `{ command: 'node', args: [launcherPath] }`, with no `url`, `httpUrl`, credential, or extra type field.
- Preserved user settings and unrelated MCP servers while refusing user-owned Exa entries without changing file bytes.
- Added fingerprint-safe matched removal, drift diagnostics, absent-entry handling, idempotence, object-graph round-trip, and shared-file interplay coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Gemini MCP merge behavior tests** - `e845355` (test)
2. **Task 1 GREEN: Gemini MCP registration hooks** - `45fbda8` (feat)
3. **Task 2: Gemini settings and MCP interplay regression** - `1e0626c` (test)

## Files Created/Modified

- `bin/lib/runtime-gemini.cjs` - JSONC-tolerant MCP merge plus fingerprint-gated unmerge hooks.
- `tests/15-gemini-mcp-merge.test.cjs` - Entry shape, enableAgents independence, preservation, refusal, idempotence, round-trip, drift, absent, and coexistence coverage.

## Decisions Made

- Followed Pitfall 8 by exporting MCP registration beside, rather than inside, `mergeSettings`; the existing `enableAgents:false` early return cannot gate it.
- Followed D-13/D-14 by treating the exact parsed Exa entry as the ownership fingerprint and leaving every non-matching live entry untouched.
- Kept the Gemini transport stdio-only by constructing the entry from exactly `command` and `args`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Repaired malformed decision tracking output**
- **Found during:** Plan metadata tracking
- **Issue:** The SDK interpreted the documented `--summary-file` decision arguments as decision text and inserted the complete summary twice into `STATE.md`.
- **Fix:** Replaced the malformed block with the two intended concise Phase 15 decisions.
- **Files modified:** `.oto/STATE.md`
- **Verification:** `STATE.md` contains exactly the two Gemini decisions and remains under 150 lines.
- **Committed in:** Plan metadata commit

**2. [Rule 1 - Bug] Restored the OTO state frontmatter marker**
- **Found during:** Plan metadata tracking
- **Issue:** State mutation commands rewrote `oto_state_version` to the known legacy `gsd_state_version` marker.
- **Fix:** Restored the canonical `oto_state_version: 1.0` marker after all SDK state mutations.
- **Files modified:** `.oto/STATE.md`
- **Verification:** The second line of `STATE.md` is the canonical marker.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (2 workflow-tracking bugs).
**Impact on plan:** Implementation scope was unchanged; tracking metadata remains canonical and concise.

## Issues Encountered

- The state SDK's decision-file interface did not match the documented invocation shape; the malformed insertion was caught and repaired before commit.

## TDD Gate Compliance

- Task 1 RED produced 9 expected failures because `mergeMcp` and `unmergeMcp` were not exported.
- Task 1 GREEN passed all 9 behavior tests after the adapter implementation.
- Task 2 added a coverage-only shared-file interplay test; it passed against the Task 1 implementation and pins the required hook-family coexistence contract.

## Verification

- `node --test tests/15-gemini-mcp-merge.test.cjs` - 10/10 passed.
- Focused legacy Gemini adapter/settings run - 22/22 passed.
- Full repository `node:test` suite with concurrency 4 - exit 0; dot reporter emitted only pass markers and no failure output.
- Export, no-enableAgents-reference, exact entry-key, no-url-key, named-test, preservation, and ownership acceptance checks passed.
- All effectful tests use temporary Gemini configuration directories; no real user settings file is touched.

## User Setup Required

None - later Phase 15 consent and installer-dispatch plans own live registration.

## Next Phase Readiness

- All three runtime adapters now expose their MCP registration contract for Plan 15-07's installer dispatcher and fingerprint persistence.
- Ready for the next incomplete Phase 15 plan with no plan-specific blockers.

## Self-Check: PASSED

- Both declared artifacts exist, and all three `15-06` task commits are present in history.
- All task acceptance criteria and plan-level verification commands pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
