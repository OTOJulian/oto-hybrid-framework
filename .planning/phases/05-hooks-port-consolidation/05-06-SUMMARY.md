---
phase: 05-hooks-port-consolidation
plan: 06
subsystem: hooks
tags: [node-test, hooks, validate-commit, hk-06, tdd]

requires:
  - phase: 05-hooks-port-consolidation
    provides: 05-03 validate-commit opt-in behavior and 05-04 Claude hook registration
provides:
  - Active phase and active plan enforcement for validate-commit when hooks.session_state is enabled
  - Regression tests for missing state, inactive phase, missing plan, and valid active phase/plan
  - Preserved Conventional Commits parsing behavior for existing git commit message forms
affects: [phase-05, hooks, phase-10-ci]

tech-stack:
  added: []
  patterns:
    - TDD RED/GREEN gap closure using node:test and shell-hook subprocess fixtures
    - Commit validation keeps message parsing before project-state invariant checks

key-files:
  created:
    - .planning/phases/05-hooks-port-consolidation/05-06-SUMMARY.md
  modified:
    - oto/hooks/oto-validate-commit.sh
    - tests/05-validate-commit.test.cjs

key-decisions:
  - "Validate Conventional Commit subject first, then enforce active .oto/STATE.md phase and plan for commit commands."
  - "Keep test fixtures defaulted to an active state so existing valid-message parsing coverage continues to verify acceptance paths."

patterns-established:
  - "Validate-commit state-invariant failures emit JSON block decisions with active phase or active plan substrings for stable assertions."
  - "Valid commit-message tests provide active project state explicitly, while state-invariant tests opt out or override state content."

requirements-completed: [HK-06]

duration: 4 min
completed: 2026-05-01
---

# Phase 05 Plan 06: Validate-Commit Active State Gap Closure Summary

**Validate-commit now blocks well-formed commit messages unless oto project state has both an active phase and active plan**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-01T20:48:01Z
- **Completed:** 2026-05-01T20:51:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added HK-06 regression tests for enabled `hooks.session_state` with no `.oto/STATE.md`, inactive phase, missing plan, and a valid active phase plus active plan.
- Preserved existing Conventional Commit parsing coverage by giving valid acceptance cases explicit active state.
- Updated `oto/hooks/oto-validate-commit.sh` to enforce `.oto/STATE.md` active phase and active plan checks after Conventional Commit subject validation.
- Confirmed the full test suite passes with 252 pass, 0 fail, 0 todo.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add active phase/plan invariant regression tests** - `2010135` (test)
2. **Task 2: Enforce active phase and plan in oto-validate-commit.sh** - `5d5b49b` (feat)

## Files Created/Modified

- `tests/05-validate-commit.test.cjs` - Adds state-aware hook fixtures and HK-06 regression cases while preserving existing commit-message parsing tests.
- `oto/hooks/oto-validate-commit.sh` - Blocks commit commands with valid messages unless `.oto/STATE.md` exists with active `Phase:` and `Plan:` lines.
- `.planning/phases/05-hooks-port-consolidation/05-06-SUMMARY.md` - Execution summary, verification record, and self-check.

## Verification

- RED gate - PASS: `node --test tests/05-validate-commit.test.cjs` failed before Task 2 because missing/incomplete state still exited 0 for a valid commit message.
- `bash -n oto/hooks/oto-validate-commit.sh` - PASS.
- `node --test tests/05-validate-commit.test.cjs` - PASS, 7 pass / 0 fail / 0 todo.
- `npm test` - PASS, 252 pass / 0 fail / 0 todo.

## Decisions Made

- Kept the existing validation order for commit commands: parse message, validate Conventional Commit subject, then enforce active project state. This preserves existing invalid-message behavior and only tightens valid commit acceptance.
- Used simple `grep` and trimmed shell string checks for `Phase:` and `Plan:` lines, matching the plan's deterministic text-check requirement.
- Treated the shell `MSG=""` accumulator as an internal parser variable, not a tracked stub; it does not flow to UI rendering or mock a data source.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git staging and commit operations required escalated filesystem permission to create `.git/index.lock`; all commits were normal `git commit` invocations without `--no-verify`.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - the `.oto/STATE.md` file read is the planned HK-06 hook invariant, and this plan added no unplanned network endpoint, auth path, schema change, or additional trust boundary.

## TDD Gate Compliance

- RED commit present: `2010135` (`test(05-06): add failing tests for active commit state`)
- GREEN commit present after RED: `5d5b49b` (`feat(05-06): enforce active commit state`)
- REFACTOR commit: not needed.

## Next Phase Readiness

Phase 5's HK-06 verification gap is closed programmatically. The phase can be re-verified against `05-VERIFICATION.md` and then moved through the normal closeout path.

---
*Phase: 05-hooks-port-consolidation*
*Completed: 2026-05-01*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-hooks-port-consolidation/05-06-SUMMARY.md`.
- Key plan files exist: `oto/hooks/oto-validate-commit.sh` and `tests/05-validate-commit.test.cjs`.
- Task commits `2010135` and `5d5b49b` exist in git history.
- Final verification passed: `bash -n oto/hooks/oto-validate-commit.sh`, `node --test tests/05-validate-commit.test.cjs`, and `npm test`.
