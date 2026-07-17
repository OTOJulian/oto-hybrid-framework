---
phase: 16-agent-guidance-hardening
plan: 01
subsystem: agent-guidance
tags: [search, exa, brave, firecrawl, runtime-parity]

requires:
  - phase: 15-mcp-registration
    provides: Exa registration and integration availability gates across runtime adapters
provides:
  - Runtime-neutral search-tools reference with Exa, Brave, and built-in fallback behavior
  - Shared search guidance consumption by all three researcher agents
  - Structural regression guards for search guidance drift and runtime-specific namespace leakage
affects: [16-05-agent-search-guidance, researcher-agents, runtime-sync]

tech-stack:
  added: []
  patterns: [shared include reference, runtime-neutral shipped guidance, structural markdown guards]

key-files:
  created:
    - oto/references/search-tools.md
    - tests/16-search-reference.test.cjs
  modified:
    - oto/agents/oto-phase-researcher.md
    - oto/agents/oto-project-researcher.md
    - oto/agents/oto-ui-researcher.md

key-decisions:
  - "Search guidance uses runtime-neutral Exa tool names because references ship byte-identically to every runtime root."
  - "Researcher agents retain only a runtime-transformed include pointer; the canonical fallback and failure rules live in one reference."

patterns-established:
  - "Shared agent guidance: keep cross-agent policy in oto/references and consume it through one include pointer."
  - "Runtime-neutral references: exclude runtime-specific namespace prefixes and guard the exclusion structurally."

requirements-completed: [GUID-01, GUID-02]

duration: 19 min
completed: 2026-07-17
---

# Phase 16 Plan 01: Shared Search Guidance Summary

**Runtime-neutral Exa → Brave → built-in search guidance now has one canonical reference, consumed by all three researcher agents and guarded against drift.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-07-17T17:27:00Z
- **Completed:** 2026-07-17T17:46:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added the canonical fallback ladder, Exa tool table, 429 no-retry rule, tool-not-found fallback, Brave CLI usage, and Firecrawl guidance without any `mcp__` namespace tokens.
- Replaced three mutually drifted researcher sections with one shared include while preserving their surrounding verification and codebase-first guidance.
- Synced the new reference and agent bodies to installed Claude and Codex roots, including in-place Codex `.toml` body edits that preserved installed model and sandbox settings.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing search reference guards** - `e473d83` (test)
2. **Task 1 GREEN: Add shared search-tools reference** - `5286356` (feat)
3. **Task 2: Consolidate researcher search guidance** - `52b49fc` (refactor)

## Files Created/Modified

- `oto/references/search-tools.md` - Canonical runtime-neutral search availability, ladder, failure, and scraping guidance.
- `tests/16-search-reference.test.cjs` - Structural guards for reference contents, ladder ordering, namespace neutrality, and researcher consumption.
- `oto/agents/oto-phase-researcher.md` - Uses the shared search-tools include in place of the drifted inline guidance.
- `oto/agents/oto-project-researcher.md` - Uses the shared search-tools include in place of the drifted inline guidance.
- `oto/agents/oto-ui-researcher.md` - Collapses separate search tiers into the canonical ladder and shared include.

## Decisions Made

- Used the exact three registered Exa tool names without runtime namespace prefixes so the byte-identical reference remains valid in Claude, Codex, and Gemini.
- Edited installed Codex `.md` and `.toml` files in place, preserving their existing model, reasoning-effort, and sandbox fields.
- Preserved Plan 16-02's concurrent installed `settings-integrations.md` update instead of overwriting it from this worktree's older base.

## Deviations from Plan

None - plan implementation executed exactly as written.

## Issues Encountered

- `node scripts/check-runtime-sync.cjs` reports only `settings-integrations.md` drift in the Claude and Codex roots. Plan 16-02 completed and synced that workflow concurrently, while this isolated worktree is based on the pre-16-02 commit. All 16-01-specific installed reference and agent invariants pass; the orchestrator must rerun the drift guard after merging 16-01 and 16-02.
- The full `npm test` run reached 912/918 passing with 3 skipped and 3 failures unrelated to 16-01: the pre-existing `gsd_state_version` marker in `.oto/STATE.md`, a key-shaped fixture token in `16-03-PLAN.md`, and the expected concurrent runtime-sync mismatch above. The first run also hit `ENOTFOUND registry.npmjs.org`; an approved network-enabled rerun removed that failure.

## Verification

- `node --test tests/16-search-reference.test.cjs` — PASS (2/2).
- Task 1 acceptance checks — PASS.
- Task 2 content and installed-copy invariants — PASS for all three researcher `.md` files, Codex `.toml` bodies, and both installed reference copies.
- `npm test` — 912 pass, 3 fail, 3 skip; all failures are pre-existing or concurrent and listed above.
- `node scripts/check-runtime-sync.cjs` — deferred to the orchestrator's merged-tree gate because concurrent Plan 16-02 runtime changes are intentionally preserved.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GUID-01 and GUID-02 are implemented and ready for debugger/advisor guidance extension in Plan 16-05.
- The orchestrator should merge Plans 16-01 and 16-02 before rerunning the global runtime-sync drift guard.

## Self-Check: PASSED

- All five planned repo files exist and contain the required structures.
- All three task commits are present.
- No tracked files were deleted and the worktree contains only this summary pending its metadata commit.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
