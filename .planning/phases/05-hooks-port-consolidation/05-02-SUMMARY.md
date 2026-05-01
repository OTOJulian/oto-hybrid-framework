---
phase: 05-hooks-port-consolidation
plan: 02
subsystem: hooks
tags: [node-test, hooks, token-substitution, build-hooks, hk-07]

requires:
  - phase: 05-hooks-port-consolidation
    provides: 05-01 Wave 0 test scaffolds for HK-07
provides:
  - HK-07 token substitution helpers for install-time hook version replacement
  - Retargeted hook build script for oto/hooks/ to oto/hooks/dist/
  - Executable-bit preservation for bash hook outputs
  - Passing non-todo HK-07 tests for token substitution and build output
affects: [phase-05, hooks, installer, runtime-claude, tests]

tech-stack:
  added: []
  patterns:
    - CommonJS helper exports for install-time token substitution
    - Testable build-hooks function with CLI wrapper preserved
    - node:test RED/GREEN task commits

key-files:
  created:
    - .planning/phases/05-hooks-port-consolidation/05-02-SUMMARY.md
  modified:
    - .gitignore
    - bin/lib/copy-files.cjs
    - scripts/build-hooks.js
    - tests/05-token-substitution.test.cjs
    - tests/05-build-hooks.test.cjs
    - tests/phase-02-build-hooks.test.cjs

key-decisions:
  - "Keep hook sources and oto/hooks/dist/ template-pristine; {{OTO_VERSION}} substitution remains install-time only."
  - "Ignore oto/hooks/dist/ as generated output, matching the existing hooks/dist/ pattern."
  - "Expose scripts/build-hooks.js::build for isolated regression tests while preserving CLI behavior."

patterns-established:
  - "applyTokensToTree(rootDir, replacements) walks a copied hook tree and substitutes only allowlisted hook-like files."
  - "shouldSubstitute(relPath) blocks foundation-frameworks/, __fixtures__/, and LICENSE* paths before extension/name allowlisting."
  - "build-hooks regression tests use temporary hook trees instead of mutating canonical oto/hooks/."

requirements-completed: [HK-07]

duration: 11 min
completed: 2026-05-01
---

# Phase 05 Plan 02: Hook Token Substitution and Build Retarget Summary

**HK-07 foundation with install-time token helpers and a retargeted oto/hooks build pipeline that emits six executable hook files**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-01T19:24:03Z
- **Completed:** 2026-05-01T19:35:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `tokenReplace`, `shouldSubstitute`, `applyTokensToTree`, and `copyTreeWithTokens` exports without changing existing `copyTree`, `removeTree`, `sha256File`, or `walkTree` signatures.
- Replaced the HK-07 token-substitution todo scaffold with real tests for replacement, round-trip behavior, package semver shape, and deny-list policy.
- Retargeted `scripts/build-hooks.js` from legacy top-level `hooks/` to canonical `oto/hooks/`, including extensionless `oto-session-start` and bash-hook chmod.
- Replaced the HK-07 build-hooks todo scaffold with real tests for six-file dist output, executable bits, token preservation, and idempotent builds.
- Kept generated `oto/hooks/dist/` out of git status with an explicit `.gitignore` entry.

## Task Commits

Each task was committed atomically, with TDD RED/GREEN commits:

1. **Task 1 RED: Token substitution coverage** - `6f91b9c` (test)
2. **Task 1 GREEN: Token substitution helpers** - `8d508bd` (feat)
3. **Task 2 RED: Build-hooks coverage** - `360f599` (test)
4. **Task 2 GREEN: Build pipeline retarget** - `54ef12f` (feat)
5. **Verification fix: Phase 2 regression alignment** - `878914a` (test)
6. **Verification fix: Parallel-safe build-hooks regression tests** - `e74fef7` (fix)

## Files Created/Modified

- `.gitignore` - Ignores generated `oto/hooks/dist/` output.
- `bin/lib/copy-files.cjs` - Adds token substitution helpers and exports them alongside existing copy utilities.
- `scripts/build-hooks.js` - Builds from `oto/hooks/` into `oto/hooks/dist/`, exports `build()` for isolated tests, and preserves CLI behavior.
- `tests/05-token-substitution.test.cjs` - Real HK-07 token substitution and deny-list assertions.
- `tests/05-build-hooks.test.cjs` - Real HK-07 build output and executable-bit assertions.
- `tests/phase-02-build-hooks.test.cjs` - Existing regression tests updated to use temp hook trees after the Phase 5 retarget.

## Verification

- `node --test tests/05-token-substitution.test.cjs` - PASS, 2 pass / 0 fail / 0 todo.
- `node scripts/build-hooks.js` - PASS, `Build complete (6 hooks).`
- `node --test tests/05-build-hooks.test.cjs` - PASS, 1 pass / 0 fail / 0 todo.
- `node --test tests/05-token-substitution.test.cjs tests/05-build-hooks.test.cjs` - PASS, 3 pass / 0 fail / 0 todo.
- `node --test tests/phase-02-build-hooks.test.cjs tests/05-token-substitution.test.cjs tests/05-build-hooks.test.cjs` - PASS, 6 pass / 0 fail / 0 todo.
- `npm test` - PASS, 235 tests: 232 pass / 0 fail / 3 todo.
- `git status --short -- hooks` - PASS, legacy top-level `hooks/` has no tracked or untracked modifications.

## Decisions Made

- Kept substitution out of `scripts/build-hooks.js`; build output remains template-pristine for Wave 3 install-time replacement.
- Added `oto/hooks/dist/` to `.gitignore` rather than committing generated hook output.
- Exported `build()` from `scripts/build-hooks.js` so regression tests can exercise syntax validation and copy behavior in temporary directories without racing the canonical `oto/hooks/` build.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ignored generated oto/hooks/dist output**
- **Found during:** Task 2 (Retarget scripts/build-hooks.js to oto/hooks/)
- **Issue:** Running the retargeted build created `oto/hooks/dist/` as untracked generated output; the repo already ignored only the legacy `hooks/dist/`.
- **Fix:** Added `oto/hooks/dist/` to `.gitignore`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short -- oto/hooks/dist` reports no untracked generated files after `node scripts/build-hooks.js`.
- **Committed in:** `54ef12f`

**2. [Rule 1 - Bug] Updated stale build-hooks regression tests after retarget**
- **Found during:** Plan-level full-suite verification after Task 2
- **Issue:** Existing Phase 2 tests still expected `scripts/build-hooks.js` to read/write the legacy top-level `hooks/` tree, causing `npm test` failures after the intentional Phase 5 retarget.
- **Fix:** Pointed regression coverage at the new behavior and then isolated those regression tests to temporary hook trees so they do not mutate canonical `oto/hooks/` during parallel test runs.
- **Files modified:** `scripts/build-hooks.js`, `tests/phase-02-build-hooks.test.cjs`
- **Verification:** `node --test tests/phase-02-build-hooks.test.cjs tests/05-token-substitution.test.cjs tests/05-build-hooks.test.cjs` passes; final `npm test` passes.
- **Committed in:** `878914a`, `e74fef7`

---

**Total deviations:** 2 auto-fixed (1 blocking generated-output issue, 1 stale-test bug)
**Impact on plan:** Both fixes were directly caused by the build retarget and were required to keep the suite green and the working tree clean. No architecture change or scope creep beyond HK-07 support.

## Issues Encountered

- `.planning/phases/05-hooks-port-consolidation/05-VALIDATION.md` references `node scripts/run-tests.cjs --filter "05-"`, but this repo has no `scripts/run-tests.cjs`. Used the plan's explicit `node --test ...` commands and `npm test` instead.
- Initial full-suite run failed in `tests/phase-02-build-hooks.test.cjs` because those tests encoded the old top-level `hooks/` target; fixed as a directly caused regression.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None in files created or modified by this plan. Downstream Wave 2-4 todo tests from 05-01 remain intentionally owned by plans 05-03, 05-04, and 05-05.

## Next Phase Readiness

Ready for 05-03. Wave 2 can rely on `scripts/build-hooks.js` picking up `oto-session-start`; Wave 3 can wire `applyTokensToTree` into `bin/lib/install.cjs` for install-time `{{OTO_VERSION}}` substitution.

---
*Phase: 05-hooks-port-consolidation*
*Completed: 2026-05-01*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-hooks-port-consolidation/05-02-SUMMARY.md`.
- Key modified files exist: `bin/lib/copy-files.cjs`, `scripts/build-hooks.js`, `tests/05-token-substitution.test.cjs`, `tests/05-build-hooks.test.cjs`.
- Task and verification commits exist in git history: `6f91b9c`, `8d508bd`, `360f599`, `54ef12f`, `878914a`, `e74fef7`.
- Final verification passed: `node --test tests/05-token-substitution.test.cjs tests/05-build-hooks.test.cjs` and `npm test`.
