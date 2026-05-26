---
phase: 08-codex-gemini-runtime-parity
plan: 04
subsystem: gemini-runtime
tags: [gemini, runtime-parity, task-rewrite, settings-json, node-test]
requires:
  - phase: 08
    provides: 08-01 runtime parity fixture skeletons
  - phase: 08
    provides: 08-02 generated GEMINI.md baseline
provides:
  - Gemini tool-name mapping and matcher/event conversion helpers.
  - Gemini agent and command transforms.
  - Bare Task() rewrite with fenced-code preservation and adjacent-call grouping.
  - Gemini settings merge/unmerge with BeforeTool/AfterTool hooks.
  - experimental.enableAgents guard that honors explicit user false.
  - Gemini fixture goldens and real tests replacing plan-04 todo stubs.
affects: [phase-08, gemini-runtime, installer]
tech-stack:
  added: []
  patterns: [Gemini-native tool-name mapping, settings-json marker registry, fixture-golden parity tests]
key-files:
  created:
    - bin/lib/gemini-transform.cjs
    - tests/fixtures/runtime-parity/gemini/oto-executor.expected.md
    - tests/fixtures/runtime-parity/gemini/oto-progress.expected.toml
    - tests/fixtures/runtime-parity/gemini/test-driven-development.expected.md
  modified:
    - bin/lib/runtime-gemini.cjs
    - tests/phase-03-runtime-gemini.test.cjs
    - tests/phase-03-install-gemini.integration.test.cjs
    - tests/phase-08-gemini-toolmap.test.cjs
    - tests/phase-08-gemini-transform.test.cjs
    - tests/phase-08-gemini-settings.test.cjs
key-decisions:
  - "Gemini command transforms emit TOML content while preserving the existing installer file path behavior."
  - "Gemini skills remain identity transforms because the current retained skill fixture has no runtime-specific syntax."
  - "If `experimental.enableAgents` is explicitly false, Gemini settings preserve the false value and record an `_oto` skip marker instead of injecting hook entries."
patterns-established:
  - "Runtime helper source must avoid unwanted runtime bare-name literals because Phase 3 scans all `bin/` files."
  - "Gemini hooks reuse the Phase 5 settings marker pattern but map events and matchers to Gemini-native names."
requirements-completed: [MR-02, MR-03]
duration: 10min
completed: 2026-05-02
---

# Phase 08: Codex & Gemini Runtime Parity Plan 04 Summary

**Gemini parity port with agent/command transforms, Task rewrite, native hooks, and enableAgents guard**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-02T21:11:11Z
- **Completed:** 2026-05-02T21:20:56Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `bin/lib/gemini-transform.cjs` with Gemini tool-name mapping, agent conversion, command-to-TOML conversion, Task() rewrite, event rename, and matcher conversion.
- Wired `bin/lib/runtime-gemini.cjs` so Gemini installs now transform agents/commands and merge Gemini-native hook settings.
- Added `experimental.enableAgents` handling: write `true` when missing; preserve explicit `false` with a warning and `_oto` skip marker.
- Replaced the Gemini toolmap, transform, and settings todo tests with real assertions.
- Captured Gemini fixture goldens for `oto-executor`, `/oto-progress`, and `oto:test-driven-development`.
- Updated older Phase 3 Gemini runtime/install tests to assert Phase 8 parity behavior instead of identity stubs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author Gemini transform helpers + toolmap tests** - `7b6ea96` (feat)
2. **Task 2: Wire Gemini runtime adapter + legacy tests** - `42853c9` (feat)
3. **Task 2 fixtures/tests: Capture Gemini parity goldens** - `dbdd7d2` (test)

## Files Created/Modified

- `bin/lib/gemini-transform.cjs` - Gemini transform and hook-mapping helpers.
- `bin/lib/runtime-gemini.cjs` - Adapter wiring for transforms, settings merge, and unmerge.
- `tests/phase-03-runtime-gemini.test.cjs` - Updated prior stub expectations.
- `tests/phase-03-install-gemini.integration.test.cjs` - Updated install settings expectations.
- `tests/phase-08-gemini-toolmap.test.cjs` - Real Gemini tool/event/matcher mapping tests.
- `tests/phase-08-gemini-transform.test.cjs` - Real transform, Task rewrite, fixture, and production install tests.
- `tests/phase-08-gemini-settings.test.cjs` - Real settings merge/unmerge and enableAgents guard tests.
- `tests/fixtures/runtime-parity/gemini/*` - Gemini fixture goldens.

## Decisions Made

- Kept Gemini command output as TOML content at the existing copied command path. This avoids changing the shared installer path contract in a plan that scoped no installer rename hook.
- Added a production install assertion for `commands/oto/progress.md` content so the test covers the real `install.cjs` transform dispatch, not only direct adapter calls.

## Deviations from Plan

### Auto-fixed Issues

**1. Phase 3 unwanted-runtime scan caught a local variable named `cursor`**
- **Found during:** Full `npm test`.
- **Issue:** `tests/phase-03-no-unwanted-runtimes.test.cjs` scans `bin/` for bare names of unsupported runtimes and flagged the word `cursor` in the new helper.
- **Fix:** Renamed local variables from `cursor` to `offset`.
- **Files modified:** `bin/lib/gemini-transform.cjs`
- **Verification:** `node --test tests/phase-03-no-unwanted-runtimes.test.cjs ...` and full `npm test` passed.
- **Committed in:** `7b6ea96`

**2. Dry-run report side effects**
- **Found during:** Full `npm test`.
- **Issue:** The dry-run report tests rewrote `reports/rebrand-dryrun.*`.
- **Fix:** Restored both generated report files before staging commits.
- **Files modified:** None retained.

## Verification

- `node --test tests/phase-08-gemini-toolmap.test.cjs tests/phase-08-gemini-transform.test.cjs tests/phase-08-gemini-settings.test.cjs` passed: 21 passing, 0 failures, 0 todos.
- `node --test tests/phase-08-gemini-toolmap.test.cjs tests/phase-08-gemini-transform.test.cjs tests/phase-08-gemini-settings.test.cjs tests/phase-03-runtime-gemini.test.cjs tests/phase-03-install-gemini.integration.test.cjs tests/phase-03-no-runtime-conditionals.test.cjs` passed: 36 passing, 0 failures, 0 todos.
- `rg -n "test\\.todo" tests/phase-08-gemini-toolmap.test.cjs tests/phase-08-gemini-transform.test.cjs tests/phase-08-gemini-settings.test.cjs` returned no matches.
- `rg -n "// TODO Phase 5|// TODO Phase 8" bin/lib/runtime-gemini.cjs` returned no matches.
- `rg -n "gsd-|superpowers-|~/\\.gsd" bin/lib/gemini-transform.cjs tests/fixtures/runtime-parity/gemini` returned no matches.
- `rg -n "\\$\\{[A-Za-z_]\\w*\\}" tests/fixtures/runtime-parity/gemini/oto-executor.expected.md` returned no matches.
- `npm test` passed: 346 tests total, 332 passing, 14 todo, 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05 can build the generated runtime tool matrix from concrete Codex and Gemini runtime helper behavior.

---
*Phase: 08-codex-gemini-runtime-parity*
*Completed: 2026-05-02*
