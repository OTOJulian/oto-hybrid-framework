# ADR-15: Restore doc-intake and eval-review agents

Status: Accepted
Date: 2026-05-18
Implements: D-24

## Context

ADR-07 (see `decisions/ADR-07-agent-trim.md`) dropped ten GSD agents during the v0.1.0 rationalization. Three of those agents (`gsd-doc-classifier`, `gsd-doc-synthesizer`, and `gsd-eval-auditor`) powered two `/oto-help` commands that v0.1.0 had to mark deferred to ship on time: `/oto-ingest-docs` and `/oto-eval-review`. Those two dead commands conflicted with v0.3.0's north-star goal: no dead commands in `/oto-help`.

ADR-07 did not contain a literal reactivation rule. It categorized dropped agents by rationale and left room for a future milestone to restore document-intake capability. v0.3.0 is that milestone for the two deferred commands only. The minimal reversal that retires both stubs requires exactly the three named agents; restoring more would re-inflate the maintenance surface against the personal-use cost ceiling in `PROJECT.md`.

Phase 1 of v0.3.0, especially D-04, landed the three agents with a deliberate read-only-agent reshape. The classifier and auditor declare Codex `read-only` sandboxes and omit `Write`; their workflows persist returned content. The synthesizer keeps `workspace-write` because it must produce `.oto/INGEST-CONFLICTS.md` and synthesized context during its own run. Phase 2 de-deferred both commands and shipped executable workflow bodies. Phase 3 closes the loop with regression tests, install-smoke coverage, per-runtime parity smoke, and this decision record.

## Decision

**Decision D-24:** Partially reverse `decisions/ADR-07-agent-trim.md` by restoring exactly three of the ten dropped agents. D-24 is "Partial reversal of ADR-07: restore the three doc-intake / eval-review agents" and is traceable through the same `Implements: D-NN` registry as the earlier ADRs.

| Agent | Codex sandbox | Tools | Persistence model |
|-------|---------------|-------|-------------------|
| `oto-doc-classifier` | `read-only` | `Read, Grep, Glob` | Workflow orchestrator persists the classifier's returned classification record to `.oto/intel/classifications/` |
| `oto-doc-synthesizer` | `workspace-write` | `Read, Write, Grep, Glob, Bash` | Agent writes `.oto/INGEST-CONFLICTS.md` and `.oto/intel/SYNTHESIS.md` directly during its run |
| `oto-eval-auditor` | `read-only` | `Read, Bash, Grep, Glob` | Workflow orchestrator persists the auditor's returned markdown to `.oto/phases/<phase>/EVAL-REVIEW.md` |

The remaining seven ADR-07-dropped agents stay dropped per AGNT-DEFER-01 in `REQUIREMENTS.md`:

- `oto-ai-researcher`
- `oto-eval-planner`
- `oto-framework-selector`
- `oto-pattern-mapper`
- `oto-intel-updater`
- `oto-user-profiler`
- `oto-debug-session-manager`

Restoring any of these seven requires a future ADR that supersedes the AGNT-DEFER-01 deferral and mints its own decision number.

## Rationale

The retained-agent set grows from 23 to 26, still below GSD's original 33, while both deferred commands become live. That is the smallest useful reversal of ADR-07: it restores the command surfaces the user actively wanted without reopening every AI, eval, intelligence, profile, and niche agent that ADR-07 cut.

The classifier and auditor are intentionally `read-only` to honor INST-02's Codex sandbox declarations, match the existing `oto-plan-checker` and `oto-integration-checker` read-only convention, and keep orchestrator persistence uniform with other checker-style agents. The synthesizer keeps `workspace-write` because its conflict report and synthesis output are part of one logical agent run; splitting that write into a second orchestration step would add complexity without reducing practical risk.

Minting D-24, instead of reusing D-04 or burying this reversal under a phase-local label, keeps the decision registry monotonic and one-decision-per-ADR. D-04 remains the Phase 1 sandbox lock already implemented by ADR-02; this ADR cites D-04 for traceability but uses D-24 as the registry pointer for the partial ADR-07 reversal.

The seven still-dropped agents serve workflows outside v0.3.0 scope. Re-adding them now would expand rebrand coverage, install adapters, sandbox declarations, and tests for capabilities the user does not currently need. Future milestones can revisit them individually.

## Consequences

- The rebrand coverage manifest carries three additional target paths: `oto/agents/oto-doc-classifier.md`, `oto/agents/oto-doc-synthesizer.md`, and `oto/agents/oto-eval-auditor.md`, plus the shared `oto/references/doc-conflict-engine.md` reference.
- `decisions/file-inventory.json` and `decisions/agent-audit.md` carry the three agent rows flipped from DROP to KEEP. The inventory row for `tests/ingest-docs.test.cjs` is also KEEP with `rebrand_required: true`.
- `bin/lib/runtime-codex.cjs` carries 26 `agentSandboxes` entries. The three restored entries declare the sandbox modes recorded in this ADR.
- `oto/bin/lib/model-profiles.cjs` `EXPECTED_AGENTS` carries 26 entries, including the three restored agents.
- `tests/ingest-docs.test.cjs` and `tests/eval-review.test.cjs` lock the two restored workflows at the regression-suite surface.
- `.github/workflows/install-smoke.yml` asserts the three restored agent files install per runtime under both tarball and unpacked install paths.
- `tests/phase-04-mr01-install-smoke.test.cjs`, `tests/phase-08-smoke-codex.integration.test.cjs`, and `tests/phase-08-smoke-gemini.integration.test.cjs` cover per-runtime parity for Claude, Codex, and Gemini.
- Decision D-24 is now consumed by this ADR. The next free global decision number is D-25.
- Future restoration of any of the seven still-dropped agents requires a new ADR superseding AGNT-DEFER-01 and minting its own decision number. This ADR does not pre-authorize that restoration.
