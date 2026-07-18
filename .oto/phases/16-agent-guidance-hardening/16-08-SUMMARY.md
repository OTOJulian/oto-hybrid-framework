---
phase: 16-agent-guidance-hardening
plan: 08
subsystem: agent-guidance
tags: [search, exa, brave, firecrawl, availability-contract, runtime-parity]

# Dependency graph
requires:
  - phase: 16-agent-guidance-hardening
    provides: shared search reference, five consuming agent workflows, and structured Brave websearch fallback
provides:
  - Runtime-observable Exa, Brave, and Firecrawl availability guidance
  - End-to-end coherence guards for all five workflow and agent consumers
  - Live keyless Brave probe coverage against the shipped SDK CLI
affects: [GUID-01, search-capable-agents, runtime-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [tool-list capability gates, structured keyless availability probes, TDD contract tests]

key-files:
  created:
    - .oto/phases/16-agent-guidance-hardening/16-08-SUMMARY.md
  modified:
    - oto/references/search-tools.md
    - tests/16-search-reference.test.cjs
    - tests/16-availability-coherence.test.cjs

key-decisions:
  - "Agent-facing search availability is derived from runtime-observable tool presence and the structured Brave probe, not orchestrator context booleans."
  - "Installed runtime-root mutation remains orchestrator-owned in isolated worktree execution; sync is handed off after merge."

patterns-established:
  - "Capability guidance names only signals each consuming agent can observe directly."
  - "Contract tests lock both static spawn-prompt shape and the real keyless CLI response."

requirements-completed: [GUID-01]

# Metrics
duration: 12 min
completed: 2026-07-18
---

# Phase 16 Plan 08: Runtime-Observable Search Availability Summary

**Runtime-observable tool-list gates and a structured Brave probe replace unsupplied context booleans, with all five consumer shapes and the real keyless CLI behavior locked by tests.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-17T23:51:32Z
- **Completed:** 2026-07-18T00:03:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced the false `exa_search` / `brave_search` / `firecrawl` context premise with tool-list gates for Exa and Firecrawl plus the structured Brave SDK probe.
- Added a ten-consumer coherence guard spanning five spawn workflows and five agent sources.
- Added a live keyless probe proving `node bin/oto-sdk.js query websearch "availability probe"` exits 0 with `available: false` and a fixed, key-free reason.
- Preserved the Exa fallback ladder, all three tool names, 429 and tool-not-found session demotion, and runtime-neutral namespace constraints.

## Task Commits

1. **Task 1 RED: Add failing availability-contract tests** - `76391c2` (test)
2. **Task 1 GREEN: Make search availability runtime-observable** - `b9bd1f2` (feat)
3. **Task 2: Validate runtime sync and full regression gates** - no repository commit; installed-root sync is an orchestrator-owned post-merge handoff

## Files Created/Modified

- `oto/references/search-tools.md` - Runtime-observable availability gates and unchanged fallback/demotion behavior.
- `tests/16-search-reference.test.cjs` - Structural guards requiring observable gates and excluding retired context fields.
- `tests/16-availability-coherence.test.cjs` - Ten-consumer prompt-shape guard and live keyless Brave CLI probe.
- `.oto/phases/16-agent-guidance-hardening/16-08-SUMMARY.md` - Execution evidence and runtime-sync handoff.

## Decisions Made

- Kept init's informational `*_available` fields unchanged while removing any promise that consuming agents receive those fields.
- Used the real shipped CLI for Brave availability evidence; no SDK source, dist, workflow, agent, baseline, or key material changed.
- Honored the parallel-worktree single-writer rule: the parent orchestrator must sync installed runtime roots after merging this branch.

## TDD Gate Compliance

- **RED:** `76391c2`; focused run produced 8 passes and the single expected failure because the old reference lacked `"available": false` and still promised context booleans.
- **GREEN:** `b9bd1f2`; focused run passed 9/9.
- **REFACTOR:** Not needed; the plan supplied the exact minimal reference contract.

## Deviations from Plan

### Execution-Protocol Adjustment

**1. [Isolation contract] Runtime-root copies deferred to the parent orchestrator**
- **Found during:** Task 2 (runtime sync)
- **Issue:** The plan normally copies into `~/.claude` and `~/.codex`, but the isolated-worktree dispatch explicitly prohibits mutating installed runtime roots.
- **Resolution:** Left both installed copies untouched, ran the guard to capture exact drift, and prepared the post-merge copy/diff/check commands below.
- **Files modified:** None outside the repository.
- **Verification:** `node scripts/check-runtime-sync.cjs` reports exactly two drift items (`~/.claude/oto/references/search-tools.md`, `~/.codex/oto/references/search-tools.md`) and skips Gemini because no install exists.
- **Commit:** None; external sync is intentionally orchestrator-owned.

**Total deviations:** 1 execution-protocol adjustment. **Impact on plan:** Repository implementation and tests are complete; installed-runtime parity becomes true only after the parent performs the documented post-merge sync.

## Issues Encountered

- The isolated worktree has no dependency tree. Tests used temporary symlinks to the main checkout's existing `node_modules` and `sdk/node_modules`; both were removed after every run and the final worktree is clean.
- `npm test` reported 964 passed, 2 failed, 3 skipped. One failure is the intentionally pending installed-runtime sync guard. The other is the known sandbox DNS install-smoke failure (`ENOTFOUND registry.npmjs.org`); its network-enabled rerun passed 1/1.
- No SDK baseline failures were repaired or reclassified, and `git status --porcelain sdk/` remained empty.

## Runtime-Sync Handoff

After merging `b9bd1f2` and `76391c2` into the orchestrator branch, run from the repository root:

```bash
cp oto/references/search-tools.md "$HOME/.claude/oto/references/search-tools.md"
cp oto/references/search-tools.md "$HOME/.codex/oto/references/search-tools.md"
diff oto/references/search-tools.md "$HOME/.claude/oto/references/search-tools.md"
diff oto/references/search-tools.md "$HOME/.codex/oto/references/search-tools.md"
node scripts/check-runtime-sync.cjs
```

Expected: both `diff` commands produce no output; the guard reports `ok: ~/.claude`, `ok: ~/.codex`, and `skip: ~/.gemini (no oto install)`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Repository-side GUID-01 gap closure is ready for merge and bounded re-verification.
- Parent runtime sync is required before asserting byte-identical installed Claude/Codex copies or an all-green `npm test` run.
- WR-02 planning-root migration and the approved SDK baseline failures remain out of scope and untouched.

## Self-Check: PASSED (isolated executor scope)

- Required source/test/summary files exist.
- RED precedes GREEN in git history.
- Focused verification passes 9/9 and all structural acceptance checks pass.
- Worktree and `sdk/` status are clean before the summary-only commit.
- External runtime-root parity is explicitly handed off, not claimed complete in this worktree.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-18*
