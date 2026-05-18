---
milestone: v0.3.0
milestone_name: Restore doc-intake and eval-review agents
status: milestone_completion_pending
phases: [1, 2, 3]
plans_total: 9
requirements_total: 20
predecessor: v0.2.0
---

# Milestone v0.3.0: Restore doc-intake and eval-review agents

**Status:** milestone completion pending - Phase 3 security verified
**Phases:** 1–3
**Total Requirements:** 20 (AGNT-01..03, WF-ING-01..04, WF-EVAL-01..02, CMD-01..03, INST-01..03, TEST-01..03, ADR-01, PRTY-01)
**Granularity:** fine
**Predecessor:** v0.2.0 (shipped 2026-05-07)

## Overview

This milestone surgically reverses the ADR-07 carveout for the three agents that powered the two `[deferred]` commands left in v0.1.0's `/oto-help`: `/oto-ingest-docs` and `/oto-eval-review`. The goal is "no more dead commands in `/oto-help`" — both commands invoke real, executable workflows backed by ported agents, with per-runtime parity and test coverage matching the v0.1.0 / v0.2.0 bar.

The phase shape follows the natural dependency chain:

1. **Phase 1 — Agent ports + installer wiring.** The three agents and their installer plumbing are the foundation: nothing else can dispatch what doesn't exist. Codex sandbox declarations are decided per-agent here.
2. **Phase 2 — Workflow rebrand-ports + command de-deferral.** Workflows replace the deferral stubs; command files drop the "intentionally non-executable" refusal; `/oto-help` stops advertising `[deferred]`.
3. **Phase 3 — Tests, install-smoke, per-runtime parity, ADR-15.** Coverage and parity checks close the loop. ADR-15 records the partial reversal of ADR-07 against the criterion ADR-07 itself named.

This produces three live commands (`/oto-ingest-docs`, `/oto-eval-review`, plus all previously-shipped commands) with 23 + 3 = 26 retained agents — well under GSD's original 33, but enough to retire both deferral stubs.

Three ports + de-deferral of two existing commands → MINOR semver bump per CLAUDE.md versioning rules.

## Phases

- [x] **Phase 1: Agent ports + installer wiring** — Port `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor` agents and wire them into the per-runtime installer with correct Codex sandboxes.
- [x] **Phase 2: Workflow rebrand-ports + command de-deferral** — Rebrand-port `ingest-docs.md` and `eval-review.md` workflows; strip deferral framing from `/oto-ingest-docs`, `/oto-eval-review`, and `/oto-help`.
- [x] **Phase 3: Tests, install-smoke, parity, ADR-15** — Port `ingest-docs.test.cjs`, add `eval-review.test.cjs`, extend install-smoke for new agents, run per-runtime parity check, write ADR-15.

## Phase Details

### Phase 1: Agent ports + installer wiring

**Goal:** All three doc-intake / eval-review agents exist as installed artifacts on disk under every supported runtime's agents directory and are dispatchable via that runtime's Task/subagent equivalent, with Codex sandbox declarations matching each agent's actual filesystem footprint.

**Depends on:** v0.2.0 (shipped)
**Requirements:** AGNT-01, AGNT-02, AGNT-03, INST-01, INST-02
**Success Criteria** (what must be TRUE):
  1. After `oto install --claude`, `oto-doc-classifier.md`, `oto-doc-synthesizer.md`, and `oto-eval-auditor.md` are present in `~/.claude/agents/`, alongside the 23 retained agents.
  2. After `oto install --codex`, the same three agents are present in `~/.codex/agents/` with frontmatter declaring `sandbox: read-only` for `oto-doc-classifier` and `oto-eval-auditor`, and `sandbox: workspace-write` for `oto-doc-synthesizer`.
  3. After `oto install --gemini`, the same three agents are present in `~/.gemini/agents/`.
  4. Each agent is dispatchable in Claude Code via `Task(subagent_type="oto-doc-classifier" | "oto-doc-synthesizer" | "oto-eval-auditor")` and emits its canonical output shape (classification record, synthesized context + `.oto/INGEST-CONFLICTS.md` buckets, or per-dimension COVERED/PARTIAL/MISSING scoring).
  5. The rebrand engine's coverage manifest accepts the three new agents (no orphan upstream paths, no orphan target paths).
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Agent file ports: flip three inventory rows from drop to keep, run rebrand engine, reconcile classifier+auditor tool lists per D-04, regenerate coverage manifest.
- [x] 01-02-PLAN.md — Installer wiring: extend CODEX_AGENT_SANDBOX with three entries (D-04 locks), per-runtime install smoke against isolated --config-dir for Claude / Codex / Gemini.
**UI hint:** no

### Phase 2: Workflow rebrand-ports + command de-deferral

**Goal:** `/oto-ingest-docs` and `/oto-eval-review` execute their real workflows end-to-end against fixture inputs, with no deferral refusal anywhere in the surface (workflow body, command file, or `/oto-help` listing).

**Depends on:** Phase 1
**Requirements:** WF-ING-01, WF-ING-02, WF-ING-03, WF-ING-04, WF-EVAL-01, WF-EVAL-02, CMD-01, CMD-02, CMD-03
**Success Criteria** (what must be TRUE):
  1. Running `/oto-ingest-docs` against a fixture tree of mixed ADR/PRD/SPEC/RFC docs (≤50 docs) discovers them via the directory conventions or `--manifest`, produces a synthesized `.oto/PROJECT.md` + `REQUIREMENTS.md` + `ROADMAP.md` + `STATE.md` under `--mode new`, and exits cleanly with no "intentionally non-executable" refusal.
  2. Running `/oto-ingest-docs --mode merge` against an existing `.oto/` appends phases and requirements without clobbering existing content; mode defaults are auto-selected by `.oto/` presence.
  3. Running `/oto-ingest-docs` against a fixture with deliberate unresolved-blocker conflicts hard-blocks all destination writes, writes `.oto/INGEST-CONFLICTS.md` with the three buckets (auto-resolved, competing-variants, unresolved-blockers), and exits non-zero; the 50-doc cap is enforced.
  4. Running `/oto-eval-review <phase>` against a fixture phase with an AI-SPEC.md produces `.oto/phases/<phase>/EVAL-REVIEW.md` scoring each eval dimension as COVERED / PARTIAL / MISSING with an actionable remediation plan when gaps exist.
  5. `/oto-help` lists `/oto-ingest-docs` and `/oto-eval-review` as live commands with no `[deferred]` tag and no v2 reactivation footnote.
**Plans:** 3 plans
Plans:

**Wave 1** *(02-01 and 02-02 run in parallel — no `files_modified` overlap)*
- [x] 02-01-PLAN.md — Rebrand engine apply + workflow body hand-fixups (prose .planning/ → .oto/, SDK-tolerant fallback, classifier/auditor read-only-agent persistence reshape).
- [x] 02-02-PLAN.md — CMD-01/02/03 regression-guard test (locks command + INDEX + help.md clean state).

**Wave 2** *(blocked on 02-01 completion)*
- [x] 02-03-PLAN.md — Workflow-shape tests + fixture-tree smoke (3 committed fixtures + tmpdir over-cap; locks the 3 engine blind-spot fixes).

**Cross-cutting constraints** *(must_haves shared across multiple plans)*:
- Phase 1 D-04 read-only-agent reshape: classifier/auditor return values are persisted by the orchestrator, not written by the agent (locked by 02-01 implementation + 02-03 ABSENCE regression-guard tests).
- No `oto-sdk query` calls without fallback: SDK-DEFER-01 tolerance pattern (`2>/dev/null || …`) applied in 02-01 and asserted by 02-03 workflow-shape tests.

**UI hint:** no

### Phase 3: Tests, install-smoke, parity, ADR-15

**Goal:** Both restored commands carry test coverage matching the v0.1.0 / v0.2.0 baseline, every supported runtime ships the new surface identically, and the partial reversal of ADR-07 is recorded as ADR-15 against the criterion ADR-07 itself named.

**Depends on:** Phase 2
**Requirements:** TEST-01, TEST-02, TEST-03, INST-03, PRTY-01, ADR-01
**Success Criteria** (what must be TRUE):
  1. `tests/ingest-docs.test.cjs` runs under `npm test`, namespace-rebranded from the GSD source (`gsd-` → `oto-`, `.planning/` → `.oto/`), and passes.
  2. `tests/eval-review.test.cjs` exists and covers workflow load + agent dispatch + EVAL-REVIEW.md shape; passes under `npm test`.
  3. Full `npm test` suite stays green at the v0.2.0 baseline (533 pass, 1 expected skip, 0 failures) plus the new tests, with no regressions in the v0.1.0 or v0.2.0 surface.
  4. `install-smoke.yml` CI asserts the three new agent files are present in each runtime's agents dir under both install paths (tarball install and unpacked-dir install).
  5. Per-runtime parity smoke for `/oto-ingest-docs` and `/oto-eval-review` passes on Claude Code (primary), Codex, and Gemini CLI — command surfaces in each runtime's command dir, agent dispatch works under each runtime's Task/subagent equivalent, no deferral stub anywhere.
  6. `decisions/ADR-15-restore-doc-and-eval-agents.md` exists, references ADR-07's reactivation criterion, names exactly the three agents restored (and explicitly that the other dropped agents stay dropped per AGNT-DEFER-01), and records the ASVS / Codex sandbox decisions per agent.
**Plans:** 4 plans
Plans:

**Wave 1** *(03-01 and 03-02 run in parallel — fully disjoint `files_modified`)*
- [x] 03-01-PLAN.md — TEST-01 + TEST-02 + TEST-03: port `tests/ingest-docs.test.cjs` from GSD with namespace rebrand + D-04 hand-fixups; author new `tests/eval-review.test.cjs` with two literal SDK-DEFER-01 fallback regex locks; gate full-suite green.
- [x] 03-02-PLAN.md — INST-03 + PRTY-01 (Claude branch): bump `EXPECTED_AGENTS` from 23 → 26 in `oto/bin/lib/model-profiles.cjs`; extend `tests/phase-04-mr01-install-smoke.test.cjs` to assert Claude command files; extend `.github/workflows/install-smoke.yml` smoke-tarball + smoke-unpacked jobs to assert 3 new agent files in each runtime config dir.

**Wave 1b** *(blocked on 03-02 completion — needs EXPECTED_AGENTS bump for full-suite regression check)*
- [x] 03-03-PLAN.md — PRTY-01 (Codex + Gemini branches): extend `tests/phase-08-smoke-codex.integration.test.cjs` to assert `skills/oto-*/SKILL.md` files + per-agent `sandbox_mode` TOML per D-04; extend `tests/phase-08-smoke-gemini.integration.test.cjs` to assert `.md` command files (Option A locked per existing test precedent).

**Wave 2** *(blocked on all of Wave 1 + 1b)*
- [x] 03-04-PLAN.md — ADR-01: author `decisions/ADR-15-restore-doc-and-eval-agents.md` with `Implements: D-24` (new global decision registering the partial ADR-07 reversal); paraphrase ADR-07's reactivation framing; name exactly 3 restored agents; affirm AGNT-DEFER-01 by enumerating the 7 still-dropped agents; record Codex sandbox decisions per agent.

**Cross-cutting constraints** *(must_haves shared across multiple plans)*:
- SDK-DEFER-01 tolerance: every `oto-sdk query …` invocation referenced by tests, workflows, or CI MUST include the `2>/dev/null || …` fallback. Plan 01 locks this via two literal regex assertions on `oto/workflows/eval-review.md`; Plan 02 inherits the pattern in install-smoke YAML.
- D-04 Codex sandbox map: classifier + auditor are `read-only`; synthesizer is `workspace-write`. Plan 03 asserts per-agent `sandbox_mode` in Codex parity TOML. Plan 04 records this in ADR-15 prose.
- AGNT-DEFER-01 affirmation: ADR-15 (Plan 04) MUST enumerate the 7 still-dropped agents from the ADR-07 cut list and explicitly state they remain deferred.

**UI hint:** no

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent ports + installer wiring | 2/2 | Complete | 2026-05-18 |
| 2. Workflow rebrand-ports + command de-deferral | 3/3 | Complete | 2026-05-18 |
| 3. Tests, install-smoke, parity, ADR-15 | 4/4 | Complete; security verified | 2026-05-18 |

## Traceability

All 20 v1 requirements map to exactly one phase. Coverage: 20/20 (100%).

| Requirement | Phase |
|-------------|-------|
| AGNT-01 | 1 |
| AGNT-02 | 1 |
| AGNT-03 | 1 |
| INST-01 | 1 |
| INST-02 | 1 |
| WF-ING-01 | 2 |
| WF-ING-02 | 2 |
| WF-ING-03 | 2 |
| WF-ING-04 | 2 |
| WF-EVAL-01 | 2 |
| WF-EVAL-02 | 2 |
| CMD-01 | 2 |
| CMD-02 | 2 |
| CMD-03 | 2 |
| TEST-01 | 3 |
| TEST-02 | 3 |
| TEST-03 | 3 |
| INST-03 | 3 |
| PRTY-01 | 3 |
| ADR-01 | 3 |

## Out of Scope (Deferred)

The following are tracked in `REQUIREMENTS.md` v2+ section and explicitly outside this milestone:

- **DOG-01**: Migrate this project's own planning root from `.planning/` to `.oto/`.
- **SDK-01**: Implement the `oto-sdk query …` CLI surface.
- **AGNT-DEFER-01**: Restore `gsd-pattern-mapper`, `gsd-debug-session-manager`, and the remainder of the ADR-07 cut list. ADR-15 (Phase 3) explicitly affirms these stay deferred.

---

_For prior milestone archives, see `.planning/milestones/`._
