---
phase: 08-codex-gemini-runtime-parity
plan: 06
subsystem: runtime-smoke
tags: [runtime-parity, smoke-tests, claude-identity, codex, gemini, node-test]
requires:
  - phase: 08
    provides: Codex runtime parity adapter behavior
  - phase: 08
    provides: Gemini runtime parity adapter behavior
  - phase: 08
    provides: Runtime tool matrix coverage assertions
provides:
  - Claude identity fixture goldens and transform baseline tests.
  - Codex tmpdir install smoke covering command surface, install state, AGENTS.md marker, config.toml hooks, and per-agent TOML sandbox mode.
  - Gemini tmpdir install smoke covering command surface, install state, GEMINI.md marker, settings.json hook dialect, enableAgents, and no Claude-only hooks.
  - Conditional live binary checks with explicit version/path skip behavior.
affects: [phase-08, smoke-tests, runtime-parity, installer]
tech-stack:
  added: []
  patterns: [tmpdir install smoke, binary version probe, Claude identity fixture baseline]
key-files:
  created:
    - tests/fixtures/runtime-parity/claude/oto-executor.expected.md
    - tests/fixtures/runtime-parity/claude/oto-progress.expected.md
    - tests/fixtures/runtime-parity/claude/test-driven-development.expected.md
  modified:
    - tests/phase-08-claude-identity.test.cjs
    - tests/phase-08-smoke-codex.integration.test.cjs
    - tests/phase-08-smoke-gemini.integration.test.cjs
key-decisions:
  - "Claude fixtures are byte-identical copies of the source files so future adapter changes cannot silently cross-contaminate Claude behavior."
  - "External runtime binaries are optional in CI: install smoke always runs, live invocation skips with an explicit version/path reason."
  - "Gemini live invocation requires `gemini >= 0.38`; the local 0.26.0 binary correctly triggered a skip while install-shape tests still passed."
patterns-established:
  - "Runtime smoke tests should verify real filesystem output from `bin/install.js`, not only adapter unit behavior."
  - "Tmpdir tests must clean up with `t.after()` and a post-run leftover check."
requirements-completed: [MR-04]
duration: 6min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 06 Summary

**Runtime smoke layer and Claude identity baseline**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-02T21:28:40Z
- **Completed:** 2026-05-02T21:34:24Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Captured Claude fixture goldens for `oto-executor`, `/oto-progress`, and `oto:test-driven-development`.
- Replaced the Claude identity todo stubs with byte-equality tests for `transformAgent`, `transformCommand`, and `transformSkill`, plus a fixture leak check.
- Replaced the Codex smoke todo stubs with tmpdir install tests that assert command files, install state, AGENTS.md marker, config.toml hook marker, and `oto-executor.toml` sandbox mode.
- Replaced the Gemini smoke todo stubs with tmpdir install tests that assert command files, install state, GEMINI.md marker, `experimental.enableAgents`, Gemini hook event names, converted matchers, no `statusLine`, and no Claude hook event names.
- Added live runtime invocation probes: Codex ran locally on `codex-cli 0.128.0`; Gemini live invocation skipped because local `gemini` is `0.26.0`, below the `0.38` gate.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock Claude identity baseline** - `86c70db` (test)
2. **Tasks 2-3: Add Codex/Gemini runtime smoke harnesses** - `4d132d4` (test)

## Files Created/Modified

- `tests/phase-08-claude-identity.test.cjs` - Real Claude identity and fixture leak tests.
- `tests/fixtures/runtime-parity/claude/*` - Claude byte-identical fixture goldens.
- `tests/phase-08-smoke-codex.integration.test.cjs` - Codex tmpdir install and live-binary smoke tests.
- `tests/phase-08-smoke-gemini.integration.test.cjs` - Gemini tmpdir install and live-binary smoke tests.

## Decisions Made

- Used the actual command layout `oto/commands/oto/progress.md` for the Claude fixture instead of the older flat path shown in the plan text.
- Split Codex and Gemini smoke coverage into install-shape tests plus optional live invocation so CI can remain green without requiring every external CLI binary.

## Deviations from Plan

### Auto-fixed Issues

**1. Gemini local binary below the live-subagent-support gate**
- **Found during:** `node --test tests/phase-08-smoke-gemini.integration.test.cjs`.
- **Issue:** Local `gemini --version` returned `0.26.0`, below the plan gate of `0.38`.
- **Fix:** The live invocation test correctly skipped with `gemini v0.26.0 < required v0.38`; install-shape tests still ran and passed.
- **Files modified:** None beyond planned test harness behavior.

**2. Dry-run report side effects**
- **Found during:** Full `npm test`.
- **Issue:** The dry-run report tests rewrote `reports/rebrand-dryrun.*`.
- **Fix:** Restored both generated report files before staging closeout commits.
- **Files modified:** None retained.

## Verification

- `node --test tests/phase-08-claude-identity.test.cjs` passed: 4 passing, 0 failures, 0 todos.
- `diff oto/agents/oto-executor.md tests/fixtures/runtime-parity/claude/oto-executor.expected.md` returned empty.
- `diff oto/commands/oto/progress.md tests/fixtures/runtime-parity/claude/oto-progress.expected.md` returned empty.
- `diff oto/skills/test-driven-development/SKILL.md tests/fixtures/runtime-parity/claude/test-driven-development.expected.md` returned empty.
- `node --test tests/phase-08-smoke-codex.integration.test.cjs` passed: 4 passing, 0 failures, 0 todos.
- `node --test tests/phase-08-smoke-gemini.integration.test.cjs` passed: 3 passing, 1 skipped for local Gemini version, 0 failures, 0 todos.
- `node --test tests/phase-08-claude-identity.test.cjs tests/phase-08-smoke-codex.integration.test.cjs tests/phase-08-smoke-gemini.integration.test.cjs` passed: 11 passing, 1 skipped, 0 failures, 0 todos.
- `rg -n "test\\.todo" tests/phase-08-claude-identity.test.cjs tests/phase-08-smoke-codex.integration.test.cjs tests/phase-08-smoke-gemini.integration.test.cjs` returned no matches.
- Tmpdir leftover check for `oto-smoke-codex-*` and `oto-smoke-gemini-*` returned empty.
- `npm test` passed: 349 tests total, 348 passing, 1 skipped, 0 failures, 0 todos.

## User Setup Required

None for automated verification. To exercise the Gemini live invocation path locally, upgrade Gemini CLI to `0.38` or newer.

## Next Phase Readiness

All Phase 8 plan tests are now real assertions, with zero remaining todo tests in the full suite. Phase-level verification and completion can proceed.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
