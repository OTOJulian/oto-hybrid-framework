---
phase: 16-agent-guidance-hardening
plan: 05
subsystem: agent-guidance
tags: [exa, mcp, codex, gemini, transforms, runtime-sync]

requires:
  - phase: 16-agent-guidance-hardening
    provides: Shared runtime-neutral search-tools reference and three consolidated researcher consumers from Plan 16-01
provides:
  - Exa wildcard access and shared search guidance for oto-debugger and oto-advisor-researcher
  - Transform-output guards covering deprecated Exa names across source, Codex markdown, Codex TOML, and Gemini markdown
  - Runtime namespace assertions for Codex tool preservation and Gemini MCP filtering
affects: [phase-16-verification, agent-runtime-parity, exa-search-guidance]

tech-stack:
  added: []
  patterns: [include-pointer-only-guidance, transform-output-regression-guards, installed-runtime-diff-verification]

key-files:
  created: [tests/16-transformed-tool-names.test.cjs]
  modified: [oto/agents/oto-debugger.md, oto/agents/oto-advisor-researcher.md, tests/16-search-reference.test.cjs]

key-decisions:
  - "Use the mcp__exa__* wildcard consistently with the three existing researcher agents."
  - "Verify deprecated names and namespace behavior against real transform output rather than source-only greps."

patterns-established:
  - "Agent search guidance is consumed by include pointer; runtime-specific tool access remains in frontmatter or transformed role metadata."
  - "Cross-runtime naming guards execute the production Codex and Gemini transform functions in-process."

requirements-completed: [GUID-03, GUID-04, GUID-05]

duration: 9 min
completed: 2026-07-17
---

# Phase 16 Plan 05: Debugger and Advisor Exa Guidance with Transform Guards Summary

**Debugger and advisor agents now share runtime-neutral Exa guidance while real Codex and Gemini transforms enforce deprecated-name and namespace safety across all five agents**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-17T18:07:48Z
- **Completed:** 2026-07-17T18:17:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Granted `mcp__exa__*` to `oto-debugger` and `oto-advisor-researcher` and connected both to the shared search reference without copying guidance prose.
- Extended the structural reference contract from three researchers to all five Exa-enabled agents.
- Added 34 transform-output tests covering five agents across source, Codex markdown, Codex TOML, and Gemini markdown plus shipped-reference guards.
- Synced and diff-verified both agents in the installed Claude and Codex runtime roots; Gemini had no oto install and was skipped.

## Task Commits

The work followed strict RED/GREEN commits:

1. **Task 1 RED: debugger and advisor guidance contract** - `06a7ac5` (test)
2. **Task 2 RED: transformed tool-name and namespace guards** - `af1ad04` (test)
3. **Tasks 1-2 GREEN: Exa access and shared-reference implementation** - `f938666` (feat)

Task 2 intentionally guards Task 1's transformed output, so the minimal GREEN implementation is the Task 1 agent change.

## Files Created/Modified

- `oto/agents/oto-debugger.md` - Adds the Exa wildcard and a top-level shared search-tools include block.
- `oto/agents/oto-advisor-researcher.md` - Adds the Exa wildcard and shared search-tools include inside its tool strategy.
- `tests/16-search-reference.test.cjs` - Extends the include and frontmatter contract to all five agents.
- `tests/16-transformed-tool-names.test.cjs` - Runs real transforms and guards deprecated names plus Codex/Gemini namespace behavior.

## Decisions Made

- Kept the wildcard form used by the three existing researchers; Plan 16-06 owns the live CLI contingency if wildcard access fails empirically.
- Kept the shared reference runtime-neutral and placed `mcp__exa__*` only in agent tool metadata, never copied body prose.
- Tested generated output from the production transform functions because source-only assertions cannot detect transform-introduced naming drift.

## Verification

- RED structural run - expected failure: `oto-debugger must include the shared reference`.
- RED transform run - expected 32/34 pass with two Codex access failures for debugger and advisor.
- `node --test tests/16-search-reference.test.cjs tests/16-transformed-tool-names.test.cjs` - PASS, 36/36 tests.
- Task 1 exact-count acceptance greps - PASS for one wildcard and one Claude include per repo agent, plus one Codex include in each installed markdown and TOML file.
- `node scripts/check-runtime-sync.cjs` - PASS: `ok: ~/.claude`, `ok: ~/.codex`, `skip: ~/.gemini (no oto install)`.
- `npm test` - PASS on network-enabled rerun: 961 tests, 958 passed, 0 failed, 3 skipped.

## TDD Gate Compliance

- **RED:** `06a7ac5` and `af1ad04` precede implementation and fail for the intended missing debugger/advisor behavior.
- **GREEN:** `f938666` is after both RED commits and makes the scoped structural and transform suites pass.
- **REFACTOR:** Not needed; the minimal include-pointer and frontmatter changes were already the final design.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first live Codex edit command used an unsafe delimiter for markdown heading text and partially malformed the four targeted installed snippets. The repository was unaffected. Each installed file was staged into a temporary repair area, patched exactly, verified against the current Codex markdown transform or TOML `developer_instructions` body, copied back, and then accepted by the runtime-sync guard.
- The first sandboxed `npm test` run reached 957 passing tests but the tarball install smoke failed on `ENOTFOUND registry.npmjs.org`. Re-running the same full suite with network access passed with zero failures.

## User Setup Required

None - no external service configuration is required for these agent guidance and regression-guard changes.

## Next Phase Readiness

- Plan 16-06 can perform the live tools-restricted subagent probe against the installed debugger/advisor agents.
- The transform and runtime-sync guards are ready for phase-level verification.

## Self-Check: PASSED

- Created test file exists and contains 104 lines with all eight deprecated-name constants and all three production transform functions.
- Required RED/GREEN commits exist in order: `06a7ac5`, `af1ad04`, `f938666`.
- Installed Codex markdown files byte-match current transforms and TOML instruction bodies match current generated bodies.
- No tracked file deletions, shared STATE/ROADMAP edits, or unrelated worktree changes were introduced.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
