---
phase: 06-skills-port-cross-system-integration
plan: 03
subsystem: agents
tags: [skills, agents, session-start, node-test]
requires:
  - phase: 06-skills-port-cross-system-integration
    provides: Plan 02 retained skill tree
provides:
  - Canonical SKL-08 Skill() invocation directives in oto-executor, oto-verifier, and oto-debugger
  - SessionStart compatibility with the real oto:using-oto skill body
affects: [agents, skills, session-start, install]
tech-stack:
  added: []
  patterns: [inline prose Skill directives, nested identity-block stripping for SessionStart injection]
key-files:
  created: []
  modified:
    - oto/agents/oto-executor.md
    - oto/agents/oto-verifier.md
    - oto/agents/oto-debugger.md
    - oto/hooks/oto-session-start
    - oto/hooks/__fixtures__/session-start-claude.json
    - tests/05-session-start.test.cjs
key-decisions:
  - "Keep SKL-08 wiring as inline prose Skill() directives; no frontmatter or hook mechanism added."
  - "SessionStart strips the inner using-oto identity tags before wrapping the full skill body to preserve Phase 5's single identity-block invariant."
patterns-established:
  - "Agent prompt wiring is tested through exact Skill('oto:<name>') literals plus placeholder-removal assertions."
requirements-completed: [SKL-08]
duration: 15min
completed: 2026-05-01
---

# Phase 6 Plan 03 Summary

**Three retained spine agents now invoke the Phase 6 skills at canonical points, and SessionStart injects the real using-oto payload without nested identity blocks**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-01T22:59:00Z
- **Completed:** 2026-05-01T23:14:00Z
- **Tasks:** 2 plus 1 regression fix
- **Files modified:** 6

## Accomplishments

- Replaced the generic `oto-executor` skill placeholder with explicit `Skill('oto:test-driven-development')` and `Skill('oto:verification-before-completion')` directives.
- Replaced the generic `oto-verifier` skill placeholder with an explicit `Skill('oto:verification-before-completion')` directive.
- Replaced the generic `oto-debugger` skill placeholder with an explicit `Skill('oto:systematic-debugging')` directive.
- Fixed the SessionStart hook and fixture so Phase 5 tests remain valid now that `oto/skills/using-oto/SKILL.md` exists.

## Task Commits

1. **Task 1: Wire oto-executor canonical invocations** - `da664d9` (`feat(06-03): wire executor skill invocations`)
2. **Task 2: Wire oto-verifier and oto-debugger canonical invocations** - `6a1980f` (`feat(06-03): wire verifier debugger skills`)
3. **Regression fix: SessionStart real using-oto payload compatibility** - `b46ccac` (`fix(06-03): align session-start with using-oto skill`)

## Files Created/Modified

- `oto/agents/oto-executor.md` - Adds TDD-before-write and verification-before-done skill directives.
- `oto/agents/oto-verifier.md` - Adds verification-before-completion directive at verification pass start.
- `oto/agents/oto-debugger.md` - Adds systematic-debugging directive at debug session start.
- `oto/hooks/oto-session-start` - Strips the inner `using-oto` identity tags before the outer SessionStart identity wrapper.
- `oto/hooks/__fixtures__/session-start-claude.json` - Refreshes the snapshot to the real Phase 6 `using-oto` payload.
- `tests/05-session-start.test.cjs` - Updates the Claude branch assertion from fallback text to the real workflow-deference payload.

## Verification

- `grep -rE "Skill\('oto:(test-driven-development|verification-before-completion|systematic-debugging)'\)" oto/agents/` -> 4 matches across the three target agents.
- Placeholder scan for the three generic skill-rule sentences and `required_skills:` -> 0 matches.
- `node --test tests/06-skill-structure.test.cjs` -> 7 passed.
- `node --test tests/06-*.test.cjs` -> 14 passed.
- `node --test tests/05-session-start-fixture.test.cjs tests/05-session-start.test.cjs` -> 6 passed.
- `node --test --test-concurrency=4 tests/*.test.cjs` -> 266 passed.

## Decisions Made

- Kept both executor skill directives in the existing project-skills bullet, ordered temporally in one imperative sentence. This matched the current agent structure and still satisfies the "before writing" and "before declaring done" contracts.
- Preserved the `using-oto/SKILL.md` inner identity block on disk for static readers, but stripped only the tags during SessionStart injection so runtime context has one outer identity block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] SessionStart compatibility with real using-oto payload**
- **Found during:** Plan 03 full-suite verification
- **Issue:** Phase 5 SessionStart tests still expected the pre-Phase-6 fallback string. Once `oto/skills/using-oto/SKILL.md` existed, the hook injected the full skill body and created two `<EXTREMELY_IMPORTANT>` blocks.
- **Fix:** Updated `oto-session-start` to strip the inner identity tags before wrapping the skill body; refreshed the Phase 5 fixture and updated the SessionStart test to assert the real workflow-deference payload.
- **Files modified:** `oto/hooks/oto-session-start`, `oto/hooks/__fixtures__/session-start-claude.json`, `tests/05-session-start.test.cjs`
- **Verification:** Phase 5 SessionStart tests passed; full suite passed.
- **Committed in:** `b46ccac`

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** Required for full-suite compatibility after the Phase 6 skill file landed. No new mechanism beyond the existing SessionStart hook.

## Issues Encountered

- The planned `node scripts/run-tests.cjs --filter "06-"` command is stale in this checkout; `scripts/run-tests.cjs` does not exist. Used `node --test tests/06-*.test.cjs` for the focused Phase 6 triplet and `node --test --test-concurrency=4 tests/*.test.cjs` for the full suite.

## Next Phase Readiness

All in-scope SKL-08 agent invocation checks are green. Phase 6 can proceed to phase-level review and verification.

---
*Phase: 06-skills-port-cross-system-integration*
*Completed: 2026-05-01*
