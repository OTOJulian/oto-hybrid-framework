---
phase: 08-codex-gemini-runtime-parity
plan: 01
subsystem: testing
tags: [node-test, runtime-parity, fixtures, scaffold]
requires: []
provides:
  - Phase 8 node:test scaffold files for instruction, runtime matrix, Codex, Gemini, smoke, and Claude identity coverage.
  - Runtime parity fixture skeleton directories for Claude, Codex, and Gemini goldens.
affects: [phase-08, tests, runtime-parity]
tech-stack:
  added: []
  patterns: [todo-only node:test scaffold, runtime parity fixture layout]
key-files:
  created:
    - tests/phase-08-instruction-file-render.test.cjs
    - tests/phase-08-runtime-matrix-render.test.cjs
    - tests/phase-08-codex-transform.test.cjs
    - tests/phase-08-codex-toml.test.cjs
    - tests/phase-08-codex-profile.test.cjs
    - tests/phase-08-gemini-transform.test.cjs
    - tests/phase-08-gemini-toolmap.test.cjs
    - tests/phase-08-gemini-settings.test.cjs
    - tests/phase-08-smoke-codex.integration.test.cjs
    - tests/phase-08-smoke-gemini.integration.test.cjs
    - tests/phase-08-claude-identity.test.cjs
    - tests/fixtures/runtime-parity/claude/.gitkeep
    - tests/fixtures/runtime-parity/codex/.gitkeep
    - tests/fixtures/runtime-parity/gemini/.gitkeep
  modified: []
key-decisions:
  - "Kept all Phase 8 scaffold coverage as node:test test.todo calls so downstream plans can replace stubs without red tests."
patterns-established:
  - "Phase 8 behavior files start as todo-only scaffolds and preserve suite health until each runtime parity slice lands."
  - "Runtime parity goldens live under tests/fixtures/runtime-parity/{claude,codex,gemini}/."
requirements-completed: [MR-02, MR-03, MR-04]
duration: 5min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 01 Summary

**Todo-only Phase 8 node:test scaffold plus runtime parity fixture skeletons for downstream Codex/Gemini parity work**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-02T20:47:40Z
- **Completed:** 2026-05-02T20:50:35Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Created all 11 `tests/phase-08-*.test.cjs` files with decision-tagged `test.todo()` coverage.
- Created runtime parity fixture directories for Claude, Codex, and Gemini with committed `.gitkeep` placeholders.
- Verified the Phase 8 stub suite and the full repository test suite remain green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all 11 phase-08 test stub files** - `2aabf68` (test)
2. **Task 2: Create fixture skeleton directories for the three runtimes** - `c6471cc` (test)

## Files Created/Modified

- `tests/phase-08-instruction-file-render.test.cjs` - Instruction-file regen and fence validation scaffold.
- `tests/phase-08-runtime-matrix-render.test.cjs` - Runtime matrix regen and parity scaffold.
- `tests/phase-08-codex-transform.test.cjs` - Codex agent/command/skill transform scaffold.
- `tests/phase-08-codex-toml.test.cjs` - Codex TOML hook merge scaffold.
- `tests/phase-08-codex-profile.test.cjs` - Codex profile/model resolution scaffold.
- `tests/phase-08-gemini-transform.test.cjs` - Gemini transform scaffold.
- `tests/phase-08-gemini-toolmap.test.cjs` - Gemini tool-map scaffold.
- `tests/phase-08-gemini-settings.test.cjs` - Gemini settings merge scaffold.
- `tests/phase-08-smoke-codex.integration.test.cjs` - Codex smoke scaffold.
- `tests/phase-08-smoke-gemini.integration.test.cjs` - Gemini smoke scaffold.
- `tests/phase-08-claude-identity.test.cjs` - Claude identity baseline scaffold.
- `tests/fixtures/runtime-parity/claude/.gitkeep` - Claude golden directory placeholder.
- `tests/fixtures/runtime-parity/codex/.gitkeep` - Codex golden directory placeholder.
- `tests/fixtures/runtime-parity/gemini/.gitkeep` - Gemini golden directory placeholder.

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- `git add` required elevated execution because the sandbox could not create `.git/index.lock`; staging and commits then completed normally.

## Verification

- `node --test tests/phase-08-*.test.cjs` passed with 52 todos and 0 failures.
- `rg --files-without-match "require\\('node:test'\\)" tests/phase-08-*.test.cjs` returned no files.
- `rg -n "^test\\(" tests/phase-08-*.test.cjs` returned no real test bodies.
- `npm test` passed: 340 tests total, 288 passing, 52 todo, 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can replace `tests/phase-08-instruction-file-render.test.cjs` todos with real regen-diff assertions and can populate the single source-of-truth instruction-file pipeline.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
