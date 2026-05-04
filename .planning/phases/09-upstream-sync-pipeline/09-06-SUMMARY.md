---
phase: 09-upstream-sync-pipeline
plan: 06
subsystem: cli
tags: [oto-sync, dispatcher, dry-run, apply, upstream-sync]
requires:
  - phase: 09-upstream-sync-pipeline
    provides: 09-05 sync stage scripts
  - phase: 09-upstream-sync-pipeline
    provides: 09-04 accept helpers
provides:
  - `bin/lib/sync-cli.cjs` user-facing sync dispatcher
  - `bin/install.js` sync subcommand routing
  - End-to-end dry-run and apply tests against the bare upstream fixture
affects: [installer, sync-cli, rebrand-engine, sync-merge]
tech-stack:
  added: []
  patterns: [subcommand dispatch before install arg parsing, tmpdir dry-run, staged subprocess orchestration]
key-files:
  created:
    - bin/lib/sync-cli.cjs
  modified:
    - bin/install.js
    - bin/lib/sync-merge.cjs
    - bin/lib/sync-pull.cjs
    - scripts/rebrand/lib/engine.cjs
    - tests/phase-03-help-output.test.cjs
    - tests/phase-09-cli.integration.test.cjs
key-decisions:
  - "Default full sync is dry-run; `--apply` is required to write auto-merged output into `oto/`."
  - "Persistent apply sync rotates `.oto-sync/rebranded/<upstream>/current` to `prior` before rebranding the new current snapshot."
patterns-established:
  - "`oto sync` uses the installer bin as a thin dispatcher while keeping sync behavior testable in `bin/lib/sync-cli.cjs`."
requirements-completed: [SYN-01, SYN-02, SYN-03, SYN-04, SYN-05, SYN-06, SYN-07]
duration: 45min
completed: 2026-05-04
---

# Phase 09 Plan 06 Summary

**`oto sync` is now wired as the user-facing command for dry-run/apply upstream sync, conflict acceptance, deletion handling, and status reporting.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-05-04T19:35:00Z
- **Completed:** 2026-05-04T20:20:00Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Implemented `bin/lib/sync-cli.cjs` with `runSync`, `parseSyncArgs`, `runStatus`, and `runFullSync`.
- Patched `bin/install.js` to dispatch `oto sync ...` before install/uninstall argument parsing.
- Added help text for sync dry-run/apply/status/accept commands while preserving the existing install flow.
- Added dry-run temp snapshot handling so default sync avoids writing to `oto/`.
- Added apply-mode rebranded snapshot rotation, enabling true prior/current 3-way merges across consecutive syncs.
- Added end-to-end CLI tests for parser behavior, bin dispatch, dry-run no-write behavior, two-pull apply behavior, status counts, git-version parsing, and ref injection rejection.

## Task Commits

1. **Task 1-2: Implement sync CLI and installer dispatch** - `e0b5e6f`
2. **Task 3: Fill sync CLI integration tests** - `c8de6fc`

## Files Created/Modified

- `bin/lib/sync-cli.cjs` - Sync subcommand parser, dispatcher, full-sync chain, and status output.
- `bin/install.js` - Sync subcommand dispatch plus help text.
- `bin/lib/sync-merge.cjs` - Apply-mode writes inventoried upstream additions.
- `bin/lib/sync-pull.cjs` - Injectable git version runner for testable version parsing.
- `scripts/rebrand/lib/engine.cjs` - Allows macOS realpath form of `os.tmpdir()` for sync dry-run outputs.
- `tests/phase-03-help-output.test.cjs` - Help text line budget updated for the sync section.
- `tests/phase-09-cli.integration.test.cjs` - Real integration coverage for D-19, SYN-07, Pitfall 9, and T-09-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Dry-run portability] macOS tmpdir realpath guard**
- **Found during:** CLI dry-run integration
- **Issue:** The rebrand engine compared outputs against `/var/...` from `os.tmpdir()`, while child process paths resolved to `/private/var/...` on macOS.
- **Fix:** Allowed both canonical and realpath forms of the repo root and tmpdir.
- **Committed in:** `e0b5e6f`

**2. [Apply semantics] Inventoried upstream additions needed to write on `--apply`**
- **Found during:** SYN-07 apply integration
- **Issue:** The merge helper surfaced inventoried additions as sidecars even in apply mode, leaving expected new upstream files absent from `oto/`.
- **Fix:** In apply mode, inventoried `added` results now write to `oto/`; dry-run behavior still reports additions without writing.
- **Committed in:** `e0b5e6f`

**3. [Parser hardening] Option-like refs rejected before `parseArgs` ambiguity**
- **Found during:** acceptance verification
- **Issue:** `--to --upload-pack=evil` is rejected by `parseArgs` before reaching `validateRef`, giving the wrong diagnostic path.
- **Fix:** Added a pre-parse `--to` guard that sends option-like refs through `validateRef`.
- **Committed in:** `e0b5e6f`

---

**Total deviations:** 3 auto-fixed.
**Impact on plan:** Strengthened the actual dry-run/apply path and preserved the intended security diagnostics.

## Verification

- `node --test --test-concurrency=4 tests/phase-09-cli.integration.test.cjs` passed: 7 pass, 0 fail.
- `node --test tests/phase-03-help-output.test.cjs` passed: 9 pass, 0 fail.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed: 45 pass, 0 fail, 0 todo.
- `npm test` passed: 393 pass, 1 skipped, 0 fail, 0 todo.
- `node bin/install.js sync --status` exits 0 and prints sync status.

## Next Phase Readiness

All Phase 9 planned test TODOs are removed. Phase is ready for code review, verification, and closeout gates.

## Self-Check: PASSED

All 09-06 checks were run, and unrelated dirty files were not staged or committed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
