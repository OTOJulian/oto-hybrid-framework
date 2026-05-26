---
phase: 12-query-registry-workflow-consumption
verified: 2026-05-26T17:06:59Z
status: passed
score: 4/4 success criteria verified
overrides_applied: 0
requirements:
  SDK-03: passed
  SDK-05: passed
checks:
  automated: 8
  manual: 1
  failed: 0
re_verification:
  note: "Retroactive backfill — no prior VERIFICATION.md existed. Initial verification."
---

# Phase 12: Query registry + workflow consumption — Verification Report

**Phase Goal:** The query registry answers every key the ported workflows invoke against oto namespaces and `.oto/` paths, and workflows consume that output when present while still degrading gracefully to manual fallback when it is absent.
**Verified:** 2026-05-26T17:06:59Z
**Status:** passed
**Re-verification:** No — retroactive backfill (every other v0.4.0 phase has a VERIFICATION.md; this closes the gap before milestone archive).

## Verdict

Phase 12 passed. The `oto-sdk query` registry resolves all workflow-invoked namespaces (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) against `.oto/` paths via a single ported resolver authority (`planningRootName`), workflows consume that structured output through `$(oto-sdk query …)` capture, and the tiered fallback policy is wired and enforced — read-only keys degrade with `2>/dev/null || echo <default>` and structural/stateful keys are hard-required to fail fast with one clear actionable error. All four success criteria were verified against the actual implemented code and live binary, not summaries. One non-blocking deviation was found in the out-of-scope CJS tool (`init.cjs` `task_dir`), recorded below.

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `oto-sdk query` answers every key the ported workflows invoke (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) using oto namespaces. | VERIFIED | `sdk/src/query/index.ts` registers 260 keys including 20 `init.*`, `agent-skills`, `commit`/`commit-to-subrepo`, 25+ `state.*`/`state-snapshot`, and 12 `phase.*`/`phases.*`. Live: `oto-sdk query init.plan-phase 12`, `phases.list`, `state-snapshot`, `agent-skills` all returned structured output. The enumerate-smoke test extracts every `oto-sdk query <key>` token from `oto/workflows`+`oto/commands`, filters via `registry.has()`, and dispatches each — passed (2/2). |
| 2 | Query keys resolve against `.oto/` paths (not GSD's `.planning/` or upstream namespaces). | VERIFIED | Single resolver `planningRootName` ported byte-for-byte from `oto/bin/lib/core.cjs:65-69` into leaf module `sdk/src/planning-root.ts:44-48`. Choke points routed: `workstream-utils.ts:32` (`relPlanningPath`), `config.ts:157-158` (`loadConfig`), `helpers.ts:485,513,516` (`findProjectRoot`/`planningPaths`). Sweep of 13 handler files left only the 2 intentional literals (`init-complex.ts:122` skipDirs, `phase-lifecycle.ts:1796` archive-prose) — all others are comments. Live scan of 10 SC#1 keys returned 0 `.planning` leak lines; `init.plan-phase 12` returned `.oto/STATE.md`, `.oto/ROADMAP.md`, `.oto/phases/…`. |
| 3 | Workflows that call `oto-sdk query …` consume its structured output when the SDK is present. | VERIFIED | `oto/workflows/execute-phase.md` captures `INIT=$(oto-sdk query init.execute-phase …)` (:76), `PLAN_INDEX=$(oto-sdk query phase-plan-index …)` (:250), `oto-sdk query state.begin-phase …` (:241), `commit` (:821), `roadmap.update-plan-progress` (:816); `autonomous.md` captures `config-get` (:194,298,371,495). Read-only keys consistently use the degradation idiom. |
| 4 | When `oto-sdk` is absent, read-only queries degrade to sensible defaults and the workflow continues; structural/stateful operations fail fast with one clear, actionable error rather than silently completing. | VERIFIED | `oto/workflows/lib/sdk-require.md` documents the tiered policy: hard-require guard (`command -v oto-sdk … exit 1` with install hint) for structural keys, `2>/dev/null || echo <default>` for read-only. `execute-phase.md:70` and `autonomous.md:51` carry the guard immediately before structural use. Read-only keys (`config-get`, `resolve-model`, `agent-skills`, `context_window`, …) use the degradation idiom throughout. `tests/sdk-fallback-policy.test.cjs` enforces all three properties — passed 3/3. ROADMAP SC#4 and REQUIREMENTS SDK-05 reconciled to this language (D-06). |

**Score:** 4/4 success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `sdk/src/planning-root.ts` | Dependency-free leaf resolver (`planningRootName`/`hasMigratedPlanningRoot`/`hasPlanningRoot`) | VERIFIED | Imports only `node:path`+`node:fs`; byte-for-byte parity with `core.cjs:47-73`; breaks the helpers↔workstream-utils cycle by construction. |
| `sdk/src/query/helpers.ts` | Re-exports resolvers; `findProjectRoot`/`planningPaths` route through resolver | VERIFIED | Re-exports the three fns from `../planning-root.js` (:27-34); `findProjectRoot` uses `hasPlanningRoot` for own-dir (:485) and walk-up (:513), config path via `planningRootName(parent)` (:516). |
| `sdk/src/workstream-utils.ts` | `relPlanningPath` rooted via `planningRootName`, leaf import | VERIFIED | Imports from `./planning-root.js` (:9, acyclic); `relPlanningPath` roots at `planningRootName(projectDir)` (:32). |
| `sdk/src/config.ts` | `loadConfig` routes through resolved root | VERIFIED | `configPath` via `relPlanningPath` (:157), `rootConfigPath` via `planningRootName` (:158) — no hardcoded `.planning/config.json`. |
| `sdk/src/query/*.ts` (13 swept handlers) | All raw `.planning` join/existence/return sites routed through `planningRootName` | VERIFIED | Only 2 code-level literals remain (the documented intentional exceptions); all other matches are comments/JSDoc. `planningRootName`/`relPlanningPath`/`paths.planning` routing present across all 13 files. |
| `sdk/src/golden/oto-query-smoke.integration.test.ts` | Enumerate+fixture in-process smoke | VERIFIED | Substantive: enumerates tokens, `registry.has()` filter, dispatches against fixture `.oto/`, asserts structured `data` (no `error`) and zero `.planning/` access. Passed 2/2. |
| `sdk/src/golden/fixtures/oto-project/` | Minimal `.oto/` fixture, no `.planning/` | VERIFIED | Contains `.oto/{STATE.md,config.json,ROADMAP.md,REQUIREMENTS.md,phases/01-sample/01-01-PLAN.md}`; no `.planning/`. |
| `oto/workflows/lib/sdk-require.md` | Hard-require guard idiom doc (D-05) | VERIFIED | Documents structural guard with `exit 1` + install hint and read-only degradation idiom; states structural ops are not reimplemented in bash. |
| `tests/sdk-fallback-policy.test.cjs` | Scoped static policy assertion | VERIFIED | Asserts doc idioms, structural guard in representative workflows, and read-only fallback on representative keys. Passed 3/3. |
| `.oto/ROADMAP.md` / `.oto/REQUIREMENTS.md` | SC#4/SDK-05 reconciled to tiered model (D-06) | VERIFIED | Both carry "degrade to sensible defaults" + "fail fast with one clear, actionable error". (Plan 04 frontmatter named `.planning/` paths; repo migrated to `.oto/` in Phase 13 — reconciled text lives at `.oto/`.) |
| `sdk/dist/` | Committed build reflects source | VERIFIED | `dist/planning-root.js` present with `planningRootName`; `dist/query/commit.js` carries WR-01 fix; `dist/query/progress.js` carries `assertPathInside` (CR-01). `git status sdk/dist/` clean — the live binary serves the verified code (closes the stale-`dist/` build trap from VALIDATION). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sdk/src/planning-root.ts planningRootName` | `oto/bin/lib/core.cjs:65 planningRootName` | behavioral parity | WIRED | `.oto` first / marker-`.planning` fallback / `.oto` default — identical logic confirmed side-by-side. |
| `sdk/src/query/helpers.ts` | `sdk/src/planning-root.ts` | re-export | WIRED | `from '../planning-root.js'` at :30. |
| `sdk/src/workstream-utils.ts relPlanningPath` | `planning-root.ts planningRootName` | leaf import (acyclic) | WIRED | `from './planning-root.js'` at :9; no ESM cycle. |
| `sdk/src/config.ts loadConfig` | `planningRootName` | config path construction | WIRED | :157-158. |
| `sdk/src/query/helpers.ts findProjectRoot` | `hasPlanningRoot` | own-dir + walk-up predicate | WIRED | :485, :513. |
| `golden smoke test` | `createRegistry` + fixture `.oto/` | in-process dispatch | WIRED | Test dispatches via `createRegistry()` against `mkdtemp` copy of fixture. |
| `execute-phase.md` / `autonomous.md` | `oto-sdk query` | `$(…)` capture + hard-require guard | WIRED | Structured output captured into shell vars; guard precedes structural use. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `oto-sdk query init.plan-phase` | `phase_dir`/`state_path`/`roadmap_path` | `planningPaths`→`planningRootName` against repo `.oto/` | Yes | FLOWING — returned `.oto/phases/12-…`, `.oto/STATE.md`, `.oto/ROADMAP.md`. |
| `oto-sdk query state-snapshot` | snapshot JSON | `.oto/STATE.md` read | Yes | FLOWING — returned `status: milestone_complete`, no `.planning` leak. |
| `oto-sdk query phases.list` | `directories[]` | `.oto/phases/` readdir | Yes | FLOWING — returned the migrated phase directory list. |
| `golden smoke` structured reads | `result.data` per key | registry dispatch vs fixture `.oto/` | Yes | FLOWING — asserts `data` present, no `error`, no `.planning/` path. |
| `execute-phase.md INIT` | `$INIT` | `$(oto-sdk query init.execute-phase …)` | Yes | FLOWING — consumed downstream for phase/plan/model fields. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Resolver unit cases (5 layouts) | `npx vitest run src/query/helpers.test.ts --project unit` | 95 pass | PASS |
| Enumerate+fixture smoke (SC#1+SC#2) | `npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` | 2 pass | PASS |
| Tiered fallback policy (SDK-05) | `node --test tests/sdk-fallback-policy.test.cjs` | 3 pass, 0 fail | PASS |
| SDK type-check | `npx tsc --noEmit -p tsconfig.json` | exit 0, no errors | PASS |
| Live SC#1 keys, no `.planning` leak | `oto-sdk query {10 keys}` | 0 leak lines across all | PASS |
| Cross-binary parity (manual checkpoint) | `oto-sdk` vs `oto-tools.cjs` `state-snapshot --project-dir <throwaway .oto/>` | Equivalent output, no `.planning/` created | PASS |
| SDK `init.quick` task_dir rooted | `oto-sdk query init.quick "test task"` | `task_dir: .oto/quick/…` | PASS |
| Committed dist serves verified code | `git status --short sdk/dist/` | clean | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SDK-03 | 12-01, 12-02, 12-03, 12-04 | Registry answers every workflow-invoked key using oto namespaces and `.oto/` paths. | SATISFIED | 260 registered keys covering all SC#1 namespaces; single resolver authority; sweep complete (only 2 intentional literals); live SC#1 keys resolve `.oto/` with 0 leaks; enumerate-smoke + helpers tests green. |
| SDK-05 | 12-04 | Tiered fallback — read-only degrades, structural/stateful fails fast with one clear actionable error. | SATISFIED | `sdk-require.md` documents both tiers; guards present in representative workflows; read-only degradation idiom in place; `tests/sdk-fallback-policy.test.cjs` enforces it (3/3); ROADMAP/REQUIREMENTS reconciled. |

### Review Gate

`12-REVIEW.md` present with `status: fixed` — 1 critical (CR-01 todo path-traversal) + 3 warnings (WR-01 commit staging, WR-02 init workstream forwarding, WR-03 phase-lifecycle roadmap workstream) all resolved. Independently re-verified in code:
- CR-01: `progress.ts:29-31,559-560` `assertPathInside` guards source/dest, also present in committed `dist`.
- WR-01: `commit.ts:137-138` default stage scoped to `relative(projectDir, paths.planning)`.
- WR-02: `init.ts:281,288-289,360,367-369,580-581` forward `workstream` into `loadConfig`/`getModelAlias`/verify-work.
- WR-03: `phase-lifecycle.ts` roadmap mutations close with `}, workstream)` at :289,:444,:553,:951,:1313,:1845 and forward `workstream` into `extractCurrentMilestone`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `oto/bin/lib/init.cjs` | 554 | Hardcoded `.planning/quick/…` `task_dir` while sibling `quick_dir` (:553) is `.oto/quick` | WARNING | CJS-only inconsistency. Live CJS `init quick` returns `task_dir: .planning/quick/…`. Out of Phase 12's SDK scope (SDK-03/SDK-05 target `oto-sdk query`); the in-scope SDK handler (`init.ts:534-535`) routes both through `planningRootName` and returns `.oto/quick/…` correctly. Contradicts the D-04 "CJS correct-by-design" assertion. See deviation below. |
| `sdk/src/query/init-complex.ts` | 122 | `.planning` literal in `skipDirs` | INFO | Intentional, documented exception (Plan 03 truth #5) — a directory-walk skip list. |
| `sdk/src/query/phase-lifecycle.ts` | 1796 | `.planning/REQUIREMENTS.md` in archive prose | INFO | Intentional, documented exception (Plan 03 truth #5) — archived-milestone display text, not a live path. |
| `oto/bin/lib/{core,migrate,gsd2-import}.cjs` | various | `.planning` literals | INFO | Resolver marker authority (`core.cjs:56,67`) and GSD→oto migration tooling — `.planning` references are required by design. |

### Human Verification

The Plan 04 cross-binary parity checkpoint (manual-only per `12-VALIDATION.md`) was exercised during this verification: `oto-sdk query state-snapshot` and `oto-tools.cjs state-snapshot` against a throwaway `.oto/` project produced equivalent structured output with no `.planning/` access and no `.planning/` directory created. No further human verification is required for goal achievement.

### Issues and Deviations

- **CJS `init.cjs:554` `task_dir` `.planning/` literal (WARNING, non-blocking).** The CJS `init.quick` handler returns `task_dir: .planning/quick/…` while its `quick_dir` is `.oto/quick` — an internal inconsistency. This is a defect in the CJS tool, not the SDK. Phase 12's success criteria and requirements (SDK-03, SDK-05) govern the `oto-sdk query` registry, where the equivalent handler (`sdk/src/query/init.ts:534-535`) correctly roots both fields through `planningRootName` and returns `.oto/quick/…`. Phase 12 explicitly scoped CJS as "no CJS logic change" (D-04), and this literal narrowly contradicts that audit's "correct-by-design" claim. It does not block the phase goal because the goal is about the query registry. Recommend a follow-up `/oto-quick` to align `init.cjs:554` with `quick_dir`. No later milestone phase exists to defer it to (Phase 13 dogfood migration is already complete).

### Gaps Summary

No gaps blocking the phase goal. All four success criteria are met at the SDK level — the layer the goal and requirements (SDK-03, SDK-05) actually govern — verified against implemented code, live binary output, and green tests, with the committed `sdk/dist/` confirmed to serve the verified source. The single deviation is a non-blocking CJS-only inconsistency outside the phase's success-criteria scope.

## Conclusion

All Phase 12 success criteria are met:

1. `oto-sdk query` answers every workflow-invoked namespace (`init.*`, `agent-skills`, `commit`, `state.*`, `phases.*`) — 260 registered keys, enumerate-smoke green.
2. Keys resolve against `.oto/` paths via a single ported resolver authority — sweep complete, 0 live `.planning/` leaks.
3. Workflows consume structured `oto-sdk query` output via `$(…)` capture.
4. Tiered fallback wired and enforced — read-only degrades, structural fails fast with one clear actionable error; ROADMAP/REQUIREMENTS reconciled.

Status: **passed** (4/4). One non-blocking CJS deviation noted for follow-up.

---

_Verified: 2026-05-26T17:06:59Z_
_Verifier: Claude (oto-verifier)_
