---
phase: 08-codex-gemini-runtime-parity
plan: 03
subsystem: codex-runtime
tags: [codex, toml, model-profiles, runtime-parity, node-test]
requires:
  - phase: 08
    provides: 08-01 runtime parity fixture skeletons
  - phase: 08
    provides: 08-02 generated AGENTS.md baseline
provides:
  - Codex markdown transform helpers for commands, agents, and skills.
  - Per-agent Codex TOML generation with sandbox_mode and managed-by header.
  - Codex config.toml hook marker merge/unmerge helpers.
  - Codex model profile and override resolution.
  - Install lifecycle hook for adapter-emitted derived files.
  - Codex parity fixtures and real tests replacing the plan-03 todo stubs.
affects: [phase-08, codex-runtime, installer]
tech-stack:
  added: []
  patterns: [adapter lifecycle hook, marker-owned TOML block, fixture-golden parity tests]
key-files:
  created:
    - bin/lib/codex-transform.cjs
    - bin/lib/codex-toml.cjs
    - bin/lib/codex-profile.cjs
    - tests/phase-08-codex-install-wiring.test.cjs
    - tests/fixtures/runtime-parity/codex/oto-executor.expected.md
    - tests/fixtures/runtime-parity/codex/oto-executor.expected.toml
    - tests/fixtures/runtime-parity/codex/oto-progress.expected.md
    - tests/fixtures/runtime-parity/codex/test-driven-development.expected.md
  modified:
    - bin/lib/runtime-codex.cjs
    - bin/lib/install.cjs
    - tests/phase-03-runtime-codex.test.cjs
    - tests/phase-03-install-codex.integration.test.cjs
    - tests/phase-08-codex-transform.test.cjs
    - tests/phase-08-codex-toml.test.cjs
    - tests/phase-08-codex-profile.test.cjs
key-decisions:
  - "Codex command and skill transforms now run through the Claude-to-Codex markdown path instead of identity transforms."
  - "Per-agent TOML is emitted through `adapter.emitDerivedFiles()` so install-state cleanup owns generated agent TOML files."
  - "Codex hooks are marker-owned in `config.toml`; uninstall removes only the marker block and preserves user-authored hooks."
patterns-established:
  - "Runtime adapters can emit derived files after source-copy transforms and before stale-file cleanup."
  - "Model selection precedence is project overrides, global overrides, project/global profile tier, then sonnet default."
requirements-completed: [MR-02, MR-03]
duration: 13min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 03 Summary

**Codex parity port with transforms, per-agent TOML, hooks merge, model profiles, and fixture tests**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-02T20:58:41Z
- **Completed:** 2026-05-02T21:11:11Z
- **Tasks:** 5
- **Files modified:** 15

## Accomplishments

- Added `bin/lib/codex-transform.cjs` with agent, command, skill markdown conversion and per-agent TOML emit support.
- Added `bin/lib/codex-toml.cjs` with marker-owned `[[hooks]]` merge/unmerge, idempotent rewrite, user-content preservation, and mixed legacy/modern hooks guard.
- Added `bin/lib/codex-profile.cjs` with Codex/Gemini runtime profile defaults, global defaults loading, and override precedence.
- Wired `bin/lib/runtime-codex.cjs` so Codex installs now transform commands/agents/skills, merge hooks into `config.toml`, and emit `<configDir>/agents/<agent>.toml`.
- Extended `bin/lib/install.cjs` with `adapter.emitDerivedFiles()` so derived files join install-state diff-and-delete cleanup.
- Replaced Codex plan-03 todo tests with real transform, TOML, profile, and install-wiring assertions plus four locked fixture goldens.
- Updated older Phase 3 Codex tests that intentionally asserted the previous best-effort identity behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author Codex transform helpers** - `5b3839f` (feat)
2. **Task 2: Author Codex TOML hook merge helpers** - `f0a0f85` (feat)
3. **Task 3: Author Codex profile resolution helpers** - `ee0ba88` (feat)
4. **Task 4: Wire Codex adapter + install derived-file hook** - `e18cb34` (feat)
5. **Task 5: Capture Codex parity fixtures + real tests** - `2d68cff` (test)

## Files Created/Modified

- `bin/lib/codex-transform.cjs` - Claude-to-Codex markdown conversion, Codex agent frontmatter cleanup, and per-agent TOML generation.
- `bin/lib/codex-toml.cjs` - Marker-owned `config.toml` hook block merge/unmerge helpers.
- `bin/lib/codex-profile.cjs` - Runtime model profile resolution and `~/.oto/defaults.json` validation.
- `bin/lib/runtime-codex.cjs` - Codex adapter transforms, hook merge, per-agent TOML emit.
- `bin/lib/install.cjs` - Adapter derived-file lifecycle hook.
- `tests/phase-03-runtime-codex.test.cjs` - Updated legacy runtime contract for Phase 8 Codex parity.
- `tests/phase-03-install-codex.integration.test.cjs` - Updated install assertion for managed hooks in `config.toml`.
- `tests/phase-08-codex-transform.test.cjs` - Real Codex transform and fixture-golden tests.
- `tests/phase-08-codex-toml.test.cjs` - Real TOML merge/unmerge and guard tests.
- `tests/phase-08-codex-profile.test.cjs` - Real model/defaults precedence tests.
- `tests/phase-08-codex-install-wiring.test.cjs` - Real installer lifecycle and per-agent TOML tests.
- `tests/fixtures/runtime-parity/codex/*` - Codex fixture goldens for agent markdown, agent TOML, command, and skill transforms.

## Decisions Made

- Implemented the TOML helper as a focused marker-block manipulation module matching the planned public signatures. The upstream reference did not expose a standalone `mergeHooksBlock(existingText, hookEntries, ctx)` function, so the port preserves the required behavior and guardrails without introducing a TOML dependency.
- Kept generated Codex per-agent TOML managed by install-state so reinstall/uninstall behavior remains deterministic.

## Deviations from Plan

### Auto-fixed Issues

**1. Phase 3 Codex tests still asserted pre-parity identity behavior**
- **Found during:** Affected runtime test pass.
- **Issue:** Existing Phase 3 tests expected Codex transforms and `mergeSettings()` to be identity stubs.
- **Fix:** Updated the tests to assert Phase 8 Codex parity behavior: markdown conversion, agent role header, managed hooks.
- **Files modified:** `tests/phase-03-runtime-codex.test.cjs`, `tests/phase-03-install-codex.integration.test.cjs`
- **Verification:** Affected Phase 3 tests and full `npm test` passed.
- **Committed in:** `e18cb34`

**2. Test suite rewrote generated dry-run reports**
- **Found during:** Full `npm test`.
- **Issue:** The dry-run report tests rewrote `reports/rebrand-dryrun.*` against the broad `foundation-frameworks/` tree.
- **Fix:** Restored both report files before committing because they are generated side effects, not Phase 8 deliverables.
- **Files modified:** None retained.
- **Verification:** `git status --short` shows no report diffs.

## Verification

- `node --test tests/phase-08-codex-transform.test.cjs tests/phase-08-codex-toml.test.cjs tests/phase-08-codex-profile.test.cjs tests/phase-08-codex-install-wiring.test.cjs` passed: 18 passing, 0 failures, 0 todos.
- `node --test tests/phase-03-runtime-codex.test.cjs tests/phase-03-install-codex.integration.test.cjs tests/phase-03-no-runtime-conditionals.test.cjs` passed: 18 passing, 0 failures.
- `rg -n "test\\.todo" tests/phase-08-codex-transform.test.cjs tests/phase-08-codex-toml.test.cjs tests/phase-08-codex-profile.test.cjs tests/phase-08-codex-install-wiring.test.cjs` returned no matches.
- `rg -n "gsd-|superpowers-|~/\\.gsd" bin/lib/codex-transform.cjs bin/lib/codex-toml.cjs bin/lib/codex-profile.cjs tests/fixtures/runtime-parity/codex` returned no matches.
- `head -1 tests/fixtures/runtime-parity/codex/oto-executor.expected.toml` returns `# managed by oto v0.1.0-alpha.1`.
- `rg -n "sandbox_mode = \"workspace-write\"" tests/fixtures/runtime-parity/codex/oto-executor.expected.toml` returns the expected sandbox line.
- `npm test` passed: 343 tests total, 311 passing, 32 todo, 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 04 can proceed with Gemini parity. Codex now has concrete transform, hook, model-profile, install-state, and per-agent TOML behavior covered by fixture tests.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
