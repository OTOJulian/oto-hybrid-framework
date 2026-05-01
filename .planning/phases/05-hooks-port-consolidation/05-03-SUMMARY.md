---
phase: 05-hooks-port-consolidation
plan: 03
subsystem: hooks
tags: [node-test, hooks, session-start, hk-01]

requires:
  - phase: 05-hooks-port-consolidation
    provides: 05-02 hook build retarget and token-substitution scaffolding
provides:
  - Consolidated oto SessionStart hook with one rebranded identity block
  - D-06 defensive using-oto fallback until Phase 6 ships the skill
  - hooks.session_state opt-in state reminder shared by SessionStart and validate-commit
  - Passing HK-01 session-start runtime branch tests
affects: [phase-05, hooks, installer, runtime-claude, phase-06-skills]

tech-stack:
  added: []
  patterns:
    - Bash SessionStart hook emits runtime-specific JSON via printf
    - node:test coverage spawns the hook in tmpdir-scoped .oto fixtures
    - hooks.session_state is the canonical opt-in flag for state reminder hooks

key-files:
  created:
    - .planning/phases/05-hooks-port-consolidation/05-03-SUMMARY.md
  modified:
    - oto/hooks/oto-session-start
    - oto/hooks/oto-validate-commit.sh
    - tests/05-session-start.test.cjs

key-decisions:
  - "Keep the SessionStart identity block hand-authored so model-facing text cannot leak upstream framework identity."
  - "Use hooks.session_state consistently for both SessionStart state reminders and validate-commit opt-in behavior."
  - "Keep the Phase 6 using-oto skill fallback in the hook so Phase 5 remains shippable before skills are backfilled."

patterns-established:
  - "SessionStart branch tests assert Claude hookSpecificOutput, Cursor additional_context, and fallback additionalContext shapes."
  - "Hook-output tests use temporary working directories so .oto/config.json and .oto/STATE.md fixtures never touch the repo."

requirements-completed: [HK-01]

duration: 5 min
completed: 2026-05-01
---

# Phase 05 Plan 03: SessionStart Consolidation Summary

**Single oto SessionStart entrypoint with rebranded identity JSON, D-06 fallback content, and hooks.session_state-gated project reminders**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-01T19:40:25Z
- **Completed:** 2026-05-01T19:46:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced the old state-reminder-only `oto-session-start` body with the consolidated D-04..D-08 hook.
- Added four real `node:test` cases for Claude, Cursor, fallback, and opt-in `.oto/STATE.md` reminder behavior.
- Verified the emitted Claude context has exactly one `<EXTREMELY_IMPORTANT>` block, contains `You are using oto.`, and has no upstream identity substrings.
- Renamed validate-commit opt-in configuration from `hooks.community` to `hooks.session_state`.

## Task Commits

Each task was committed atomically, with a TDD RED commit for the session-start behavior:

1. **RED: Add failing session-start coverage** - `e4c5c10` (test)
2. **Task 1: Rewrite oto-session-start to consolidated form** - `49531f6` (feat)
3. **Task 2: Rename validate-commit opt-in flag** - `427473e` (fix)

## Files Created/Modified

- `oto/hooks/oto-session-start` - Consolidated SessionStart hook with rebranded identity block, D-06 fallback, optional state reminder, JSON escaping, and three runtime output branches.
- `oto/hooks/oto-validate-commit.sh` - Opt-in flag renamed to `hooks.session_state` without changing the commit-message validation path.
- `tests/05-session-start.test.cjs` - Wave 0 todo replaced with four real hook-spawn assertions.
- `.planning/phases/05-hooks-port-consolidation/05-03-SUMMARY.md` - Execution summary and verification record.

## Verification

- `node --test tests/05-session-start.test.cjs` before implementation - RED, 0 pass / 4 fail because the old hook emitted no JSON by default.
- Task 1 acceptance greps and checks - PASS: shebang, version token, required oto literals, D-06 fallback, `hooks?.session_state`, runtime branches, `escape_for_json`, banned hook-file substrings absent, `bash -n`, and executable bit.
- `node --test tests/05-session-start.test.cjs` after implementation - PASS, 4 pass / 0 fail / 0 todo.
- Task 2 acceptance greps and checks - PASS: `hooks.community` absent, `hooks.session_state` present, `bash -n oto/hooks/oto-validate-commit.sh`, no `t.todo`.
- `node --test tests/05-*.test.cjs` - PASS, 9 tests: 7 pass / 0 fail / 2 todo (remaining Wave 3/4 scaffolds).
- `npm test` - PASS, 238 tests: 236 pass / 0 fail / 2 todo.

## Decisions Made

- Ran the SessionStart test promotion as a TDD RED gate before rewriting the hook, even though the plan lists the test-fill work in Task 2. This kept the task-level `tdd="true"` intent intact.
- Kept hook comments free of banned upstream-name substrings because the acceptance check scans the whole hook file, not only model-facing output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed upstream-name comments from the copied hook body**
- **Found during:** Task 1 (Rewrite oto/hooks/oto-session-start)
- **Issue:** The action body's reference comments included upstream framework names, while the acceptance criteria explicitly required the hook file to contain none of those banned substrings.
- **Fix:** Preserved the required runtime cascade and JSON escaping but used neutral comments in the final hook file.
- **Files modified:** `oto/hooks/oto-session-start`
- **Verification:** `! grep -qE "(superpowers|Superpowers|gsd-|Get Shit Done|hooks.community|using-superpowers|You have superpowers)" oto/hooks/oto-session-start`
- **Committed in:** `49531f6`

---

**Total deviations:** 1 auto-fixed (1 blocking plan-criteria conflict)
**Impact on plan:** The hook behavior matches D-04..D-08. The deviation only removed comment text that would have failed the plan's own leakage gate.

## Issues Encountered

- `git add` initially hit sandbox permission limits creating `.git/index.lock`; reran the same git staging/commit operations with approved escalation. No files outside the plan were staged.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None in files created or modified by this plan. The D-06 fallback string is intentional shipped behavior until Phase 6 backfills `oto/skills/using-oto/SKILL.md`.

## Next Phase Readiness

Ready for 05-04. Wave 3 can register a single `oto-session-start` hook knowing it emits deterministic Claude, Cursor, and fallback JSON shapes and uses the same `hooks.session_state` flag as validate-commit.

---
*Phase: 05-hooks-port-consolidation*
*Completed: 2026-05-01*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-hooks-port-consolidation/05-03-SUMMARY.md`.
- Key modified files exist: `oto/hooks/oto-session-start`, `oto/hooks/oto-validate-commit.sh`, and `tests/05-session-start.test.cjs`.
- Task commits exist in git history: `e4c5c10`, `49531f6`, and `427473e`.
- Final verification passed: `node --test tests/05-*.test.cjs` and `npm test`.
