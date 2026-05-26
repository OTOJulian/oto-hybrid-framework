---
phase: 03-installer-fork-claude-adapter
plan: 06
subsystem: installer
tags: [node-test, installer, orchestrator, integration, path-containment]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: Args, runtime detection, marker, install-state, copy-files, and runtime adapter helpers
provides:
  - Adapter-injected installRuntime, uninstallRuntime, installAll, and uninstallAll orchestrator API
  - Runtime path-containment guard around state-derived deletion paths
  - 21 real install integration tests for Claude, Codex, Gemini, and --all
affects: [phase-03-installer, phase-03-bin-shell, phase-05-hooks, phase-08-runtime-parity]

tech-stack:
  added: []
  patterns:
    - "CommonJS async orchestrator functions composed from descriptor adapters"
    - "State file remains the install commit point after all other installer I/O"
    - "Integration tests use real os.tmpdir() fixtures and no mock filesystem"

key-files:
  created:
    - bin/lib/install.cjs
  modified:
    - tests/phase-03-install-claude.integration.test.cjs
    - tests/phase-03-install-codex.integration.test.cjs
    - tests/phase-03-install-gemini.integration.test.cjs
    - tests/phase-03-install-all.integration.test.cjs

key-decisions:
  - "installAll uses opts.homeDir both for runtime detection and, when present, for per-adapter configDir resolution."
  - "installRuntime records only files that exist in the source manifest, so stale target files do not survive in new state.files."

patterns-established:
  - "Orchestrator runtime differences are adapter fields and hook calls, not runtime-name branches."
  - "Every state-file-derived rm path is gated through assertWithin before deletion."
  - "Phase 3 empty payload is valid; integration tests assert installer plumbing rather than copied file count."

requirements-completed: [INS-02, INS-04, INS-05, INS-06]

duration: 8 min
completed: 2026-04-28
---

# Phase 03 Plan 06: Install Orchestrator Summary

**Adapter-driven install and uninstall orchestrator with path-containment deletion guards and 21 passing runtime integration tests.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-28T23:03:01Z
- **Completed:** 2026-04-28T23:10:46Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments

- Added `bin/lib/install.cjs` with `installRuntime`, `uninstallRuntime`, `installAll`, and `uninstallAll`.
- Implemented the D-09/D-10 lifecycle: resolve config dir, read prior state, adapter hooks, copy/transform/hash, prior-state diff cleanup, marker injection/removal, settings identity merge, state commit point, and post-install callbacks.
- Added `assertWithin` containment checks before state-derived file removals and purge removals.
- Replaced all Wave 0 integration TODOs for Claude, Codex, Gemini, and `--all` with real filesystem round-trip assertions.

## Integration Coverage Matrix

| Area | Coverage |
|------|----------|
| Claude | State file, marker injection, user-content preservation, reinstall idempotency, uninstall cleanup, regular-file copy check, success output |
| Codex | State file, `AGENTS.md` marker, `config.toml` identity merge, uninstall round-trip |
| Gemini | State file, `GEMINI.md` marker, `settings.json` identity merge, uninstall round-trip |
| `--all` | All three fake runtime dirs, absent-runtime skip, no-runtime exitCode 4, `--config-dir` parse rejection |

## Task Commits

1. **Task 1: Implement install orchestrator** - `7dfd1f6` (feat)
2. **Task 2: Fill Claude integration lifecycle tests** - `a2259a8` (test)
3. **Task 3: Fill Codex/Gemini/all integration tests** - `b134047` (test)

## Files Created/Modified

- `bin/lib/install.cjs` - Pure adapter-injected installer orchestration API with runtime detection, uninstall, `--all`, state commit point, and path-containment deletion guard.
- `tests/phase-03-install-claude.integration.test.cjs` - Nine Claude lifecycle tests replacing Wave 0 TODOs.
- `tests/phase-03-install-codex.integration.test.cjs` - Four Codex install/uninstall/settings tests replacing Wave 0 TODOs.
- `tests/phase-03-install-gemini.integration.test.cjs` - Four Gemini install/uninstall/settings tests replacing Wave 0 TODOs.
- `tests/phase-03-install-all.integration.test.cjs` - Four `--all` detection and error-path tests replacing Wave 0 TODOs.

## Decisions Made

- `installAll` derives per-runtime `configDir` from `opts.homeDir` when the test/runtime caller supplies a fake home. Without that, detection would find fake runtime dirs but installs would resolve through real `os.homedir()`.
- `installRuntime` filters copied manifests against the source tree before state recording. The existing `copyTree` helper walks the destination, so this prevents stale target files from being re-recorded and keeps the prior-state diff effective.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Applied opts.homeDir to install target resolution**
- **Found during:** Task 1 (Implement install orchestrator)
- **Issue:** The plan required `installAll` to honor `opts.homeDir`, but `resolveConfigDir` has no home-dir parameter and would otherwise resolve default installs under the real user home after fake-home detection.
- **Fix:** Added `withHomeDirConfig()` to synthesize an adapter-specific `flags.configDir` under `opts.homeDir` when no explicit config dir is present.
- **Files modified:** `bin/lib/install.cjs`
- **Verification:** `node --test tests/phase-03-install-all.integration.test.cjs` and the full 21-test integration command both pass; state files are written under fake `.claude`, `.codex`, and `.gemini` dirs.
- **Committed in:** `7dfd1f6`

**2. [Rule 1 - Bug] Prevented stale copied files from surviving state diff cleanup**
- **Found during:** Task 1 (Implement install orchestrator)
- **Issue:** `copyTree()` returns a walk of the destination after copy. If a future payload removes a file, a stale target file could be included in the new state and evade the prior-state deletion diff.
- **Fix:** `installRuntime` builds a source-file relpath set with `walkTree(srcAbs)` and records/transforms only destination files that correspond to current source files.
- **Files modified:** `bin/lib/install.cjs`
- **Verification:** `node --test tests/phase-03-install-*.integration.test.cjs` passes; code review confirms the diff uses the filtered `fileEntries` set.
- **Committed in:** `7dfd1f6`

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug). **Impact on plan:** Both changes preserve the planned API and are required for correct fake-home installs and future upgrade cleanup.

## Verification

- `node --test tests/phase-03-install-claude.integration.test.cjs tests/phase-03-install-codex.integration.test.cjs tests/phase-03-install-gemini.integration.test.cjs tests/phase-03-install-all.integration.test.cjs` - PASS, 21 tests, 0 TODO.
- `node --test tests/phase-03-*.test.cjs` - PASS, 94 tests, 0 fail, 19 expected Wave 4 TODOs.
- Export check - PASS, exactly `installAll,installRuntime,uninstallAll,uninstallRuntime`, all async functions.
- `grep -cE "if \(runtime ===" bin/lib/install.cjs` - PASS, 0 hits.
- `grep -c "process.exit" bin/lib/install.cjs` - PASS, 0 hits.
- `grep -F "assertWithin" bin/lib/install.cjs` - PASS, definition plus install, uninstall, and purge call sites.
- `grep -F "opts.homeDir" bin/lib/install.cjs` - PASS, override present.
- Tampered state traversal probe - PASS, `uninstallRuntime` refuses `../outside` with `refusing path-traversal escape`.
- `git diff -- package.json` - PASS, no dependency changes.

## Issues Encountered

- The full Phase 3 suite still contains 19 Wave 4 TODO tests for `03-07-PLAN.md`. This is expected and does not affect Plan 06's success criteria; the four Plan 06 integration files have zero TODOs.

## Known Stubs

None. Stub-pattern scan only found local accumulator arrays such as `fileEntries`, `results`, `logs`, and `writes`; these do not flow to UI rendering or mock an unwired data source.

## Threat Flags

None. The new filesystem trust boundary is the planned T-03-06-01 surface and is mitigated by `assertWithin` before state-derived deletion paths.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `03-07-PLAN.md`. The thin CLI shell can now call the orchestrator and replace the remaining Wave 4 TODO tests.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/03-installer-fork-claude-adapter/03-06-SUMMARY.md`.
- Created implementation file exists: `bin/lib/install.cjs`.
- Modified integration test files exist under `tests/`.
- Task commits found in git history: `7dfd1f6`, `a2259a8`, `b134047`.

---
*Phase: 03-installer-fork-claude-adapter*
*Completed: 2026-04-28*
