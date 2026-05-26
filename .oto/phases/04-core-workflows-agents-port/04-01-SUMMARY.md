---
phase: 04-core-workflows-agents-port
plan: 01
subsystem: testing
tags: [node-test, phase-04, scaffolds, agents, fixtures]

requires:
  - phase: 03-installer-fork-claude-adapter
    provides: installer payload roots and node:test conventions used by Phase 4 scaffolds
provides:
  - Phase 4 Wave 0 verification test scaffolds
  - Retained-agent fixture derived from decisions/agent-audit.md KEEP rows
  - Placeholder checks for downstream Wave 1, Wave 2, and Wave 3 implementation plans
affects: [phase-04, verification, agents, workflows, install-smoke]

tech-stack:
  added: []
  patterns: [node:test todo scaffolds, JSON fixture for retained agents]

key-files:
  created:
    - tests/fixtures/phase-04/retained-agents.json
    - tests/phase-04-rebrand-smoke.test.cjs
    - tests/phase-04-frontmatter-schema.test.cjs
    - tests/phase-04-task-refs-resolve.test.cjs
    - tests/phase-04-no-dropped-agents.test.cjs
    - tests/phase-04-generic-agent-allowlist.test.cjs
    - tests/phase-04-codex-sandbox-coverage.test.cjs
    - tests/phase-04-superpowers-code-reviewer-removed.test.cjs
    - tests/phase-04-planning-leak.test.cjs
    - tests/phase-04-command-to-workflow.test.cjs
    - tests/phase-04-mr01-install-smoke.test.cjs
  modified: []

key-decisions:
  - "Use intentional t.todo() scaffolds so downstream Phase 4 plans must fill existing verification files instead of inventing new names."
  - "Keep retained-agent data in a shared JSON fixture so task-ref, no-dropped-agent, generic allowlist, and Codex sandbox tests share one source."

patterns-established:
  - "Phase 4 tests start with 'use strict', define REPO_ROOT, and use node:test t.todo placeholders until their owning downstream plan fills behavior."
  - "Retained-agent verification consumes tests/fixtures/phase-04/retained-agents.json rather than duplicating static arrays in each test."

requirements-completed: []
requirements-addressed: []

duration: 4 min
completed: 2026-04-29
---

# Phase 04 Plan 01: Wave 0 Test Scaffolds Summary

**Phase 4 verification scaffolds with a retained-agent fixture for downstream workflow and agent port checks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-29T22:23:00Z
- **Completed:** 2026-04-29T22:27:21Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created `tests/fixtures/phase-04/retained-agents.json` with the exact 23 retained `oto-*` agents, 10 dropped-agent leak strings, and 5 generic allowlist strings.
- Created all 10 Phase 4 `node:test` scaffold files as runnable `t.todo()` placeholders.
- Wired retained-agent fixture imports into scaffold files that will validate task references, dropped-agent leaks, generic allowlists, and Codex sandbox coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate retained-agents fixture from agent-audit.md** - `cde79b1` (test)
2. **Task 2: Create 10 Phase 4 test scaffolds with t.todo() placeholders** - `9ea2f06` (test)

## Files Created/Modified

- `tests/fixtures/phase-04/retained-agents.json` - Shared fixture for retained agents, dropped-agent leak strings, and generic allowlist entries.
- `tests/phase-04-rebrand-smoke.test.cjs` - Wave 1 scaffold for engine output checks.
- `tests/phase-04-frontmatter-schema.test.cjs` - Wave 3 scaffold for retained-agent frontmatter checks.
- `tests/phase-04-task-refs-resolve.test.cjs` - Wave 3 scaffold for `subagent_type` resolution checks.
- `tests/phase-04-no-dropped-agents.test.cjs` - Wave 3 scaffold for dropped-agent leak checks.
- `tests/phase-04-generic-agent-allowlist.test.cjs` - Wave 3 scaffold for generic subagent allowlist checks.
- `tests/phase-04-codex-sandbox-coverage.test.cjs` - Wave 3 scaffold for Codex agent sandbox coverage.
- `tests/phase-04-superpowers-code-reviewer-removed.test.cjs` - Wave 3 scaffold for the Superpowers code-reviewer collision check.
- `tests/phase-04-planning-leak.test.cjs` - Wave 3 scaffold for shipped-payload `.planning` leak checks.
- `tests/phase-04-command-to-workflow.test.cjs` - Wave 3 scaffold for command-to-workflow include resolution.
- `tests/phase-04-mr01-install-smoke.test.cjs` - Wave 3 scaffold for the automated MR-01 install smoke.

## Verification

- `node -e "const fs=require('fs'); const files=[...]; ..."` - PASS, all 10 scaffold files exist and the fixture has expected 23/10/5 counts.
- `node --test --test-concurrency=4 tests/phase-04-*.test.cjs` - PASS, 10 tests, 0 fail, 10 todo.
- `npm test` - PASS, 225 tests, 0 fail, 10 todo.

## Decisions Made

- Used `t.todo()` for each scaffold because 04-01 is explicitly Wave 0; downstream plans own the real assertions.
- Stored retained agents, dropped-agent leak strings, and generic allowlist entries together in one JSON fixture to avoid divergent copies.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

These are intentional Wave 0 placeholders required by the plan and do not block 04-01 completion:

- `tests/phase-04-rebrand-smoke.test.cjs` - `t.todo()` placeholder filled by Wave 1 plan 04-02.
- `tests/phase-04-frontmatter-schema.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-task-refs-resolve.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-no-dropped-agents.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-generic-agent-allowlist.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-codex-sandbox-coverage.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07 after plan 04-06.
- `tests/phase-04-superpowers-code-reviewer-removed.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-planning-leak.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-command-to-workflow.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.
- `tests/phase-04-mr01-install-smoke.test.cjs` - `t.todo()` placeholder filled by Wave 3 plan 04-07.

## Issues Encountered

- `gsd-sdk query roadmap.update-plan-progress 04` could not match the roadmap row, so the Phase 4 progress row was updated manually to `1/8`.
- Local `gsd-sdk` state helpers misparsed flag-form `state.record-metric` and `state.record-session` calls; the generated `STATE.md` metric/session lines were corrected manually.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 04-02. The fixture and scaffold filenames are in place so downstream Phase 4 plans can replace placeholders with concrete assertions without changing the verification contract.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-core-workflows-agents-port/04-01-SUMMARY.md`.
- All 11 created plan files exist.
- Task commits `cde79b1` and `9ea2f06` exist in git history.
- `requirements-completed: []` and `requirements-addressed: []` reflect the plan frontmatter's empty `requirements_addressed` set.
