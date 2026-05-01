---
phase: 05-hooks-port-consolidation
plan: 05
subsystem: hooks
tags: [node-test, hooks, session-start, snapshot, hk-01]

requires:
  - phase: 05-hooks-port-consolidation
    provides: 05-03 consolidated SessionStart hook and 05-04 Claude hook install wiring
provides:
  - Locked Claude SessionStart stdout fixture for the Phase 5 regression baseline
  - Hook README documenting fixture purpose and Phase 10 CI promotion path
  - Passing snapshot test that respawns the source hook and deep-equals against the fixture
affects: [phase-05, hooks, phase-10-ci, phase-06-skills]

tech-stack:
  added: []
  patterns:
    - Static hook-output fixture captured from a temp cwd with source-token preservation
    - node:test snapshot lock with defense-in-depth banned-substring scan

key-files:
  created:
    - oto/hooks/__fixtures__/session-start-claude.json
    - oto/hooks/README.md
    - .planning/phases/05-hooks-port-consolidation/05-05-SUMMARY.md
  modified:
    - tests/05-session-start-fixture.test.cjs

key-decisions:
  - "Capture the fixture from the source hook so the literal {{OTO_VERSION}} token remains part of the locked baseline."
  - "Keep the fixture test isolated from the install pipeline: it respawns oto/hooks/oto-session-start directly in a temp cwd."

patterns-established:
  - "SessionStart snapshot tests deep-equal the full parsed JSON object and separately scan additionalContext for upstream identity strings."
  - "Hook fixture documentation lives next to hook source so Phase 10 CI promotion has an explicit local handoff."

requirements-completed: [HK-01]

duration: 6 min
completed: 2026-05-01
---

# Phase 05 Plan 05: SessionStart Fixture Lock Summary

**Claude SessionStart source-hook output is locked as a static snapshot fixture with local regression coverage and no upstream identity leakage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-01T20:05:44Z
- **Completed:** 2026-05-01T20:11:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Captured `oto/hooks/oto-session-start` stdout into `oto/hooks/__fixtures__/session-start-claude.json` using the plan's Claude-branch environment and a clean temp cwd.
- Hand-inspected and machine-verified the fixture shape, exactly one `<EXTREMELY_IMPORTANT>` block, required oto literals, D-06 fallback text, literal `{{OTO_VERSION}}`, and zero banned upstream identity strings.
- Added `oto/hooks/README.md` to explain the fixture's purpose, source-capture semantics, and Phase 10 CI promotion path.
- Replaced the final Phase 5 Wave 0 `t.todo()` scaffold with a real `node:test` that respawns the hook, deep-equals against the fixture, and scans for Pitfall 15 leakage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture session-start-claude.json fixture and add oto/hooks/README.md** - `61ba02b` (test)
2. **Task 2: Fill tests/05-session-start-fixture.test.cjs with deep-equal against the locked fixture** - `aa8a05e` (test)

## Files Created/Modified

- `oto/hooks/__fixtures__/session-start-claude.json` - Static Claude SessionStart stdout fixture captured from the source hook with the literal `{{OTO_VERSION}}` token preserved.
- `oto/hooks/README.md` - Documents hook source layout, the snapshot fixture, and the Phase 10 CI promotion path.
- `tests/05-session-start-fixture.test.cjs` - Real snapshot regression test replacing the Wave 0 todo scaffold.
- `.planning/phases/05-hooks-port-consolidation/05-05-SUMMARY.md` - Execution summary, verification record, and self-check.

## Verification

- Task 1 fixture checks - PASS: fixture exists, parses as JSON, has `hookSpecificOutput.hookEventName === "SessionStart"`, includes `<EXTREMELY_IMPORTANT>`, `You are using oto.`, `'oto:using-oto'`, `skill ships in Phase 6`, and literal `{{OTO_VERSION}}`.
- Task 1 leak checks - PASS: fixture `additionalContext` has exactly one identity block and no `superpowers`, `Superpowers`, `gsd-`, `Get Shit Done`, `using-superpowers`, or `You have superpowers`.
- Task 1 README checks - PASS: `oto/hooks/README.md` references `session-start-claude.json` and ADR-04 / D-09.
- Task 2 acceptance - PASS: no `t.todo`, fixture path present, capture env vars present, Pitfall 15 scan present, and `node --test tests/05-session-start-fixture.test.cjs` reports 1 pass / 0 fail / 0 todo.
- `node --test tests/05-*.test.cjs` - PASS, 13 pass / 0 fail / 0 todo.
- `npm test` - PASS, 242 pass / 0 fail / 0 todo.

## Decisions Made

- Captured the source hook rather than the built or installed hook because the Phase 5 baseline must preserve the literal `{{OTO_VERSION}}` token; install-time replacement remains the installer pipeline's responsibility.
- Kept the fixture test independent of `runtime-claude.cjs` and `install.cjs`; this plan locks hook output behavior, while 05-04 already owns installer registration and token substitution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git staging and commit operations required escalated filesystem permission to create `.git/index.lock`; all commits were still normal `git commit` invocations without `--no-verify`.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `oto/hooks/__fixtures__/session-start-claude.json` intentionally captures the D-06 fallback text `skill ships in Phase 6` because `oto/skills/using-oto/SKILL.md` is owned by Phase 6.
- `oto/hooks/README.md` documents that same D-06 fallback. This is intentional Phase 5 behavior and does not block the fixture lock.

## Threat Flags

None - this plan added a static fixture, documentation, and local test coverage only. No new network endpoint, auth path, file-access trust boundary, or schema change beyond the threat model.

## Next Phase Readiness

Phase 5 is ready for `/oto-verify-work`. All five Phase 5 test files now pass without todos, and HK-01 has a locked snapshot baseline for Phase 10 CI promotion.

---
*Phase: 05-hooks-port-consolidation*
*Completed: 2026-05-01*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-hooks-port-consolidation/05-05-SUMMARY.md`.
- Key plan files exist: `oto/hooks/__fixtures__/session-start-claude.json`, `oto/hooks/README.md`, and `tests/05-session-start-fixture.test.cjs`.
- Task commits `61ba02b` and `aa8a05e` exist in git history.
- Final verification passed: `node --test tests/05-*.test.cjs` and `npm test`.
