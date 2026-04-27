---
phase: 01-inventory-architecture-decisions
plan: 01
subsystem: docs
tags: [adr, decisions, agent-audit, node-test]
requires: []
provides:
  - ARCH-01..ARCH-05 architectural decisions captured as ADRs
  - AGT-01 agent audit with 33 keep/drop verdicts
  - DOC-05 lightweight ADR format and structure tests
affects: [phase-02, phase-04, phase-05, phase-08]
tech-stack:
  added: []
  patterns: [node:test documentation validation, lightweight ADR format]
key-files:
  created:
    - decisions/ADR-01-state-root.md
    - decisions/ADR-02-env-var-prefix.md
    - decisions/ADR-03-skill-vs-command.md
    - decisions/ADR-04-sessionstart.md
    - decisions/ADR-05-agent-collisions.md
    - decisions/ADR-06-skill-namespace.md
    - decisions/ADR-07-agent-trim.md
    - decisions/ADR-08-inventory-format.md
    - decisions/ADR-09-adr-format.md
    - decisions/ADR-10-rename-map-schema.md
    - decisions/ADR-11-distribution.md
    - decisions/ADR-12-sdk-strategy.md
    - decisions/ADR-13-license-attribution.md
    - decisions/ADR-14-inventory-scope.md
    - decisions/skill-vs-command.md
    - decisions/agent-audit.md
    - tests/helpers/load-schema.cjs
    - tests/helpers/load-schema.js
    - tests/phase-01-adr-structure.test.cjs
    - tests/phase-01-agent-audit.test.cjs
    - tests/phase-01-decisions-dir.test.cjs
  modified: []
key-decisions:
  - "Use .oto/ as canonical state root and rewrite .planning only as a path rule."
  - "Use full GSD_* to OTO_* env-var prefix rebrand with runtime-owned env vars allowlisted."
  - "Keep 23 GSD agents and drop 10 based on Phase 1 trim policy."
patterns-established:
  - "ADR files use H1, Status, Date, Implements, Context, Decision, Rationale, Consequences."
  - "Node built-in node:test validates decision artifacts without npm dependencies."
requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, AGT-01, DOC-05]
duration: 7 min
completed: 2026-04-27
---

# Phase 01 Plan 01: Decisions and ADRs Summary

**Architecture decisions are locked as 14 ADRs, with routing and agent-audit references backed by zero-dependency Node tests.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-27T22:56:11Z
- **Completed:** 2026-04-27T23:03:21Z
- **Tasks:** 3 completed
- **Files modified:** 21 created

## Accomplishments

- Created ADR-01 through ADR-14 covering D-01 through D-23.
- Created `decisions/skill-vs-command.md` with the active overlap routing policy and full 14-row survey.
- Created `decisions/agent-audit.md` with all 33 GSD agents, KEEP=23 and DROP=10.
- Added Phase 1 test scaffolding using `node:test` plus a zero-dependency JSON-schema subset validator.

## Task Commits

1. **Task 1: ADR structure and agent-audit tests** - `4491445`
2. **Task 2: ADR files** - `cc819e9`, `e9a91ce`, `0415932`, `41ae731`, `240184a`, `edbdb6b`, `9d8e8d8`, `53ab5ca`, `290bf19`, `5dd6875`, `e5fffe4`, `5d467d2`, `6347bde`, `e0a62ef`
3. **Task 3: Routing reference and agent audit** - `3c4fe2a`

## Files Created/Modified

- `decisions/ADR-*.md` - The 14 accepted decision records.
- `decisions/skill-vs-command.md` - Operational workflow-vs-skill routing reference.
- `decisions/agent-audit.md` - AGT-01 verdict table for all 33 GSD agents.
- `tests/phase-01-adr-structure.test.cjs` - ADR structure checks.
- `tests/phase-01-agent-audit.test.cjs` - Agent presence and verdict-count checks.
- `tests/phase-01-decisions-dir.test.cjs` - Cross-plan decisions directory count check.
- `tests/helpers/load-schema.cjs` and `tests/helpers/load-schema.js` - Zero-dependency schema validator plus extensionless require shim.

## Decisions Made

- Added `tests/helpers/load-schema.js` as a compatibility shim because Node does not resolve `.cjs` from `require('./tests/helpers/load-schema')`.
- Kept `tests/phase-01-decisions-dir.test.cjs` at the final Phase 1 threshold of 18 files, so it remains red until Plan 02 adds `file-inventory.json` and `file-inventory.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added extensionless load-schema shim**
- **Found during:** Task 1 acceptance verification
- **Issue:** The plan required `tests/helpers/load-schema.cjs`, but acceptance checks and downstream tests import `./helpers/load-schema` without an extension. Node does not resolve `.cjs` in extensionless CommonJS resolution.
- **Fix:** Added `tests/helpers/load-schema.js` that re-exports `load-schema.cjs`.
- **Files modified:** `tests/helpers/load-schema.js`
- **Verification:** `node -e "console.log(typeof require('./tests/helpers/load-schema').validate)"` prints `function`.
- **Committed in:** `4491445`

---

**Total deviations:** 1 auto-fixed (Rule 3).
**Impact on plan:** No behavior change beyond making the plan's own extensionless imports work.

## Issues Encountered

- `tests/phase-01-decisions-dir.test.cjs` is expected to fail after Plan 01 because the inventory files are created by Plan 02. It already verifies the reference files exist and will turn green when decisions count reaches 18.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can now consume `tests/helpers/load-schema.cjs`, `tests/helpers/load-schema.js`, `decisions/ADR-08-inventory-format.md`, `decisions/ADR-14-inventory-scope.md`, and `decisions/agent-audit.md`. User confirmations still surfaced for later UAT: A1 GitHub owner placeholder, A2 env-var ownership spot-check, and A7 hook drop-review decisions.

## Self-Check: PASSED

- `node --test tests/phase-01-adr-structure.test.cjs` passed.
- `node --test tests/phase-01-agent-audit.test.cjs` passed.
- D-01 through D-23 each appear in at least one ADR.
- `tests/phase-01-decisions-dir.test.cjs` is intentionally pending Plan 02 inventory files.

---
*Phase: 01-inventory-architecture-decisions*
*Completed: 2026-04-27*
