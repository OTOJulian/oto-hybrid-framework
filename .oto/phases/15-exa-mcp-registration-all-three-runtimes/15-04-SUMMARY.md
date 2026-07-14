---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 04
subsystem: integration
tags: [codex, mcp, toml, exa, installer, round-trip]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: ADR-16 launcher-stdio transport and launcher path contract
provides:
  - Separate OTO-managed Codex MCP marker block with external duplicate refusal
  - Byte-identical Codex config.toml merge and unmerge machinery
  - Fingerprint-gated Codex adapter registration and removal hooks
affects: [phase-15-installer-dispatch, mcp-state, codex-runtime]

tech-stack:
  added: []
  patterns: [marker-owned TOML block, byte-identical config round-trip, fingerprint-gated unmerge]

key-files:
  created:
    - tests/15-codex-mcp-block.test.cjs
  modified:
    - bin/lib/codex-toml.cjs
    - bin/lib/runtime-codex.cjs

key-decisions:
  - "Codex MCP registration lives in a separate marker block so hook refreshes cannot overwrite it."
  - "Adapter removal requires an exact inner-block fingerprint match; user-owned or drifted entries remain untouched."

requirements-completed: [MCP-04, HARD-02]

duration: 7 min
completed: 2026-07-14
---

# Phase 15 Plan 04: Codex MCP Registration Summary

**Codex now registers Exa through a separately managed TOML block with byte-identical user-content round-trips, duplicate refusal, and fingerprint-safe removal.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-14T01:26:20Z
- **Completed:** 2026-07-14T01:33:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added an independent `# === BEGIN OTO MCP ===` block containing the Codex `[mcp_servers.exa]` launcher entry.
- Refused external table and array-table Exa definitions before any write while preserving input bytes exactly.
- Preserved comments, other MCP servers, the existing OTO hooks block, and trailing whitespace across merge and unmerge.
- Added adapter-level registration, idempotent refresh, fingerprint-matched removal, drift reporting, and user-owned refusal.

## Task Commits

Each TDD task was committed atomically:

1. **Task 1 RED: MCP marker block behavior tests** - `e17b010` (test)
2. **Task 1 GREEN: MCP marker block functions** - `a308183` (feat)
3. **Task 2 RED: Codex adapter behavior tests** - `9bb42e6` (test)
4. **Task 2 GREEN: mergeMcp/unmergeMcp adapter hooks** - `c087917` (feat)

## Files Created/Modified

- `bin/lib/codex-toml.cjs` - MCP markers, external-server detection, safe emission, fingerprint extraction, and byte-identical block removal.
- `bin/lib/runtime-codex.cjs` - File-backed Codex `mergeMcp` and `unmergeMcp` lifecycle hooks.
- `tests/15-codex-mcp-block.test.cjs` - Text-level and five-case adapter HARD-02 regression family.

## Decisions Made

- Followed ADR-16 and the shared adapter contract: runtime configuration contains only `node` plus the launcher path, never credential material.
- Treated an existing managed block as refreshable only when it matches the prior fingerprint or the desired current entry; otherwise registration refuses ownership.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The sandboxed full suite stalled after its process/network integration coverage. Re-running the identical `npm test` command with normal approved process/network access completed successfully with 768 passing, 0 failing, and 3 skipped tests.

## TDD Gate Compliance

- Task 1 RED failed because `mergeMcpBlock` was not yet exported, then passed after the TOML implementation.
- Task 2 RED failed because `codexAdapter.mergeMcp` was not yet exported, then passed after the adapter implementation.

## Verification

- `node --test tests/15-codex-mcp-block.test.cjs tests/05-merge-settings.test.cjs tests/phase-08-codex-toml.test.cjs` - 23/23 passed.
- `npm test` - 768 passed, 0 failed, 3 skipped (771 tests total).
- All export, marker-preservation, exact round-trip assertion, adapter-member, and five-named-case acceptance checks passed.

## User Setup Required

None - later Phase 15 consent and installer-dispatch plans own live registration.

## Next Phase Readiness

- Codex registration is ready for Plan 15-07's installer dispatcher and fingerprint persistence.
- Ready for the next incomplete Phase 15 runtime-adapter plan with no plan-specific blockers.

## Self-Check: PASSED

- All declared code and test artifacts exist, and the four `15-04` task commits are present in history.
- All task acceptance criteria and plan-level verification commands pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
