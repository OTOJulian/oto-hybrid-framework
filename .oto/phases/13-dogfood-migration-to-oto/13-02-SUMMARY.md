---
phase: 13-dogfood-migration-to-oto
plan: 02
subsystem: planning
tags: [dogfood, git-mv, planning-root, state-marker]

requires:
  - phase: 13-dogfood-migration-to-oto
    provides: "Plan 13-01 clean-tree precondition"
provides:
  - "Atomic .planning to .oto rename with git history preserved"
  - "Clean cutover with .planning removed"
  - "oto_state_version marker in moved STATE.md"
affects: [phase-13, dogfood-migration, planning-root, oto-sdk]

tech-stack:
  added: []
  patterns:
    - "Pure git mv commit for planning-root migration"
    - "State ownership marker flip in a separate commit after rename"

key-files:
  created:
    - ".oto/phases/13-dogfood-migration-to-oto/13-02-SUMMARY.md"
  modified:
    - ".oto/STATE.md"
  moved:
    - ".planning/ -> .oto/"

key-decisions:
  - "Kept the .planning to .oto rename as a pure, standalone git mv commit."
  - "Accepted human approval of the rename-only diff before applying the state marker flip."

patterns-established:
  - "For repo-root planning migration, perform path move and ownership-marker edits as separate commits."

requirements-completed: [DOG-01]

duration: 8 min
completed: 2026-05-26
---

# Phase 13 Plan 02: Atomic `.oto/` Migration Summary

**Planning artifacts moved from `.planning/` to `.oto/` through a pure git rename commit, with `STATE.md` now marked as oto-owned.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-26T04:56:00Z
- **Completed:** 2026-05-26T05:04:44Z
- **Tasks:** 3 completed
- **Files modified:** 278 renamed, 1 marker line changed, plus this summary

## Accomplishments

- Verified the precondition: clean working tree, no existing `.oto/`, and existing `.planning/`.
- Moved the full planning root with `git mv .planning .oto`.
- Committed the move alone as `f415007`, with `278 files changed, 0 insertions(+), 0 deletions(-)` and all moved paths recorded as 100% renames.
- Verified history preservation with `git log --follow --oneline -- .oto/ROADMAP.md`, which shows pre-rename roadmap commits.
- Verified clean cutover with `test ! -d .planning` and `test -d .oto`.
- Confirmed frozen upstream baseline still contains `.planning` references via `git grep -c "\.planning" -- foundation-frameworks/`.
- After human approval, flipped `.oto/STATE.md` from `gsd_state_version: 1.0` to `oto_state_version: 1.0` in separate commit `81aa0a1`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Atomic git mv .planning .oto as a pure rename commit** - `f415007` (refactor)
2. **Task 2: Human verifies the rename diff is pure** - approved by operator in chat (checkpoint)
3. **Task 3: Flip gsd_state_version -> oto_state_version in .oto/STATE.md** - `81aa0a1` (chore)

**Plan metadata:** pending in this summary commit.

## Files Created/Modified

- `.oto/` - New planning root containing all former `.planning/` content.
- `.oto/STATE.md` - State marker changed to `oto_state_version: 1.0`.
- `.oto/phases/13-dogfood-migration-to-oto/13-02-SUMMARY.md` - Plan completion summary.

## Decisions Made

- Kept the path migration and state marker flip separate so the rename commit remains a pure history-preserving move.
- Treated the pre-move `.oto/STATE.md` key-link failure as expected because `.oto/` intentionally did not exist until this plan.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as specified.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

Git index writes continued to require elevated execution in this sandbox. All staging and commit operations succeeded after approval.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 13-03 can now operate on live `.oto/` artifacts and update genuine self-references away from `.planning/`. The repo has cleanly cut over: `.planning/` is absent and `.oto/` is the tracked planning root.

---
*Phase: 13-dogfood-migration-to-oto*
*Completed: 2026-05-26*
