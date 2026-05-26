---
phase: 12
slug: query-registry-workflow-consumption
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 12-RESEARCH.md §Validation Architecture (D-07 grounding).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (SDK)** | vitest ^3.1.1, projects `unit` + `integration` (`sdk/vitest.config.ts`) |
| **Framework (CJS)** | node:test (root `package.json`, `node --test tests/*.test.cjs`) |
| **Config file** | `sdk/vitest.config.ts` (exists); root CJS uses `node --test` (no config) |
| **Quick run command** | `cd sdk && npx vitest run --project unit` |
| **Full suite command** | `cd sdk && npm test` (unit+integration goldens) **and** root `npm test` (CJS regression) |
| **Estimated runtime** | ~30–60 seconds (SDK vitest) + ~10s (root CJS) |

> **Build trap (from RESEARCH):** TS edits in `sdk/src/` are invisible to any `oto-sdk` binary run until `cd sdk && npm run build` rebuilds the committed `sdk/dist/`. The enumerate-smoke harness dispatches **in-process** via `createRegistry()` to avoid the stale-`dist/` and stale-global-`oto-sdk-v0.1.0`-on-PATH traps.

---

## Sampling Rate

- **After every task commit:** Run `cd sdk && npx vitest run --project unit` (+ the new helpers resolution test)
- **After every plan wave:** Run `cd sdk && npm test` (full vitest incl. goldens) + root `npm test` (CJS regression)
- **Before `/gsd-verify-work`:** Full vitest green + root CJS green + enumerate-smoke passes for every registered workflow key
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

> Filled per-task by gsd-planner. Each task that touches the SDK query layer maps to one of the automated commands below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-1 | 01 | 1 | SDK-03 | T-12-01..03 | error paths swallowed (no path/stack leak) | type-check | `cd sdk && npx tsc --noEmit -p tsconfig.json` | ✅ helpers.ts | ⬜ pending |
| 12-01-2 | 01 | 1 | SDK-03 | — | N/A | unit | `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` | ⚠️ extend | ⬜ pending |
| 12-02-1 | 02 | 2 | SDK-03 | T-12-05 | workstream traversal guard preserved | type-check | `cd sdk && npx tsc --noEmit -p tsconfig.json` | ✅ workstream-utils.ts | ⬜ pending |
| 12-02-2 | 02 | 2 | SDK-03 | T-12-04 | walk-up home upper-bound preserved | unit | `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` | ⚠️ extend | ⬜ pending |
| 12-02-3 | 02 | 2 | SDK-03 | — | N/A | full suite | `cd sdk && npm run build && npm test` | ✅ goldens | ⬜ pending |
| 12-03-1 | 03 | 3 | SDK-03 | T-12-09 | no half-migrated split read/write | type-check | `cd sdk && npx tsc --noEmit -p tsconfig.json` | ✅ init.ts etc | ⬜ pending |
| 12-03-2 | 03 | 3 | SDK-03 | T-12-07,08 | mutation writes stay .oto/-rooted | type-check | `cd sdk && npx tsc --noEmit -p tsconfig.json` | ✅ progress.ts etc | ⬜ pending |
| 12-03-3 | 03 | 3 | SDK-03 | T-12-09 | sweep-completeness (zero stray literals) | full suite | `cd sdk && npm run build && npm test` | ✅ goldens | ⬜ pending |
| 12-04-1 | 04 | 4 | SDK-03 | T-12-10,11 | fixture/temp dir only, never repo root | integration | `cd sdk && npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` | ❌ W0 | ⬜ pending |
| 12-04-2 | 04 | 4 | SDK-05 | T-12-12 | read-only degrades / structural fails fast | static/shell | `node --test tests/sdk-fallback-policy.test.cjs` | ❌ W0 | ⬜ pending |
| 12-04-3 | 04 | 4 | SDK-05 | T-12-13 | doc-text reconciliation (D-06) | static/grep | `grep -F "fail fast" .planning/ROADMAP.md && grep -F "fail fast" .planning/REQUIREMENTS.md` | ✅ docs | ⬜ pending |
| 12-04-4 | 04 | 4 | SDK-03 | — | cross-binary parity | manual | human checkpoint (see Manual-Only Verifications) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Created in Plan 04 Task 1 (smoke harness + fixture) and Plan 04 Task 2 (fallback assertion); the helpers resolution test is created in Plan 01 Task 2.

- [ ] `sdk/src/golden/oto-query-smoke.integration.test.ts` (Plan 04 / Task 1) — enumerate (from `oto/workflows/` + `oto/commands/`) + `registry.has()` filter + fixture `.oto/` dispatch; asserts structured output and zero `.planning/` access. Covers SDK-03 / SC#1+SC#2.
- [ ] `sdk/src/golden/fixtures/oto-project/` (Plan 04 / Task 1) — minimal `.oto/` fixture tree: STATE.md, config.json, ROADMAP.md, REQUIREMENTS.md, one `phases/NN-name/` dir, git-init at runtime for commit-class keys; **no `.planning/`**.
- [ ] Extend `sdk/src/query/helpers.test.ts` (Plan 01 / Task 2) — `planningRootName` / `hasMigratedPlanningRoot` / `hasPlanningRoot` unit cases: `.oto`-only, marker-`.planning`, unmarked-`.planning`, no-root, both-present + marker-regex boundary.
- [ ] `tests/sdk-fallback-policy.test.cjs` (Plan 04 / Task 2) — node:test static assertion that read-only call sites carry `|| echo <default>` and structural call sites carry the hard-require guard (SDK-05).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end `oto-sdk query` against a real migrated `.oto/` project resolves identically to `oto-tools.cjs` | SDK-03 | Cross-binary parity is best confirmed against a real layout, not just in-process dispatch (Plan 04 / Task 4 checkpoint) | After build, run a representative key (e.g. `node bin/oto-sdk.js query state-snapshot --project-dir $D`) and the `oto-tools.cjs` equivalent in a throwaway `.oto/` project; confirm equivalent structured output and no `.planning/` access. Repo root must remain `.oto/`-free. |

*Most phase behaviors have automated verification via the enumerate-smoke harness + helpers unit tests.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Plan 04 Task 4 is the single manual checkpoint, documented above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every auto task has a tsc/vitest/node:test command)
- [x] Wave 0 covers all MISSING references (smoke harness + fixture in Plan 04 T1; helpers tests in Plan 01 T2; fallback assertion in Plan 04 T2)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (pending execution)
