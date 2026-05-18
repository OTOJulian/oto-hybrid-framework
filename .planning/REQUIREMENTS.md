# Requirements: oto v0.3.0

**Defined:** 2026-05-18
**Milestone:** v0.3.0 — Restore doc-intake and eval-review agents
**Core Value:** Stop framework-switching — one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

**Source material:** All eight ports for this milestone live in `foundation-frameworks/get-shit-done-main/` (GSD v1.38.5). No net-new design.

## v1 Requirements

### Agents

- [x] **AGNT-01**: `oto-doc-classifier` agent installed under each runtime's agents dir and dispatchable via `Task(subagent_type="oto-doc-classifier")`. Rebrand-ported from `gsd-doc-classifier.md` (168 LOC). Classifies a single doc as ADR / PRD / SPEC / RFC / DOC and emits the canonical classification record.
- [x] **AGNT-02**: `oto-doc-synthesizer` agent installed under each runtime's agents dir and dispatchable via `Task(subagent_type="oto-doc-synthesizer")`. Rebrand-ported from `gsd-doc-synthesizer.md` (204 LOC). Consumes classified docs, applies the `ADR > SPEC > PRD > DOC` precedence rule, emits synthesized context plus `.oto/INGEST-CONFLICTS.md` with three buckets (auto-resolved, competing-variants, unresolved-blockers).
- [x] **AGNT-03**: `oto-eval-auditor` agent installed under each runtime's agents dir and dispatchable via `Task(subagent_type="oto-eval-auditor")`. Rebrand-ported from `gsd-eval-auditor.md` (191 LOC). Scores each eval dimension of a completed AI phase as COVERED / PARTIAL / MISSING with actionable remediation.

### Workflows

- [ ] **WF-ING-01**: `~/.<runtime>/oto/workflows/ingest-docs.md` is the rebrand-ported executable workflow (~332 LOC), not the current deferral stub.
- [ ] **WF-ING-02**: `/oto-ingest-docs` discovers docs via directory conventions (`docs/adr/`, `docs/prd/`, `docs/specs/`, `docs/rfc/`, root `{ADR,PRD,SPEC,RFC}-*.md`) or an explicit `--manifest <file>` YAML.
- [ ] **WF-ING-03**: `/oto-ingest-docs` honors `--mode new` (bootstraps `.oto/PROJECT.md` + `REQUIREMENTS.md` + `ROADMAP.md` + `STATE.md`) and `--mode merge` (appends phases and requirements to an existing `.oto/`), defaulting based on `.oto/` presence.
- [ ] **WF-ING-04**: `/oto-ingest-docs` hard-blocks any destination write when `INGEST-CONFLICTS.md` contains unresolved-blocker entries, and enforces the 50-doc-per-invocation cap.
- [ ] **WF-EVAL-01**: `~/.<runtime>/oto/workflows/eval-review.md` is the rebrand-ported executable workflow (~155 LOC), not the current deferral stub.
- [ ] **WF-EVAL-02**: `/oto-eval-review <phase>` produces `.oto/phases/<phase>/EVAL-REVIEW.md` scoring each eval dimension from the phase's AI-SPEC.md as COVERED / PARTIAL / MISSING, with an actionable remediation plan when gaps exist.

### Commands

- [ ] **CMD-01**: `/oto-ingest-docs` command file removes the deferral framing; invoking the command executes the workflow body end-to-end without the "intentionally non-executable" refusal.
- [ ] **CMD-02**: `/oto-eval-review` command file removes the deferral framing; invoking the command executes the workflow body end-to-end without the "intentionally non-executable" refusal.
- [ ] **CMD-03**: `/oto-help` lists `/oto-ingest-docs` and `/oto-eval-review` as live commands (no `[deferred]` tag, no v2 reactivation footnote).

### Installer

- [x] **INST-01**: `oto install --claude` / `--codex` / `--gemini` / `--all` copies the three new agent files into the target runtime's agents directory, alongside the existing 23 retained agents.
- [x] **INST-02**: Codex adapter assigns each new agent the correct `sandbox:` declaration in its installed `.toml`: `oto-doc-classifier` and `oto-eval-auditor` get `read-only`; `oto-doc-synthesizer` gets `workspace-write` (it writes `.oto/INGEST-CONFLICTS.md` and synthesized context).
- [ ] **INST-03**: `install-smoke.yml` CI asserts each of the three new agent files is present in each runtime's agents dir after install (tarball install + unpacked-dir install paths).

### Tests

- [ ] **TEST-01**: `tests/ingest-docs.test.cjs` ported from `foundation-frameworks/get-shit-done-main/tests/ingest-docs.test.cjs`, namespace-rebranded (`gsd-` → `oto-`, `.planning/` → `.oto/`), and passing under `npm test`.
- [ ] **TEST-02**: New `tests/eval-review.test.cjs` covering workflow load + agent dispatch + EVAL-REVIEW.md shape, passing under `npm test`.
- [ ] **TEST-03**: Full `npm test` suite remains green at v0.2.0 baseline +new tests; no regressions in existing v0.1.0 / v0.2.0 surface.

### Decision Record

- [ ] **ADR-01**: New `decisions/ADR-15-restore-doc-and-eval-agents.md` written, referencing ADR-07's reactivation criterion ("a v2 milestone that restores document intake agents"), naming exactly which three agents return (and explicitly that the other dropped agents stay dropped), and recording the ASVS / Codex sandbox decisions per agent.

### Per-Runtime Parity

- [ ] **PRTY-01**: Per-runtime smoke for `/oto-ingest-docs` and `/oto-eval-review` on Claude Code (primary), Codex, and Gemini CLI matches the v0.1.0 / v0.2.0 parity pattern: command surfaces in each runtime's command dir, agent dispatch works under each runtime's Task/subagent equivalent, and the deferral stub is gone everywhere.

## v2+ Requirements

Deferred from v0.3.0 scope. Tracked but not in current roadmap.

### Dogfood

- **DOG-01**: Migrate this project's own planning root from `.planning/` to `.oto/` (`oto migrate --apply`). Currently the framework's own state still uses GSD-era markers and conventions.

### SDK

- **SDK-01**: Implement the `oto-sdk query …` CLI surface that current workflows assume (e.g., `init.progress`, `state.milestone-switch`, `commit`, `roadmap.analyze`). Today every workflow's SDK call falls back to manual file ops.

### Other dropped agents

- **AGNT-DEFER-01**: Restore `gsd-pattern-mapper`, `gsd-debug-session-manager`, and the remainder of the ADR-07 cut list. Out of scope for v0.3.0 — only the two commands the user actively wanted (`/oto-ingest-docs`, `/oto-eval-review`) are in scope; the rest stay deferred unless a future milestone asks.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Restoring all 24+ agents dropped in ADR-07 | This milestone surgically reverses the carveout for the three agents that powered the two dead commands. Wholesale restoration re-inflates the maintenance surface against the personal-use cost ceiling. |
| Three-way interactive conflict resolution for `/oto-ingest-docs` | GSD reserved `--resolve interactive` for a future release; oto inherits the same v1 scope (auto-precedence-only). |
| `/oto-ingest-docs` invocations beyond the 50-doc cap | Hard cap inherited from GSD source; doc-pile sizes beyond that are vanishingly rare for the user. |
| `.oto/`-state-root migration of this repo | Tracked as DOG-01 for a future milestone; this milestone is about what `/oto-help` advertises actually working, not the framework's own dogfood state. |
| OpenCode / Cursor / Windsurf parity | Out of scope per PROJECT.md constraints (personal-use, three runtimes only). |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGNT-01 | 1 | Complete |
| AGNT-02 | 1 | Complete |
| AGNT-03 | 1 | Complete |
| WF-ING-01 | 2 | Pending |
| WF-ING-02 | 2 | Pending |
| WF-ING-03 | 2 | Pending |
| WF-ING-04 | 2 | Pending |
| WF-EVAL-01 | 2 | Pending |
| WF-EVAL-02 | 2 | Pending |
| CMD-01 | 2 | Pending |
| CMD-02 | 2 | Pending |
| CMD-03 | 2 | Pending |
| INST-01 | 1 | Complete |
| INST-02 | 1 | Complete |
| INST-03 | 3 | Pending |
| TEST-01 | 3 | Pending |
| TEST-02 | 3 | Pending |
| TEST-03 | 3 | Pending |
| ADR-01 | 3 | Pending |
| PRTY-01 | 3 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0
- Per-phase distribution: Phase 1 = 5 (AGNT-01..03, INST-01, INST-02); Phase 2 = 9 (WF-ING-01..04, WF-EVAL-01..02, CMD-01..03); Phase 3 = 6 (TEST-01..03, INST-03, ADR-01, PRTY-01)

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 after Phase 1 execution (AGNT-01..03, INST-01..02 complete)*
