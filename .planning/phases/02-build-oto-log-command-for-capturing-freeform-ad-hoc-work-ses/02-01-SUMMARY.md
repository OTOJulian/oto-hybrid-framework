---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
plan: 01
subsystem: testing
tags: [node-test, red-scaffold, oto-log, fixtures]

requires:
  - phase: 01-add-oto-migrate
    provides: "Wave 0 RED scaffold pattern and migrate CLI test precedent"
provides:
  - "RED node:test coverage for /oto-log decisions D-01 through D-22"
  - "Static fixture trees for log evidence, transcript, existing-log, and surface-history tests"
  - "Graceful deferred-require pattern for future oto/bin/lib/log.cjs implementation"
affects: [oto-log, progress, resume-work, command-markdown, cli-dispatch]

tech-stack:
  added: []
  patterns:
    - "node:test files require future implementation modules inside test() callbacks"
    - "Fixture mutations happen only in os.tmpdir()/oto-log-* copies"

key-files:
  created:
    - tests/log-slug.test.cjs
    - tests/log-frontmatter.test.cjs
    - tests/log-write.test.cjs
    - tests/log-evidence.test.cjs
    - tests/log-session.test.cjs
    - tests/log-subcommand.test.cjs
    - tests/log-list.test.cjs
    - tests/log-show.test.cjs
    - tests/log-promote.test.cjs
    - tests/log-surfaces.test.cjs
    - tests/log-cli.test.cjs
    - tests/log-command-md.test.cjs
    - tests/fixtures/log/
  modified: []

key-decisions:
  - "Kept Wave 0 RED-only: no oto/bin/lib/log.cjs, command markdown, dispatch, workflow, or .gitignore implementation was added."
  - "Tests fail by assertion from inside node:test callbacks, preserving loadability before implementation exists."

patterns-established:
  - "Decision-tagged test names map D-01 through D-22 to observable behavior."
  - "Fixture TODO strings are deliberate open-question data, not placeholders."

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22]

duration: 10 min
completed: 2026-05-06
---

# Phase 02 Plan 01: /oto-log RED Test Scaffold Summary

**RED node:test scaffold for /oto-log covering every locked decision, with static fixtures and no production implementation code.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-06T19:00:36Z
- **Completed:** 2026-05-06T19:10:30Z
- **Tasks:** 2 completed
- **Files modified:** 24 created or updated by this plan including this summary

## Accomplishments

- Added four fixture trees under `tests/fixtures/log/`: `git-repo/`, `transcript-samples/`, `existing-logs/`, and `mixed-history/`.
- Added 12 `tests/log-*.test.cjs` files with deferred `require(LOG_PATH)` calls inside `test()` callbacks.
- Verified the intended RED state: `node --test --test-concurrency=4 tests/log-*.test.cjs` exits non-zero with structured per-test assertion failures, not a runner-aborting module load crash.
- Verified the pre-existing migrate baseline still passes: `node --test tests/migrate-*.test.cjs` reported 26 pass, 0 fail.

## Task Commits

1. **Task 1: Build the four fixture trees under tests/fixtures/log/** - `0d586ad` (test)
2. **Task 2: Author the 12 tests/log-*.test.cjs files** - `691ffad` (test)

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `tests/fixtures/log/git-repo/` - Minimal copyable git fixture seed; tests initialize git in tmpdir.
- `tests/fixtures/log/transcript-samples/` - Transcript data with and without open-question trigger phrases.
- `tests/fixtures/log/existing-logs/` - Three frontmatter-bearing log entries for list/show/promote tests.
- `tests/fixtures/log/active-session.json` - Active session shape fixture for resume surface checks.
- `tests/fixtures/log/mixed-history/` - `.oto` project history combining one log and one phase summary.
- `tests/log-slug.test.cjs` - D-06, D-07, D-08 slug and subcommand helper contract.
- `tests/log-frontmatter.test.cjs` - D-05, D-09, D-11 evidence wrapping, collision suffix, and frontmatter contract.
- `tests/log-write.test.cjs` - D-04, D-10, D-21 write path, body sections, and phase association.
- `tests/log-evidence.test.cjs` - D-01, D-02 git-bounded evidence and graceful no-git behavior.
- `tests/log-session.test.cjs` - D-01, D-12 session lifecycle and active-state contract.
- `tests/log-subcommand.test.cjs` - D-06, D-08 first-token routing and empty title behavior.
- `tests/log-list.test.cjs` - D-17 list behavior.
- `tests/log-show.test.cjs` - D-17 show behavior and parsed sections.
- `tests/log-promote.test.cjs` - D-20 quick/todo promotion and unsupported plan promotion.
- `tests/log-surfaces.test.cjs` - D-13, D-14, D-15, D-16 progress/resume surfaces and STATE immutability.
- `tests/log-cli.test.cjs` - D-03, D-08, D-17, D-18, D-19, D-20, D-22 CLI and public dispatch contracts.
- `tests/log-command-md.test.cjs` - D-03, D-04, D-05, D-17, D-19, D-20, D-22 command markdown contract.

## Decision Coverage Matrix

| Decision | Test Files |
| --- | --- |
| D-01 | `tests/log-evidence.test.cjs`, `tests/log-session.test.cjs` |
| D-02 | `tests/log-evidence.test.cjs` |
| D-03 | `tests/log-cli.test.cjs`, `tests/log-command-md.test.cjs` |
| D-04 | `tests/log-write.test.cjs`, `tests/log-command-md.test.cjs` |
| D-05 | `tests/log-frontmatter.test.cjs`, `tests/log-command-md.test.cjs` |
| D-06 | `tests/log-slug.test.cjs`, `tests/log-subcommand.test.cjs` |
| D-07 | `tests/log-slug.test.cjs` |
| D-08 | `tests/log-slug.test.cjs`, `tests/log-subcommand.test.cjs`, `tests/log-cli.test.cjs` |
| D-09 | `tests/log-frontmatter.test.cjs` |
| D-10 | `tests/log-write.test.cjs` |
| D-11 | `tests/log-frontmatter.test.cjs` |
| D-12 | `tests/log-session.test.cjs` |
| D-13 | `tests/log-surfaces.test.cjs` |
| D-14 | `tests/log-surfaces.test.cjs` |
| D-15 | `tests/log-surfaces.test.cjs` |
| D-16 | `tests/log-surfaces.test.cjs` |
| D-17 | `tests/log-list.test.cjs`, `tests/log-show.test.cjs`, `tests/log-cli.test.cjs`, `tests/log-command-md.test.cjs` |
| D-18 | `tests/log-cli.test.cjs` |
| D-19 | `tests/log-cli.test.cjs`, `tests/log-command-md.test.cjs` |
| D-20 | `tests/log-promote.test.cjs`, `tests/log-cli.test.cjs`, `tests/log-command-md.test.cjs` |
| D-21 | `tests/log-write.test.cjs` |
| D-22 | `tests/log-cli.test.cjs`, `tests/log-command-md.test.cjs` |

## Expected RED Surface

Wave 1 is expected to implement `oto/bin/lib/log.cjs` with `deriveLogSlug`, `routeSubcommand`, `captureEvidence`, `writeLogEntry`, `startSession`, `endSession`, `listLogs`, `showLog`, `promoteLog`, and `main`.

Wave 2 is expected to implement `oto/commands/oto/log.md`, `oto-tools log` dispatch, public `oto log` dispatch, `progress.md` Recent Activity, `resume-project.md` log-session surfaces, and the `.gitignore` active-session entry.

## Decisions Made

- Followed the plan's stricter 12-file test list rather than the older research names for `log-oneshot`, `log-progress-surface`, and `log-resume-surface`; coverage is consolidated into `log-write`, `log-cli`, and `log-surfaces` per `02-01-PLAN.md`.
- Kept all future implementation imports deferred into `test()` callbacks, even in command markdown and surface tests, so the Wave 0 run fails consistently on the future library seam first.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed malformed RED assertion in `tests/log-cli.test.cjs`**
- **Found during:** Task 2 (RED scaffold verification)
- **Issue:** The initial `--since` assertion had a missing parenthesis and incorrect `readFileSync` argument order, which would have made the test file fail at parse time.
- **Fix:** Rewrote the assertion to read the log file as UTF-8 and pass a proper `RegExp` plus assertion message to `assert.match`.
- **Files modified:** `tests/log-cli.test.cjs`
- **Verification:** `for f in tests/log-*.test.cjs; do node --check "$f" >/dev/null || exit 1; done` exited 0.
- **Committed in:** `691ffad`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix preserved the RED-only scope and was necessary for loadable node:test scaffolds.

## Issues Encountered

- Git index writes required sandbox escalation for `git add` and `git commit`; only plan-owned files were staged for the two task commits.

## Known Stubs

None. The `TODO` strings found in `tests/fixtures/log/transcript-samples/with-open-questions.txt` and `tests/fixtures/log/existing-logs/20260501-1015-add-feature.md` are intentional open-question fixture data for D-04/D-20, not implementation placeholders.

## Threat Flags

None. This plan adds tests and static fixtures only; it introduces no production endpoint, auth path, file-access implementation, or schema boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-02 can now implement `oto/bin/lib/log.cjs` against the RED contract. It should leave the command markdown, dispatch, workflow surface, and `.gitignore` RED tests for Plan 02-03 unless its own plan explicitly says otherwise.

## Self-Check: PASSED

- Found summary file: `.planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-01-SUMMARY.md`
- Found representative test file: `tests/log-cli.test.cjs`
- Found representative fixture file: `tests/fixtures/log/mixed-history/.oto/phases/01-foo/01-01-SUMMARY.md`
- Found Task 1 commit: `0d586ad`
- Found Task 2 commit: `691ffad`

---
*Phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses*
*Completed: 2026-05-06*
