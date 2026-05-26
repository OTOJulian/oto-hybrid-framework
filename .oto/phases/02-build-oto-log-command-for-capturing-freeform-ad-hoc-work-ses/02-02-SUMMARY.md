---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
plan: 02
subsystem: cli-library
tags: [node-test, oto-log, cjs, frontmatter, git-evidence]

requires:
  - phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
    provides: "Plan 02-01 RED tests and fixtures for /oto-log"
provides:
  - "oto/bin/lib/log.cjs with slug, routing, git evidence, log writes, sessions, listing, showing, and promotion helpers"
  - "Library-level closure for D-01, D-02, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-18, D-19, D-20, D-21"
  - "Plan 03 handoff for CLI dispatch, command markdown, progress/resume surfaces, and .gitignore active-session entry"
affects: [oto-log, oto-tools, command-surface, progress, resume-work]

tech-stack:
  added: []
  patterns:
    - "CJS library using node:util.parseArgs, node:child_process.spawnSync, and in-repo frontmatter/core helpers"
    - "Exclusive-create log writes with fs.openSync(path, 'wx') and collision suffixes"
    - "DATA_START/DATA_END wrapping around git evidence"

key-files:
  created:
    - oto/bin/lib/log.cjs
  modified: []

key-decisions:
  - "Kept log.cjs pure I/O; it does not call oto-tools commit or wire CLI dispatch."
  - "Preserved the explicit no-.gitignore-edit boundary; the active-session gitignore assertion remains Plan 03-owned."
  - "Added a local frontmatter compatibility wrapper inside log.cjs because the existing helper returns raw objects while the RED tests expect frontmatter/body envelopes and boolean/null coercion."

patterns-established:
  - "Log frontmatter is written through spliceFrontmatter with null serialized as null text and coerced back on read."
  - "Promotion to todo scans both pending and completed todo dirs before assigning NNN IDs."

requirements-completed: [D-01, D-02, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-18, D-19, D-20, D-21]

duration: 8 min
completed: 2026-05-06
---

# Phase 02 Plan 02: /oto-log Library Summary

**CJS /oto-log library with append-only log writes, git evidence capture, session lifecycle, listing/showing, and quick/todo promotion targets.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T19:16:56Z
- **Completed:** 2026-05-06T19:24:56Z
- **Tasks:** 1 completed
- **Files modified:** 1 implementation file plus this summary

## Accomplishments

- Created `oto/bin/lib/log.cjs` with the 10 required exports: `deriveLogSlug`, `routeSubcommand`, `captureEvidence`, `writeLogEntry`, `startSession`, `endSession`, `listLogs`, `showLog`, `promoteLog`, and `main`.
- Implemented git-bounded evidence capture with `DATA_START`/`DATA_END` markers, 8KB diff cap, relative `files_touched`, and graceful non-git fallback.
- Implemented append-only `.oto/logs/{YYYYMMDD-HHmm}-{slug}.md` writes with exclusive-create collision suffixes.
- Implemented session start/end state via `.oto/logs/.active-session.json`, including auto-ending a prior session.
- Implemented list/show parsing and promotion to `.oto/quick/.../PLAN.md` or `.oto/todos/pending/{NNN}-{slug}.md`.

## Task Commits

1. **Task 1: Implement oto/bin/lib/log.cjs** - `f48c6c9` (feat)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `oto/bin/lib/log.cjs` - New log capture library and CLI entrypoint implementation.
- `.planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-02-SUMMARY.md` - Execution summary and handoff.

## Verification

- RED pre-check: `node --test --test-concurrency=4 tests/log-slug.test.cjs tests/log-frontmatter.test.cjs tests/log-write.test.cjs tests/log-evidence.test.cjs tests/log-session.test.cjs tests/log-subcommand.test.cjs tests/log-list.test.cjs tests/log-show.test.cjs tests/log-promote.test.cjs` failed 38/38 because `oto/bin/lib/log.cjs` was missing.
- Library behavioral slice: `node --test --test-concurrency=4 tests/log-slug.test.cjs tests/log-frontmatter.test.cjs tests/log-write.test.cjs tests/log-evidence.test.cjs tests/log-subcommand.test.cjs tests/log-list.test.cjs tests/log-show.test.cjs tests/log-promote.test.cjs` passed 34/34.
- Full requested 9-file slice now passes 37/38; the only remaining failure is `D-12 .gitignore contains .oto/logs/.active-session.json pattern`, which requires the explicitly forbidden `.gitignore` edit and is listed below as deferred to Plan 03.
- Reserved Plan 03 surface check: `node --test tests/log-cli.test.cjs tests/log-command-md.test.cjs tests/log-surfaces.test.cjs` exited non-zero as expected with missing `oto-tools log`, public `oto log`, command markdown, progress, and resume surfaces.
- Regression baseline: `node --test --test-concurrency=4 tests/migrate-idempotent.test.cjs tests/migrate-instructions.test.cjs tests/migrate-command-md.test.cjs tests/migrate-cli.test.cjs tests/migrate-helpers.test.cjs tests/migrate-rename-map.test.cjs tests/migrate-state-frontmatter.test.cjs tests/migrate-dry-run.test.cjs tests/migrate-conflict.test.cjs tests/migrate-detect.test.cjs tests/migrate-apply.test.cjs` passed 26/26.
- `tests/frontmatter*.test.cjs` currently has no matching files in this repository; the initial shell glob failed with `zsh: no matches found`.

## Decisions Made

- Did not modify `oto/bin/lib/oto-tools.cjs`, `bin/install.js`, `oto/commands/oto/log.md`, `oto/workflows/progress.md`, `oto/workflows/resume-project.md`, or `.gitignore`.
- Used direct CJS imports of `./frontmatter.cjs` and `./core.cjs`; no `oto-sdk query` subprocesses are used inside the library.
- Kept commit creation outside `log.cjs`; Plan 03 markdown/dispatch flow remains responsible for committing generated log artifacts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added frontmatter compatibility inside log.cjs**
- **Found during:** Task 1 implementation
- **Issue:** The plan/test contract expected `extractFrontmatter(content)` to expose `{ frontmatter, body }` and parse `false`/`null` into native values, but the existing helper returns the raw frontmatter object with string scalar values.
- **Fix:** Installed a local compatibility wrapper from `log.cjs` that preserves direct-field access while adding non-enumerable `.frontmatter` and `.body` properties and scalar coercion.
- **Files modified:** `oto/bin/lib/log.cjs`
- **Verification:** `tests/log-frontmatter.test.cjs`, `tests/log-list.test.cjs`, `tests/log-show.test.cjs`, and `tests/log-promote.test.cjs` pass in the behavioral slice.
- **Committed in:** `f48c6c9`

**2. [Rule 1 - Bug] Matched RED fixture timestamp and slug edge cases**
- **Found during:** Task 1 GREEN iteration
- **Issue:** The RED fixtures pass UTC `Date` objects and expect `YYYYMMDD-HHmm` from the UTC minute; slug fixtures also require preserving short-title articles while dropping interior articles only when needed to fill the four-word title contract.
- **Fix:** `timestampParts()` formats `Date` inputs using UTC fields, and slug derivation now follows the observed RED contract while todo promotion uses the longer question slug expected by D-20 tests.
- **Files modified:** `oto/bin/lib/log.cjs`
- **Verification:** `tests/log-slug.test.cjs`, `tests/log-frontmatter.test.cjs`, and `tests/log-promote.test.cjs` pass in the behavioral slice.
- **Committed in:** `f48c6c9`

---

**Total deviations:** 2 auto-fixed (1 blocking issue, 1 bug)
**Impact on plan:** Both were required to satisfy the already-committed RED contract without editing tests or unrelated helpers.

## Deferred Issues

- `tests/log-session.test.cjs` includes a `.gitignore` assertion for `.oto/logs/.active-session.json`, but Plan 02-02 and the operator success criteria explicitly forbid `.gitignore` edits. Plan 03 already owns the `.gitignore` entry alongside command markdown and dispatch surface work.

## Known Stubs

- `oto/bin/lib/log.cjs:566` writes `TBD` into generated todo `## Solution` sections. This is intentional and matches the promotion target shape from the plan; promoted todos are seed artifacts for later refinement.

## Threat Flags

None. The new filesystem and `git` surfaces are exactly the surfaces listed in the plan threat model and are mitigated with path construction under `planningDir(cwd)`, `fs.openSync(path, 'wx')`, `atomicWriteFileSync`, and 8KB evidence caps.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 should wire:

- `case 'log'` in `oto/bin/lib/oto-tools.cjs`
- `argv[0] === 'log'` in `bin/install.js`
- `oto/commands/oto/log.md`
- `oto/workflows/progress.md` Recent Activity
- `oto/workflows/resume-project.md` log-session hints
- `.gitignore` entry for `.oto/logs/.active-session.json`

## Self-Check: PASSED

- Found implementation file: `oto/bin/lib/log.cjs`
- Found summary file: `.planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-02-SUMMARY.md`
- Found Task 1 commit: `f48c6c9`
- Confirmed no tracked deletions in Task 1 commit.

---
*Phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses*
*Completed: 2026-05-06*
