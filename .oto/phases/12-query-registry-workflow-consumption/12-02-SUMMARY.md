---
phase: 12-query-registry-workflow-consumption
plan: 02
subsystem: sdk
tags: [sdk, path-resolution, query-registry, config]
dependency_graph:
  requires: [12-01]
  provides:
    - SDK relPlanningPath planning-root routing
    - SDK loadConfig planning-root routing
    - SDK findProjectRoot hasPlanningRoot routing
    - rebuilt SDK dist output for resolver consumption
  affects:
    - sdk/src/workstream-utils.ts
    - sdk/src/config.ts
    - sdk/src/context-engine.ts
    - sdk/src/query/helpers.ts
    - sdk/src/query/init.ts
    - sdk/src/query/phase.ts
    - sdk/dist/
tech_stack:
  added: []
  patterns:
    - TypeScript SDK with ESM dist rebuild
    - planning-root leaf resolver import to avoid helpers/workstream-utils cycle
key_files:
  created:
    - sdk/dist/planning-root.d.ts
    - sdk/dist/planning-root.d.ts.map
    - sdk/dist/planning-root.js
    - sdk/dist/planning-root.js.map
  modified:
    - sdk/src/workstream-utils.ts
    - sdk/src/config.ts
    - sdk/src/context-engine.ts
    - sdk/src/query/helpers.ts
    - sdk/src/query/init.ts
    - sdk/src/query/phase.ts
    - sdk/src/ws-flag.test.ts
    - sdk/src/query/helpers.test.ts
    - sdk/dist/config.js
    - sdk/dist/config.js.map
    - sdk/dist/query/helpers.d.ts
    - sdk/dist/query/helpers.d.ts.map
    - sdk/dist/query/helpers.js
    - sdk/dist/query/helpers.js.map
    - sdk/dist/workstream-utils.d.ts
    - sdk/dist/workstream-utils.d.ts.map
    - sdk/dist/workstream-utils.js
    - sdk/dist/workstream-utils.js.map
key_decisions:
  - Preserve the Phase 12 resolver contract: unmarked .planning roots are GSD-era and default to .oto.
  - Do not mark this repository's .planning/STATE.md with oto_state_version to force legacy SDK goldens green.
  - Treat the full SDK suite failure as a test-oracle mismatch for old unmarked .planning fixtures, not an implementation rollback trigger.
  - Use Plan 12-04 .oto enumerate plus fixture smoke as the correct new parity proof for migrated OTO roots.
requirements_completed: []
metrics:
  duration: 18m
  completed_at: 2026-05-26T02:23:31Z
  tasks_completed: 3
  files_changed: 22
---

# Phase 12 Plan 02: Query Registry Choke-Point Routing Summary

SDK choke-point path routing now resolves through the .oto-first planning-root contract, with dist rebuilt and the legacy .planning full-suite oracle mismatch documented.

## What Changed

- `relPlanningPath(projectDir, workstream?)` now roots relative planning paths at `planningRootName(projectDir)`.
- `workstream-utils.ts` imports `planningRootName` from `./planning-root.js`, preserving the acyclic import requirement.
- `loadConfig` uses the resolved planning root for root-level `config.json`.
- `planningPaths` and `findProjectRoot` route through `planningRootName` and `hasPlanningRoot` instead of raw `.planning` existence checks.
- Mechanical `relPlanningPath` callsites required for typecheck were updated in `config.ts`, `context-engine.ts`, `query/helpers.ts`, `query/init.ts`, and `query/phase.ts`.
- Focused SDK fixtures were updated to distinguish `.oto`, migrated marker `.planning`, and unmarked GSD-era `.planning` roots.
- `sdk/dist/` was rebuilt and committed, including the new compiled `planning-root` module output.

## Commits

| Commit | Type | Description |
| ------ | ---- | ----------- |
| `0308fa3` | test | Added failing relPlanningPath root selection tests |
| `15e2919` | feat | Routed relPlanningPath through planningRootName |
| `e3333a1` | feat | Routed loadConfig and findProjectRoot through resolver helpers |
| `c95ee13` | chore | Rebuilt SDK dist for planning-root routing |

## Verification

| Check | Result |
| ----- | ------ |
| `cd sdk && npx vitest run src/ws-flag.test.ts --project unit` before implementation | Failed as expected in RED with relPlanningPath still treating the temp repo as a workstream |
| `cd sdk && npx tsc --noEmit -p tsconfig.json` | Passed |
| `cd sdk && npx vitest run src/ws-flag.test.ts --project unit` | Passed, 24 tests |
| `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` | Passed, 95 tests |
| `cd sdk && npx vitest run src/query/workstream.test.ts --project unit` | Passed, 3 tests |
| `cd sdk && npm run build` | Passed |
| Dist checks for `sdk/dist/planning-root.js` and `planningRootName` references | Passed |
| Acceptance grep: `workstream-utils.ts` imports from `./planning-root.js` | Passed |
| Acceptance grep: no `./query/helpers.js` import from `workstream-utils.ts` | Passed |
| Acceptance grep: no hardcoded `'.planning'` in `workstream-utils.ts` | Passed |
| Acceptance grep: `config.ts` no longer uses `join(projectDir, '.planning', 'config.json')` | Passed |
| Acceptance grep: `helpers.ts` own-dir and parent walk use `hasPlanningRoot` | Passed |
| `test ! -d .oto && echo CLEAN` | Passed, output `CLEAN` |
| `npm test` first sandbox run | Failed only because install-smoke could not resolve `registry.npmjs.org` |
| `npm test` escalated rerun | Passed, 620 pass, 0 fail, 1 skipped |

## Residual Blocker

`cd sdk && npm test` does not pass after this plan. The failure is a user-approved plan expectation/test-oracle mismatch, not an implementation rollback trigger.

The full SDK suite reported 43 failed test files and 304 failed tests, with 1116 tests passing. The dominant failure class is that old SDK goldens and many unit fixtures still create or expect unmarked `.planning` roots. Under the Phase 12 resolver contract, an unmarked `.planning` root is GSD-era and is deliberately treated as not migrated, so SDK resolution defaults to `.oto`. Examples include golden read-only parity checks where `state.load` and `state.get` now report `STATE.md not found` for an unmarked `.planning/STATE.md` fixture instead of reading it as an OTO project.

The repo's `.planning/STATE.md` was not marked with `oto_state_version`, and `planningRootName` was not weakened. Plan 12-04's `.oto` enumerate plus fixture smoke is the correct new parity proof for the migrated OTO workflow surface.

## Deviations from Plan

### Auto-fixed Issues

None.

### Documented Deviations

**1. Full SDK suite oracle mismatch**
- **Found during:** Task 3 rebuild and verification
- **Issue:** The plan expected all existing SDK goldens to remain green, but those goldens still model unmarked `.planning` roots as OTO roots.
- **Decision:** Preserve the resolver contract and document the mismatch as residual suite work.
- **Files modified:** None for rollback; summary documents the residual.
- **Commit:** `c95ee13`

**2. Focused test fixture updates outside the initial file list**
- **Found during:** Task 1 and Task 2 focused verification
- **Issue:** The TDD and helper tests needed fixture updates to express `.oto`, migrated `.planning`, and unmarked GSD-era `.planning` behavior.
- **Fix:** Updated `sdk/src/ws-flag.test.ts` and `sdk/src/query/helpers.test.ts`.
- **Commit:** `15e2919`, `e3333a1`

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Summary file created at `.planning/phases/12-query-registry-workflow-consumption/12-02-SUMMARY.md`.
- Task commits exist: `0308fa3`, `15e2919`, `e3333a1`, `c95ee13`.
- `sdk/dist/planning-root.js` exists after rebuild.
- `.oto/` was not created in the repository root.
- All plan deliverables are structurally complete except the explicitly documented full-suite oracle mismatch.
