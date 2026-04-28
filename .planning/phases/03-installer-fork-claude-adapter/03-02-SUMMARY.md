---
phase: 03-installer-fork-claude-adapter
plan: 02
subsystem: installer
tags: [node-test, installer, cli-args, runtime-detection]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: Wave 0 TODO scaffolds for args and runtime detection
provides:
  - Runtime-agnostic CLI argument parser with conflict validation
  - Descriptor-based config-dir resolver with POSIX tilde expansion
  - Presence-only runtime detection for Claude, Codex, and Gemini config dirs
affects: [phase-03-installer, phase-03-install-shell, phase-03-install-all]

tech-stack:
  added: []
  patterns:
    - "CommonJS bin/lib modules with explicit module.exports"
    - "node:util.parseArgs for strict zero-dependency CLI parsing"
    - "node:test filesystem fixtures under os.tmpdir()"

key-files:
  created:
    - bin/lib/args.cjs
    - bin/lib/runtime-detect.cjs
  modified:
    - tests/phase-03-args.test.cjs
    - tests/phase-03-runtime-detect.test.cjs

key-decisions:
  - "Config-dir resolution remains descriptor-based: flag, then adapter env var, then adapter default segment."
  - "Runtime detection is presence-only and checks only claude/codex/gemini default config directories."

patterns-established:
  - "TDD RED commits replace Wave 0 TODO tests before implementation commits add helper modules."
  - "Shared installer helpers must avoid runtime-name conditionals and read adapter descriptor fields instead."

requirements-completed: [INS-01, INS-03, INS-06]

duration: 5 min
completed: 2026-04-28
---

# Phase 03 Plan 02: Args and Runtime Detection Summary

**Runtime-agnostic installer argument parsing and presence-only supported-runtime detection for Wave 1.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-28T22:22:10Z
- **Completed:** 2026-04-28T22:26:25Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Added `bin/lib/args.cjs` exporting `parseCliArgs`, `resolveConfigDir`, `expandTilde`, and `ArgError`.
- Added `bin/lib/runtime-detect.cjs` exporting `detectPresentRuntimes`, `SUPPORTED_RUNTIMES`, and `DEFAULT_SEGMENTS`.
- Replaced the 10 Wave 0 TODO tests across the arg and runtime-detection suites with real assertions.

## Task Commits

1. **Task 1 RED: add failing args helper tests** - `31c0bb7` (test)
2. **Task 1 GREEN: implement args helper module** - `d452b69` (feat)
3. **Task 2 RED: add failing runtime detection tests** - `a47d404` (test)
4. **Task 2 GREEN: implement runtime detection helper** - `bfa2e2b` (feat)

## Files Created/Modified

- `bin/lib/args.cjs` - Strict `node:util.parseArgs` wrapper, arg conflict validation, typed return object, config resolver, tilde expansion, and `ArgError`.
- `bin/lib/runtime-detect.cjs` - Supported runtime constants and `fs.statSync(...).isDirectory()` based runtime presence detection.
- `tests/phase-03-args.test.cjs` - Seven real tests covering resolution order, default Claude runtime, help, conflict exits, tilde expansion, and multi-runtime flags.
- `tests/phase-03-runtime-detect.test.cjs` - Three real tests covering directory presence, empty homes, supported runtime constants, and ignoring unsupported config dirs.

## Verification

- `node --test tests/phase-03-args.test.cjs` - PASS, 7 tests, 0 TODO.
- `node --test tests/phase-03-runtime-detect.test.cjs` - PASS, 3 tests, 0 TODO.
- `node --test tests/phase-03-args.test.cjs tests/phase-03-runtime-detect.test.cjs` - PASS, 10 tests, 0 TODO.
- `grep -rE "if \(runtime ===" bin/lib/args.cjs bin/lib/runtime-detect.cjs` - PASS, 0 hits.
- `git diff HEAD -- package.json` - PASS, no dependency changes.
- `rg -n "todo|t\.todo" tests/phase-03-args.test.cjs tests/phase-03-runtime-detect.test.cjs` - PASS, 0 hits.

## Decisions Made

- Kept `--config-dir` normalization in `parseCliArgs` as `path.resolve(expandTilde(value))`, so `~/...` expands before absolute-path normalization.
- Kept env-var resolution in `resolveConfigDir` to tilde expansion only, matching the plan algorithm.
- Used `fs.statSync(dir).isDirectory()` rather than `fs.existsSync()` so a file at `~/.claude` does not count as an installed runtime.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed. **Impact on plan:** No scope change.

## Issues Encountered

None.

## Known Stubs

None. The stub scan only found local accumulator arrays inside implementation code; these do not flow to UI rendering or mock a data source.

## Threat Flags

None. The argv and environment-variable trust boundaries are the expected surfaces from the plan threat model; no additional security-relevant surface was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-03-PLAN.md`. Marker and install-state helpers can now consume the shared argument/config resolution behavior and supported runtime constants.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-installer-fork-claude-adapter/03-02-SUMMARY.md`.
- Created implementation files exist: `bin/lib/args.cjs`, `bin/lib/runtime-detect.cjs`.
- Task commits found in git history: `31c0bb7`, `d452b69`, `a47d404`, `bfa2e2b`.

---
*Phase: 03-installer-fork-claude-adapter*
*Completed: 2026-04-28*
