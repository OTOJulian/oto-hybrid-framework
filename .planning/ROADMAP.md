---
milestone: v0.3.0
milestone_name: Restore doc-intake and eval-review agents
status: planning
phases: [1, 2, 3]
plans_total: 0
requirements_total: 20
predecessor: v0.2.0
---

# Milestone v0.3.0: Restore doc-intake and eval-review agents

**Status:** planning
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

- [ ] **Phase 1: Agent ports + installer wiring** — Port `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor` agents and wire them into the per-runtime installer with correct Codex sandboxes.
- [ ] **Phase 2: Workflow rebrand-ports + command de-deferral** — Rebrand-port `ingest-docs.md` and `eval-review.md` workflows; strip deferral framing from `/oto-ingest-docs`, `/oto-eval-review`, and `/oto-help`.
- [ ] **Phase 3: Tests, install-smoke, parity, ADR-15** — Port `ingest-docs.test.cjs`, add `eval-review.test.cjs`, extend install-smoke for new agents, run per-runtime parity check, write ADR-15.

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
**Plans:** TBD
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
**Plans:** TBD
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
**Plans:** TBD
**UI hint:** no

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent ports + installer wiring | 0/0 | Not started | — |
| 2. Workflow rebrand-ports + command de-deferral | 0/0 | Not started | — |
| 3. Tests, install-smoke, parity, ADR-15 | 0/0 | Not started | — |

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
