---
phase: 06-skills-port-cross-system-integration
plan: 01
subsystem: testing
tags: [node-test, skills, installer, static-analysis]
requires:
  - phase: 05-hooks-port-consolidation
    provides: SessionStart fixture and literal-string scan pattern
provides:
  - Phase 6 red test contract for skill structure, installer copy fidelity, using-oto gating, and agent skill invocation wiring
affects: [skills, installer, agents, phase-06]
tech-stack:
  added: []
  patterns: [node:test static source assertions, temp configDir installer smoke, fixture-backed STATE.md gating check]
key-files:
  created:
    - tests/06-skill-structure.test.cjs
    - tests/06-installer-skill-copy.test.cjs
    - tests/06-using-oto-state-gating.test.cjs
    - tests/skills/__fixtures__/STATE-active.md
  modified: []
key-decisions:
  - "Use live node:test blocks rather than t.todo() so Plan 02 and Plan 03 produce visible red-to-green transitions."
patterns-established:
  - "Phase 6 tests assert exact skill payload files, installer state entries, and canonical agent Skill() directive strings."
requirements-completed: [SKL-01, SKL-02, SKL-03, SKL-04, SKL-05, SKL-06, SKL-07, SKL-08]
duration: 12min
completed: 2026-05-01
---

# Phase 6 Plan 01 Summary

**Red node:test contract for the seven retained skills, installer skill-copy fidelity, using-oto STATE.md gating, and SKL-08 agent invocation wiring**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-01T22:29:00Z
- **Completed:** 2026-05-01T22:41:19Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `tests/06-skill-structure.test.cjs` with 7 live `test()` blocks covering D-07 structure, command-name collision, and SKL-08 agent directive checks.
- Created `tests/06-installer-skill-copy.test.cjs` with 3 live installer checks for byte-identical recursive skill copy, executable-bit preservation, and install-state SHA tracking.
- Created `tests/06-using-oto-state-gating.test.cjs` plus `tests/skills/__fixtures__/STATE-active.md` with 4 live checks for gating markers, banned upstream identity literals, the Phase 5 identity sentence, and fixture shape.

## Task Commits

1. **Task 1: skill structure contract** - `e86a350` (`test(06-01): add skill structure contract`)
2. **Task 2: installer skill copy contract** - `319f0b8` (`test(06-01): add installer skill copy contract`)
3. **Task 3: using-oto gating contract** - `f404ca0` (`test(06-01): add using-oto gating contract`)

## Files Created/Modified

- `tests/06-skill-structure.test.cjs` - Enumerates the 7 retained skill directories and asserts SKILL.md frontmatter, payload presence, command collision absence, and canonical agent `Skill()` directives.
- `tests/06-installer-skill-copy.test.cjs` - Runs `installRuntime` against a temp Claude config dir and verifies copied skill files, executable mode, and install-state hashes.
- `tests/06-using-oto-state-gating.test.cjs` - Static-checks `oto:using-oto` for the STATE.md deferral marker block, banned upstream literals, and the locked identity sentence.
- `tests/skills/__fixtures__/STATE-active.md` - Fixture with `status: execute_phase` for D-09 status anchoring.

## Verification

Initial red test run results:

- `node --test tests/06-skill-structure.test.cjs` -> exit 1; 1 passed, 6 failed. Expected failures: missing `oto/skills/*` and missing `Skill('oto:*')` directives in agents.
- `node --test tests/06-installer-skill-copy.test.cjs` -> exit 1; 0 passed, 3 failed. Expected failures: missing `oto/skills` root and missing copied `find-polluter.sh`.
- `node --test tests/06-using-oto-state-gating.test.cjs` -> exit 1; 1 passed, 3 failed. Expected failures: missing `oto/skills/using-oto/SKILL.md`; fixture sanity passed.

Acceptance checks confirmed:

- `grep -cE '^test\(' tests/06-skill-structure.test.cjs` -> 7
- `grep -cE '^test\(' tests/06-installer-skill-copy.test.cjs` -> 3
- `grep -cE '^test\(' tests/06-using-oto-state-gating.test.cjs` -> 4
- `grep -c 't\.todo(' tests/06-*.test.cjs` -> 0 for all three files

## Decisions Made

None - followed the plan. The only implementation adjustment was using the actual `installRuntime(adapter, opts)` signature from `bin/lib/install.cjs` rather than the outdated interface comment in the plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `gsd-sdk query state.begin-phase --phase ...` misparsed the flags as values in this checkout. Re-ran the workflow-required state update with positional arguments.
- Initial sandboxed `git add` could not create `.git/index.lock`; git staging and commits were run with approved escalation.

## Next Phase Readiness

Plan 02 should make the D-07 skill-structure checks, installer-copy checks, and using-oto gating checks green by creating `oto/skills/` and hand-fixing `oto/skills/using-oto/SKILL.md`. Plan 03 should make the three SKL-08 agent directive checks green.

---
*Phase: 06-skills-port-cross-system-integration*
*Completed: 2026-05-01*
