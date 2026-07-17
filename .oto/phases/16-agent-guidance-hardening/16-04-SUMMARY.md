---
phase: 16-agent-guidance-hardening
plan: 04
subsystem: documentation
tags: [exa, mcp, runtime-matrix, search, docs]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: Exa launcher-stdio registration, consent, and fingerprint ownership across Claude Code, Codex, and Gemini CLI
provides:
  - Generated Exa MCP registration matrix row for all three runtimes
  - User-facing Exa and Brave setup, fallback, rate-limit, and uninstall guidance
affects: [phase-16-verification, release-documentation, runtime-parity]

tech-stack:
  added: []
  patterns: [generated-matrix-byte-equality, qualitative-rate-limit-documentation]

key-files:
  created: [docs/search-integrations.md]
  modified: [bin/lib/runtime-matrix.cjs, decisions/runtime-tool-matrix.md, README.md]

key-decisions:
  - "Keep published rate-limit guidance qualitative and direct users to Exa's pricing page for current limits."
  - "Describe runtime registration from the generated matrix source so the committed matrix remains byte-equal to regeneration."

patterns-established:
  - "Generated runtime capabilities are added to bin/lib/runtime-matrix.cjs and committed with regenerated output."
  - "Optional search integrations degrade through Exa, Brave, and built-in search without exposing missing-key errors to users."

requirements-completed: [HARD-03]

duration: 14 min
completed: 2026-07-17
---

# Phase 16 Plan 04: Exa Runtime Matrix and Search Documentation Summary

**Generated three-runtime Exa MCP registration coverage plus a public setup guide for consent, fallback, qualitative rate limits, and ownership-safe uninstall**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-17T17:34:00Z
- **Completed:** 2026-07-17T17:48:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added a generated MCP Servers section documenting the pinned Exa launcher and registration shape for Claude Code, Codex, and Gemini CLI.
- Preserved the matrix's byte-equality contract by regenerating `decisions/runtime-tool-matrix.md` from its source and passing the D-05 guard.
- Added a 71-line search integration guide covering hidden key entry, consent-gated registration, Brave and built-in fallbacks, qualitative rate-limit behavior, and fingerprint-safe uninstall.
- Linked the new search guide from README's Documentation section.

## Task Commits

Each task was committed atomically:

1. **Task 1: MCP servers section in runtime-matrix generator + regeneration** - `a371a5d` (feat)
2. **Task 2: docs/search-integrations.md + README link** - `f48a59d` (docs)

## Files Created/Modified

- `bin/lib/runtime-matrix.cjs` - Defines and renders the Exa MCP server row and exact three-tool surface.
- `decisions/runtime-tool-matrix.md` - Regenerated canonical runtime capability matrix.
- `docs/search-integrations.md` - Documents Exa and Brave setup, fallback behavior, rate limits, and uninstall safety.
- `README.md` - Links the search integrations guide from the documentation index.

## Decisions Made

- Kept rate-limit guidance qualitative because provider limits can change; the guide sends readers to Exa's pricing page for current limits.
- Kept the matrix update generator-owned and committed the generated output in the same task, preserving the existing drift gate.

## Verification

- `node --test tests/phase-08-runtime-matrix-render.test.cjs` - PASS, 5/5 tests.
- Matrix acceptance greps - PASS: one MCP section, one Codex `mcp_servers.exa` row, one advanced-tool mention, and one pinned-version mention.
- Documentation acceptance greps - PASS: README link count is one, all required setup/tool strings are present, zero numeric quota/QPS matches, and zero key-shaped values.
- `npm test` - scoped changes passed, but the repository-wide run ended at 909 passing, 4 failing, and 3 skipped due to the pre-existing/out-of-plan issues listed below.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The full repository suite exposed four failures unrelated to files changed by this plan:

- `.oto/STATE.md` declares `gsd_state_version` while the Phase 13 guard requires `oto_state_version`; shared state is orchestrator-owned in parallel execution.
- `.oto/phases/16-agent-guidance-hardening/16-03-PLAN.md` contains a provider-prefixed token fixture caught by the tracked `.oto` secret guard; Plan 16-03 is outside this executor's scope.
- Installed Claude and Codex copies of `oto/workflows/settings-integrations.md` differ from the repository copy; this plan changed no runtime-synced agent, reference, or workflow file.
- The tarball install smoke could not resolve `registry.npmjs.org` (`ENOTFOUND`) in the restricted network environment.

All plan-specific automated checks pass. The orchestrator should rerun `npm test` after merging parallel plan work and reconciling shared state/runtime sync.

## User Setup Required

None - no external service configuration is required to merge these documentation and matrix changes.

## Next Phase Readiness

- Plan output is ready to merge into the Phase 16 integration branch.
- Phase-level verification should rerun the full suite after parallel work resolves the shared baseline failures.

## Self-Check: PASSED

- Created file exists: `docs/search-integrations.md`.
- Required task commits exist: `a371a5d`, `f48a59d`.
- Matrix output byte-equals a fresh generator render.
- No tracked file deletions or unrelated worktree changes were introduced.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
