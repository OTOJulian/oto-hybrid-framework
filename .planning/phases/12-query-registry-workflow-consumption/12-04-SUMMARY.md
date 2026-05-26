---
phase: 12-query-registry-workflow-consumption
plan: 04
subsystem: sdk
tags: [sdk, query-registry, oto-root, workflow-fallback, parity]
dependency_graph:
  requires: [12-03]
  provides:
    - enumerate-and-fixture smoke harness for workflow-invoked query keys
    - migrated .oto golden fixture with no .planning root
    - tiered workflow fallback policy and scoped static assertion
    - D-04 CJS audit confirmation
    - D-06 ROADMAP and REQUIREMENTS reconciliation
    - manual cross-binary .oto parity confirmation
  affects:
    - sdk/src/golden/oto-query-smoke.integration.test.ts
    - sdk/src/golden/fixtures/oto-project/
    - oto/workflows/lib/sdk-require.md
    - oto/workflows/execute-phase.md
    - oto/workflows/autonomous.md
    - tests/sdk-fallback-policy.test.cjs
tech_stack:
  added: []
  patterns:
    - Vitest integration smoke enumerates workflow query tokens and dispatches in-process via createRegistry()
    - Structural workflow calls hard-require oto-sdk; read-only calls degrade with 2>/dev/null fallback
key_files:
  created:
    - sdk/src/golden/oto-query-smoke.integration.test.ts
    - sdk/src/golden/fixtures/oto-project/.oto/STATE.md
    - sdk/src/golden/fixtures/oto-project/.oto/config.json
    - sdk/src/golden/fixtures/oto-project/.oto/ROADMAP.md
    - sdk/src/golden/fixtures/oto-project/.oto/REQUIREMENTS.md
    - sdk/src/golden/fixtures/oto-project/.oto/phases/01-sample/01-01-PLAN.md
    - oto/workflows/lib/sdk-require.md
    - tests/sdk-fallback-policy.test.cjs
  modified:
    - oto/workflows/execute-phase.md
    - oto/workflows/autonomous.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key_decisions:
  - Preserve the Phase 12 resolver contract: unmarked .planning roots remain GSD-era and default to .oto.
  - Treat the full SDK suite failure as the accepted old unmarked .planning fixture oracle mismatch, not an implementation rollback trigger.
  - SDK-05 uses a tiered fallback model: read-only query calls degrade to defaults; structural/stateful calls fail fast with one clear error.
  - Leave the CJS layer unchanged after D-04 audit confirmation.
requirements_completed: [SDK-03, SDK-05]
metrics:
  duration: 36m
  completed_at: 2026-05-26T03:08:23Z
  tasks_completed: 4
  files_changed: 13
---

# Phase 12 Plan 04: Query Registry Smoke and Fallback Policy Summary

Workflow query coverage now has a migrated `.oto/` fixture smoke harness, SDK-05 has an explicit tiered fallback policy, and cross-binary `.oto/` parity was manually confirmed.

## What Changed

- Added `sdk/src/golden/oto-query-smoke.integration.test.ts`, which extracts `oto-sdk query <token>` calls from `oto/workflows` and `oto/commands`, filters them through `createRegistry()` / `resolveQueryArgv()`, dispatches read-only registered keys in-process against a copied `.oto/` fixture, and asserts no project-rooted output resolves through `.planning/`.
- Added a minimal migrated fixture under `sdk/src/golden/fixtures/oto-project/.oto/` with `STATE.md`, `config.json`, `ROADMAP.md`, `REQUIREMENTS.md`, and one sample phase plan. The fixture intentionally contains no `.planning/`.
- Documented the D-05 structural hard-require guard in `oto/workflows/lib/sdk-require.md`.
- Applied the guard to `oto/workflows/execute-phase.md` and `oto/workflows/autonomous.md`, and converted representative `agent-skills` reads in `execute-phase.md` to the read-only degradation idiom.
- Added `tests/sdk-fallback-policy.test.cjs`, scoped to representative read-only keys (`config-get`, `resolve-model`, `agent-skills`) and the representative structural workflows.
- Reconciled `.planning/ROADMAP.md` Phase 12 SC#4 and `.planning/REQUIREMENTS.md` SDK-05 to the tiered model.
- Confirmed D-04 CJS references remain correct-by-design; no CJS code was changed.

## Commits

| Commit | Type | Description |
| ------ | ---- | ----------- |
| `cc4a7df` | test | Added the TDD RED smoke harness before the fixture existed |
| `27b3f42` | feat | Added the migrated `.oto/` fixture tree |
| `6ea3d67` | feat | Added SDK fallback guard policy, representative workflow guards, and static policy test |
| `4e3374a` | docs | Reconciled ROADMAP and REQUIREMENTS fallback wording |

## Verification

| Check | Result |
| ----- | ------ |
| RED: `cd sdk && npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` before fixture | Failed as expected because `.oto/STATE.md` was missing |
| `test -f sdk/src/golden/fixtures/oto-project/.oto/STATE.md && echo OK` | Passed, output `OK` |
| `test ! -d sdk/src/golden/fixtures/oto-project/.planning && echo NO_PLANNING` | Passed, output `NO_PLANNING` |
| `grep -F "oto_state_version" sdk/src/golden/fixtures/oto-project/.oto/STATE.md` | Passed |
| `grep -c "createRegistry" sdk/src/golden/oto-query-smoke.integration.test.ts` | Passed, output `3` |
| `grep -cE "registry.has|resolveQueryArgv" sdk/src/golden/oto-query-smoke.integration.test.ts` | Passed, output `4` |
| `grep -F ".planning" sdk/src/golden/oto-query-smoke.integration.test.ts` | Passed, negative assertions present |
| `cd sdk && npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` | Passed, 2 tests |
| `test -f oto/workflows/lib/sdk-require.md && echo OK` | Passed, output `OK` |
| `grep -F "command -v oto-sdk" oto/workflows/lib/sdk-require.md` | Passed |
| `grep -F "2>/dev/null || echo" oto/workflows/lib/sdk-require.md` | Passed |
| `grep -rlF "command -v oto-sdk" oto/workflows/execute-phase.md oto/workflows/autonomous.md` | Passed, listed both files |
| `grep -cE "config-get|resolve-model|agent-skills" tests/sdk-fallback-policy.test.cjs` | Passed, output `4` |
| `node --test tests/sdk-fallback-policy.test.cjs` | Passed, 3 tests |
| D-04 audit grep across 9 CJS files | Passed by classification; no CJS logic change |
| ROADMAP old fallback literal grep | Passed, returned nothing |
| `grep -F "fail fast" .planning/ROADMAP.md` | Passed |
| REQUIREMENTS old SDK-05 literal grep | Passed, returned nothing |
| `grep -F "tiered fallback" .planning/REQUIREMENTS.md` | Passed |
| `grep -F "**SDK-03**" .planning/REQUIREMENTS.md` | Passed, unchanged |
| `test ! -d .oto && echo CLEAN` | Passed, output `CLEAN` |
| root `npm test` | First sandbox run failed on DNS to `registry.npmjs.org`; network-enabled rerun passed with 623 pass, 0 fail, 1 skipped |
| `cd sdk && npm test` | Failed with accepted old unmarked `.planning` fixture oracle mismatch: 45 failed files, 320 failed tests, 1102 passed |
| Human Task 4 parity check | Approved: repo-local `oto-sdk` and CJS `oto-tools.cjs` returned equivalent structured state-snapshot JSON against `/var/folders/sh/b81x8yx935zfwjl0sv2z84mm0000gn/T/tmp.AlsAluAV2Q`, and repo root stayed `.oto/`-free |

## D-04 CJS Audit Verdict

| File | Verdict |
| ---- | ------- |
| `core.cjs` | CONFIRM: intentional migrated-marker check plus comments/config keys; path access routes through planning helpers |
| `init.cjs` | CONFIRM: path access routes through helpers; known `.planning/quick` display return left unchanged |
| `state.cjs` | CONFIRM: uses `planningPaths` / `planningDir` |
| `migrate.cjs` | CONFIRM: intentional `.planning` to `.oto` migration dual-root logic |
| `drift.cjs` | CONFIRM: comments/doc strings only |
| `commands.cjs` | CONFIRM: staged-file filter intentionally accepts `.oto/` and `.planning\` |
| `milestone.cjs` | CONFIRM: cosmetic archive prose string only |
| `verify.cjs` | CONFIRM: comment/display reference only |
| `gsd2-import.cjs` | CONFIRM: reverse-migration tool, cosmetic message mismatch only |

## Deviations from Plan

### Documented Deviations

**1. Full SDK suite oracle mismatch**
- **Found during:** Plan-level verification
- **Issue:** `cd sdk && npm test` still expects old unmarked `.planning` temp fixtures and repo goldens to behave as OTO roots. The preserved Phase 12 resolver contract treats unmarked `.planning` as GSD-era and defaults to `.oto`, so many fixture reads report missing `.oto` files.
- **Decision:** Preserve the resolver contract from 12-02 and document the mismatch. Do not mark this repo's `.planning/STATE.md`, do not weaken `planningRootName`, and do not update old oracle fixtures in this plan.
- **Observed result:** 45 failed files, 320 failed tests, 1102 passed.

**2. Root npm test sandbox DNS failure**
- **Found during:** Plan-level verification
- **Issue:** The first root `npm test` failed only because install-smoke could not resolve `registry.npmjs.org` for `@anthropic-ai/claude-agent-sdk`.
- **Fix:** Reran the same command with network escalation.
- **Verification:** Escalated root `npm test` passed with 623 passing, 0 failing, 1 skipped.

**3. Verification report side effects restored**
- **Found during:** Post-verification status check
- **Issue:** Root `npm test` rewrote `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md`.
- **Fix:** Restored only those generated report files with scoped git checkout; unrelated dirty files were preserved.
- **Verification:** `git status --short` returned only the pre-existing unrelated dirty files.

**Total deviations:** 0 auto-fixed, 3 documented.
**Impact:** The plan scope stayed bounded. The only unresolved SDK verification item is the previously accepted old unmarked `.planning` fixture oracle mismatch.

## Known Stubs

None introduced.

## Threat Flags

None.

## Next Phase Readiness

Phase 12 is complete. Phase 13 can migrate this repo from `.planning/` to `.oto/` with the SDK registry and representative workflow fallback policy already verified.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/12-query-registry-workflow-consumption/12-04-SUMMARY.md`.
- Task commits exist: `cc4a7df`, `27b3f42`, `6ea3d67`, `4e3374a`.
- Repo root remains `.oto/`-free.
- Task 4 human parity approval was supplied by the user.
