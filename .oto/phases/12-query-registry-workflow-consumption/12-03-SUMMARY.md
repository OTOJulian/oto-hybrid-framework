---
phase: 12-query-registry-workflow-consumption
plan: 03
subsystem: sdk
tags: [sdk, path-resolution, query-registry, planning-root]
dependency_graph:
  requires: [12-02]
  provides:
    - workflow-invoked query handler planning-root sweep
    - root-aware commit docs gate and staging default
    - authoritative rebuilt SDK dist output for swept handlers
  affects:
    - sdk/src/query/init.ts
    - sdk/src/query/init-complex.ts
    - sdk/src/query/commit.ts
    - sdk/src/query/phase.ts
    - sdk/src/query/progress.ts
    - sdk/src/query/state-mutation.ts
    - sdk/src/query/summary.ts
    - sdk/src/query/intel.ts
    - sdk/src/query/skill-manifest.ts
    - sdk/src/query/phase-lifecycle.ts
    - sdk/src/query/workspace.ts
    - sdk/src/query/workstream.ts
    - sdk/src/query/profile-output.ts
    - sdk/dist/
tech_stack:
  added: []
  patterns:
    - TypeScript SDK query handlers import planningRootName from ./helpers.js
    - committed sdk/dist rebuild after source changes
key_files:
  created: []
  modified:
    - sdk/src/query/init.ts
    - sdk/src/query/init-complex.ts
    - sdk/src/query/commit.ts
    - sdk/src/query/phase.ts
    - sdk/src/query/progress.ts
    - sdk/src/query/state-mutation.ts
    - sdk/src/query/summary.ts
    - sdk/src/query/intel.ts
    - sdk/src/query/skill-manifest.ts
    - sdk/src/query/phase-lifecycle.ts
    - sdk/src/query/workspace.ts
    - sdk/src/query/workstream.ts
    - sdk/src/query/profile-output.ts
    - sdk/dist/
key_decisions:
  - Preserve the Phase 12 resolver contract: unmarked .planning roots remain GSD-era and default to .oto.
  - Keep the migrated-marker literal in sdk/src/planning-root.ts; do not add fake helper literals to satisfy stale Plan 03 helper grep text.
  - Treat the full SDK suite failure as the accepted old unmarked .planning fixture oracle mismatch, not an implementation rollback trigger.
requirements_completed: [SDK-03]
metrics:
  duration: 11m
  completed_at: 2026-05-26T02:37:21Z
  tasks_completed: 3
  files_changed: 45
---

# Phase 12 Plan 03: Query Handler Planning-Root Sweep Summary

Workflow-invoked SDK query handlers now route direct `.planning` path construction, existence checks, consumed return strings, and commit gate prefixes through `planningRootName(<dir>)`, with `sdk/dist/` rebuilt.

## What Changed

- Routed `init.ts` raw joins, `pathExists` checks, workspace listing lookup, and consumed return paths through `planningRootName(projectDir)` or `planningRootName(wsPath)` as appropriate.
- Routed workspace, workstream, and skill-manifest planning roots through the resolver.
- Routed `init-complex.ts`, `commit.ts`, `phase.ts`, `progress.ts`, `state-mutation.ts`, `summary.ts`, `intel.ts`, `phase-lifecycle.ts`, and `profile-output.ts` direct planning-root sites through `planningRootName`.
- Made `commit.ts` default staging, `commit_docs` gate filtering, and gate reason strings root-aware.
- Rebuilt and committed `sdk/dist/` from source.
- Preserved intentional residuals: `init-complex.ts` skipDirs `'.planning'`, `phase-lifecycle.ts` archive prose, `paths.planning` access sites, and the migrated-marker check in `sdk/src/planning-root.ts`.

## Commits

| Commit | Type | Description |
| ------ | ---- | ----------- |
| `0df26ab` | feat | Routed init, workspace, workstream, and skill-manifest handler paths through planning root |
| `e90560c` | feat | Routed remaining query handler path, existence, return-string, and commit gate sites |
| `46c67fa` | chore | Rebuilt SDK dist and closed final scoped sweep residual |

## Verification

| Check | Result |
| ----- | ------ |
| Task 1 `grep -cE "join\([^)]*'\.planning'" sdk/src/query/init.ts` | Passed, `0` |
| Task 1 `grep -cE "pathExists\(.*'\.planning" sdk/src/query/init.ts` | Passed, `0` |
| Task 1 consumed return string greps for project, quick, and codebase paths | Passed, all `0` |
| Task 1 workspace/workstream/skill-manifest raw join grep | Passed, all `0` |
| Task 1 `grep -c "planningRootName(wsPath)" sdk/src/query/init.ts` | Passed, `1` |
| Task 1 `grep -c "planningRootName(projectDir)" sdk/src/query/init.ts` | Passed, `26` |
| Task 1 `cd sdk && npx tsc --noEmit -p tsconfig.json` | Passed |
| Task 2 init-complex raw join/pathExists/project_path greps | Passed, all `0` |
| Task 2 `grep -cF "'.planning'" sdk/src/query/init-complex.ts` | Passed, `1` |
| Task 2 commit.ts raw join, prefix, and `.planning/` greps | Passed, all `0` |
| Task 2 `grep -c "planningRootName(projectDir)" sdk/src/query/commit.ts` | Passed, `3` |
| Task 2 phase.ts archive greps | Passed, both `0` |
| Task 2 remaining raw join grep across progress/state/summary/intel/phase-lifecycle/profile-output | Passed, all `0` |
| Task 2 `grep -c "planningRootName(cwd)" sdk/src/query/profile-output.ts` | Passed, `5` |
| Task 2 `cd sdk && npx tsc --noEmit -p tsconfig.json` | Passed |
| `cd sdk && npm run build` | Passed |
| Exact scoped sweep grep from Task 3 | Passed: printed nothing |
| `grep -cF "'.planning'" sdk/src/query/init-complex.ts` | Passed, `1` |
| `grep -F "join(projectDir, '.planning', 'STATE.md')" sdk/src/query/helpers.ts` | Did not match; accepted Plan 12-02 moved the marker literal into `sdk/src/planning-root.ts` |
| `grep -F "join(projectDir, '.planning', 'STATE.md')" sdk/src/planning-root.ts` | Passed, marker literal still exists in resolver leaf module |
| `test ! -d .oto && echo CLEAN` | Passed, output `CLEAN` |
| `git status --short sdk/dist/` after build | Passed, dist files modified before Task 3 commit |
| `cd sdk && npm test` | Failed with accepted oracle mismatch: 45 failed files, 320 failed tests, 1100 passed |
| root `npm test` in sandbox | Failed only on install-smoke DNS for `registry.npmjs.org` |
| root `npm test` escalated rerun | Passed, 620 pass, 0 fail, 1 skipped |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Routed workstream create reason string caught by scoped sweep**
- **Found during:** Task 3 scoped sweep
- **Issue:** `sdk/src/query/workstream.ts` still returned a live `.planning/ directory not found` reason string. It was not in Task 1's narrow site list, but Task 3's authoritative sweep correctly caught it as an un-whitelisted literal in a swept file.
- **Fix:** Changed the reason string to `${planningRootName(projectDir)}/ directory not found`.
- **Files modified:** `sdk/src/query/workstream.ts`, rebuilt `sdk/dist/query/workstream.*`
- **Verification:** Exact scoped sweep printed nothing after the fix.
- **Commit:** `46c67fa`

### Documented Deviations

**1. Full SDK suite oracle mismatch**
- **Found during:** Task 3 verification
- **Issue:** `cd sdk && npm test` still expects old unmarked `.planning` temp fixtures and repo goldens to behave as OTO roots. The preserved Phase 12 resolver contract treats unmarked `.planning` as GSD-era and defaults to `.oto`, so many fixture reads report missing `.oto` files.
- **Decision:** Preserve the resolver contract from 12-02 and document the mismatch. Do not mark this repo's `.planning/STATE.md`, do not weaken `planningRootName`, and do not update old oracle fixtures in this plan.
- **Observed result:** 45 failed files, 320 failed tests, 1100 passed.

**2. Stale helper-marker acceptance grep**
- **Found during:** Task 3 acceptance checks
- **Issue:** The plan expected `join(projectDir, '.planning', 'STATE.md')` in `sdk/src/query/helpers.ts`, but Plan 12-02 intentionally moved planning-root resolution into the dependency-free leaf module `sdk/src/planning-root.ts` and re-exported it from helpers.
- **Decision:** Preserve that accepted 12-02 resolver split. The marker literal remains in `sdk/src/planning-root.ts`; adding a fake helpers literal would undermine the code shape.

**3. Root npm test sandbox DNS failure**
- **Found during:** Task 3 root verification
- **Issue:** The first root `npm test` failed only because install-smoke could not resolve `registry.npmjs.org` for `@anthropic-ai/claude-agent-sdk`.
- **Fix:** Reran the same command with network escalation.
- **Verification:** Escalated root `npm test` passed with 620 passing, 0 failing, 1 skipped.

**Total deviations:** 1 auto-fixed, 3 documented.
**Impact:** The implementation scope stayed within the plan's swept files and `sdk/dist/`. The only unresolved verification item is the already accepted old unmarked `.planning` SDK test oracle mismatch.

## Known Stubs

- `sdk/src/query/profile-output.ts:594` contains existing fallback text: `Stack preferences not available...`.
- `sdk/src/query/profile-output.ts:882` and `:895` contain existing `placeholder_added` profile status handling.

These were pre-existing profile-output fallback paths, not introduced by this plan, and do not block the path-resolution sweep.

## Threat Flags

None.

## Next Phase Readiness

Plan 12-04 can build the `.oto` enumerate-and-fixture smoke harness against this rebuilt SDK output. That remains the correct parity proof for migrated OTO roots.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/12-query-registry-workflow-consumption/12-03-SUMMARY.md`.
- Task commits exist: `0df26ab`, `e90560c`, `46c67fa`.
- Repo root remains `.oto/`-free.
- Exact scoped sweep grep printed nothing.
