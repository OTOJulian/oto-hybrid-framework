---
phase: 12-query-registry-workflow-consumption
plan: 01
subsystem: sdk
tags: [sdk, path-resolution, query-registry, tdd]

# Dependency graph
requires:
  - phase: 11-oto-sdk-package-port-path-wiring
    provides: "Ported SDK package, local vitest/tsc infrastructure, and oto-sdk query surface"
provides:
  - "Dependency-free SDK planning-root resolver for .oto-first and migrated-.planning fallback resolution"
  - "helpers.ts re-export for existing query helper imports"
  - "Unit coverage for .oto-only, migrated .planning, unmarked .planning, no-root, both-present, and marker-regex cases"
affects: [12-query-registry-workflow-consumption, sdk-query-registry, workstream-utils]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SDK leaf module imports only node builtins to avoid helpers/workstream-utils ESM cycles"
    - "TDD red-green commits for resolver behavior"

key-files:
  created: [sdk/src/planning-root.ts]
  modified: [sdk/src/query/helpers.ts, sdk/src/query/helpers.test.ts]

key-decisions:
  - "Plan 12-01 keeps planning-root resolution in sdk/src/planning-root.ts as a node-builtin-only leaf module and re-exports it from query helpers to avoid helpers/workstream-utils cycles."

patterns-established:
  - "Planning-root resolution is centralized in sdk/src/planning-root.ts; downstream consumers should import the leaf module directly when cycle risk exists."
  - "helpers.ts remains the compatibility export surface for existing query helper consumers."

requirements-completed: [SDK-03]

# Metrics
duration: 3min
completed: 2026-05-26T02:06:12Z
---

# Phase 12 Plan 01: SDK Planning-Root Resolver Summary

**A dependency-free SDK resolver now mirrors the CJS `.oto` / migrated `.planning` planning-root contract and is regression-covered through the helpers re-export path.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-26T02:03:04Z
- **Completed:** 2026-05-26T02:06:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `sdk/src/planning-root.ts` as a leaf module importing only `node:path` and `node:fs`.
- Re-exported `planningRootName`, `hasMigratedPlanningRoot`, and `hasPlanningRoot` from `sdk/src/query/helpers.ts`.
- Added unit coverage for all five required project layouts plus the `oto_state_version` marker regex boundary.
- Verified the tests failed first against the missing resolver exports, then passed after implementation.

## Task Commits

1. **RED: planning-root resolver coverage** - `bc40063` (test)
2. **GREEN: SDK planning-root resolver** - `6927c8c` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `sdk/src/planning-root.ts` - Leaf resolver module with `planningRootName`, `hasMigratedPlanningRoot`, and `hasPlanningRoot`.
- `sdk/src/query/helpers.ts` - Re-exports the resolver functions from `../planning-root.js`.
- `sdk/src/query/helpers.test.ts` - Adds `planning-root resolution` cases through the helpers re-export path.

## Decisions Made

- Followed the plan's leaf-module design so Plan 02 can import from `planning-root.ts` without creating a `helpers.ts` and `workstream-utils.ts` ESM cycle.
- Did not rebuild `sdk/dist/`; the plan explicitly leaves consumer behavior and dist rebuilds to Plans 02 and 03.

## Deviations from Plan

None - plan executed exactly as written, with the user-requested TDD ordering applied before production code.

## Issues Encountered

- `git add` / `git commit` initially failed with `.git/index.lock: Operation not permitted` under the sandbox. Retried the same scoped git operations with escalation; no unrelated files were staged.
- Full SDK unit verification does not currently pass outside the scoped resolver checks. After escalation cleared WebSocket bind failures, 8 failures remain in unrelated existing tests:
  - `src/workflow-agent-skills-consistency.test.ts` expects a root `agents/` directory.
  - `src/query/profile.test.ts` expects `get-shit-done/templates/user-profile.md`.
  - `src/query/registry.test.ts`, `src/query/state-mutation.test.ts`, `src/query/config-mutation.test.ts`, and `src/query/decomposed-handlers.test.ts` fail on pre-existing behavior outside this plan's files.

## Verification

- RED: `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` failed as expected with 6 resolver tests reporting missing functions.
- GREEN: `cd sdk && npx tsc --noEmit -p tsconfig.json` exited 0.
- GREEN: `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` exited 0 with 95/95 tests passing.
- Acceptance greps confirmed all three exports exist in `sdk/src/planning-root.ts`, the marker regex is `/^oto_state_version\s*:/m`, `helpers.ts` re-exports from `../planning-root.js`, and the leaf module imports nothing from helpers/workstream-utils.
- Full unit attempt: `cd sdk && npx vitest run --project unit` failed with unrelated residual failures listed above.

## Known Stubs

None.

## Threat Flags

None. The new filesystem reads are the planned `projectDir/.planning/STATE.md` marker check from the plan threat model, with errors swallowed and no path/stack output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can import `planningRootName` directly from `sdk/src/planning-root.ts` and can keep importing the same resolver API through `sdk/src/query/helpers.ts` where that is more ergonomic. The only blocker to broad "unit project green" status is unrelated pre-existing test debt outside this plan scope.

## Self-Check: PASSED

- Found `sdk/src/planning-root.ts`.
- Found `.planning/phases/12-query-registry-workflow-consumption/12-01-SUMMARY.md`.
- Found task commit `bc40063`.
- Found task commit `6927c8c`.

---
*Phase: 12-query-registry-workflow-consumption*
*Completed: 2026-05-26*
