---
phase: 12
slug: query-registry-workflow-consumption
status: draft
nyquist_compliant: false
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

> Filled per-task by gsd-planner. Each task that touches the SDK query layer must map to one of the automated commands below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-XX-XX | XX | X | SDK-03 | — | N/A | unit | `cd sdk && npx vitest run src/query/helpers.test.ts --project unit` | ⚠️ extend | ⬜ pending |
| 12-XX-XX | XX | X | SDK-03 | — | N/A | integration | `cd sdk && npx vitest run src/golden/oto-query-smoke.integration.test.ts --project integration` | ❌ W0 | ⬜ pending |
| 12-XX-XX | XX | X | SDK-05 | — | read-only degrades to default | static/shell | grep-assert read-only call sites carry `2>/dev/null \|\| echo <default>` | ❌ W0 | ⬜ pending |
| 12-XX-XX | XX | X | SDK-05 | — | structural ops fail fast | static/shell | grep-assert structural call sites carry hard-require guard | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `sdk/src/golden/oto-query-smoke.integration.test.ts` — enumerate (from `oto/workflows/` + `oto/commands/`) + `registry.has()` filter + fixture `.oto/` dispatch; asserts structured output and zero `.planning/` access. Covers SDK-03 / SC#1+SC#2.
- [ ] `sdk/src/golden/fixtures/oto-project/` (or temp-dir builder) — minimal `.oto/` fixture tree: STATE.md, config.json, ROADMAP.md, REQUIREMENTS.md, one `phases/NN-name/` dir, git-init for commit-class keys; **no `.planning/`**.
- [ ] Extend `sdk/src/query/helpers.test.ts` (or new file) — `planningRootName` / `hasMigratedPlanningRoot` / `hasPlanningRoot` unit cases: `.oto`-only, marker-`.planning`, unmarked-`.planning`, no-root, both-present.
- [ ] Shell/static assertion (node:test or grep script) that read-only call sites carry `|| echo <default>` and structural call sites carry the hard-require guard (SDK-05).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end `oto-sdk query` against a real migrated project resolves `.oto/` identically to `oto-tools.cjs` | SDK-03 | Cross-binary parity is best confirmed against a real layout, not just in-process dispatch | After build, run a representative key (e.g. `oto-sdk query state-snapshot`) and `oto-tools.cjs` equivalent in a `.oto/` project; diff structured output |

*Most phase behaviors have automated verification via the enumerate-smoke harness + helpers unit tests.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (smoke harness, fixture, helpers tests, fallback assertion)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
