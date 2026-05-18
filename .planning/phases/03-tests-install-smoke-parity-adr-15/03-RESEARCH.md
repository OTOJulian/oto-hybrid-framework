# Phase 3: Tests, install-smoke, parity, ADR-15 — Research

**Researched:** 2026-05-18
**Domain:** Markdown-artifact regression tests, CI install-smoke extension, per-runtime parity assertions, ADR authoring
**Confidence:** HIGH

## Summary

Phase 3 closes v0.3.0 by adding test coverage and CI smoke for the work that landed in Phases 1 and 2, plus writing ADR-15 to formally record the partial reversal of ADR-07. The phase has six requirements that decompose cleanly into four work streams, all of which read existing repo state rather than producing new shipped surface area.

Empirical findings that shape the plan:

1. **The upstream `tests/ingest-docs.test.cjs` is 307 lines.** It already follows the exact "file existence + frontmatter + reference wiring + workflow content shape" pattern that Phase 2 adopted in `tests/workflow-ingest-docs.test.cjs`. A namespace-rebrand port via `scripts/rebrand.cjs` plus path remap (`get-shit-done/workflows/` → `oto/workflows/`, `commands/gsd/` → `oto/commands/oto/`, `agents/gsd-doc-*` → `oto/agents/oto-doc-*`) produces 90% of TEST-01 mechanically. The remaining 10% needs hand reconciliation against three Phase-1/Phase-2 landed shapes — primarily the D-04 read-only-agent reshape (classifier no longer declares `Write` in its tools list) and the conflict-engine reference path. **One upstream assertion is stale and will fail unchanged:** `test('has Read and Write tools', () => { assert.match(content, /^tools:\s*.*Read.*Write.*/m); })` in the classifier section — the oto classifier ships without `Write` per Phase 1 D-04. That assertion needs the `Write` clause stripped. Likewise: the upstream synthesizer assertion `assert.match(content, /^tools:\s*.*Read.*Write.*Bash.*/m)` is correct for the synthesizer (which kept `Write`) and ports cleanly.

2. **`tests/eval-review.test.cjs` is a fresh authoring job.** The upstream `tests/ai-evals.test.cjs` (the closest GSD analog) is config-key-heavy (`workflow.ai_integration_phase` defaults, `runGsdTools` helper, repair-action assertions) and is **not portable** for TEST-02. The right shape mirrors the Phase 2 `tests/workflow-eval-review.test.cjs` skeleton plus the upstream `ingest-docs.test.cjs` structure adapted for the auditor surface: file existence (`oto/commands/oto/eval-review.md` + `oto/workflows/eval-review.md` + `oto/agents/oto-eval-auditor.md` + `oto/references/ai-evals.md`), command frontmatter (`name:`, `description:`, `argument-hint:` mentions `[phase`), `@-references` (`@~/.claude/oto/workflows/eval-review.md`, `@~/.claude/oto/references/ai-evals.md`), workflow content (State A/B/C detection, AUDITOR_MODEL resolution via SDK with fallback, `oto-eval-auditor` dispatch, COVERED/PARTIAL/MISSING scoring vocabulary, EVAL-REVIEW.md output path, orchestrator-persistence wording per D-04, verdict tokens PRODUCTION READY / NEEDS WORK / SIGNIFICANT GAPS / NOT IMPLEMENTED), and auditor agent file shape (correct tools list **without** `Write`, sandbox-implied semantics).

3. **`.github/workflows/install-smoke.yml` currently only asserts `oto` is on PATH and executable.** It does not run `oto install --claude/--codex/--gemini`, does not write into any `~/.claude` analog, and does not assert agent file presence. `scripts/install-smoke.cjs` does Claude-only smoke against a `--config-dir <tmp>` but only checks `oto/.install.json` exists and the `<!-- OTO Configuration -->` CLAUDE.md marker — no per-agent assertions. INST-03 needs two complementary extensions: (a) extend `scripts/install-smoke.cjs` to assert each of the three new agent files lands in the Claude config dir, and (b) add Codex and Gemini variants of that same smoke check, then wire them into both `install-smoke.yml` jobs (smoke-tarball and smoke-unpacked).

4. **`tests/phase-04-mr01-install-smoke.test.cjs` already does the heavy lifting per-runtime** — it `npm pack`s, installs into `--prefix <tmp>`, runs `oto install --claude --config-dir <tmp>`, and asserts every agent in `EXPECTED_AGENTS` is installed. But **`EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs:29-53` is STALE** — it lists 23 agents and does not include the three new ones (`oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor`). This is critical: the existing tarball smoke test silently passes without asserting the new agents because the array it iterates over does not include them. **`tests/fixtures/phase-04/retained-agents.json` is correct** — it lists 26 agents including the three new ones — but it is only consumed by `tests/phase-04-codex-sandbox-coverage.test.cjs`, not by the install-smoke test. INST-03 must update `EXPECTED_AGENTS` to 26 agents (or refactor the install-smoke test to read `retained-agents.json` directly).

5. **Per-runtime parity infrastructure already exists.** `tests/phase-08-smoke-codex.integration.test.cjs` and `tests/phase-08-smoke-gemini.integration.test.cjs` do isolated `--config-dir <tmp>` installs and assert command surface presence (Codex: `skills/oto-help/SKILL.md`; Gemini: `commands/oto/help.md`). They use `freshTmpDir()` helpers and skip-on-CLI-absent guards (`probeCodex()`, `probeGemini()`) — but they do NOT yet assert `/oto-ingest-docs` and `/oto-eval-review` command files land per-runtime, nor that the three new agent files land. PRTY-01 extends these existing tests rather than authoring new ones. Also, `bin/lib/runtime-codex.cjs` already has all three sandbox entries (lines 90-92, verified during research): `'oto-doc-classifier': 'read-only'`, `'oto-doc-synthesizer': 'workspace-write'`, `'oto-eval-auditor': 'read-only'` — so the Codex parity additions need a per-agent TOML-shape assertion to lock D-04 from Phase 1.

6. **ADR numbering: ADR-15 is the next slot.** Verified `ls decisions/ADR-*.md` — ADR-01 through ADR-14 exist; ADR-14 is the highest. ADR-15 is correct. The ADR-09 format is grep-able with required sections (`Status:`, `Date:`, `Implements:`, `## Context`, `## Decision`, `## Rationale`, `## Consequences`). `tests/phase-01-adr-structure.test.cjs` validates this shape for ALL `decisions/ADR-*.md` files — meaning ADR-15 must follow it strictly or the test fails.

7. **ADR-07's reactivation language** (the criterion ADR-15 partially reverses against): ADR-07 names the dropped agents in a table but does NOT contain an explicit "reactivation criterion" sentence. The criterion is implied by the categorization "DROP - AI/eval" and "DROP - redundant doc" — ADR-15 must paraphrase the criterion (not quote nonexistent text) as something like *"the v0.3.0 milestone exists precisely to retire the two `[deferred]` commands left in `/oto-help` (`/oto-ingest-docs`, `/oto-eval-review`); restoring exactly the three agents those two commands depend on is the minimal reversal that achieves the no-dead-commands goal."* The roadmap's narrative in `.planning/ROADMAP.md` and the v0.3.0 milestone framing in `REQUIREMENTS.md` are the load-bearing citations.

**Primary recommendation:** **Three plans across two waves.** Wave 1 runs three parallel plans (no `files_modified` overlap): 03-01 ports TEST-01 + authors TEST-02; 03-02 extends install-smoke for INST-03; 03-03 extends per-runtime parity smoke for PRTY-01. Wave 2 runs one plan: 03-04 writes ADR-15 and finalizes verification (depends on Phases 1+2 landing and Wave 1 tests passing). A two-plan alternative collapses Wave 1's three streams into one — viable but bigger blast radius and worse review surface.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TEST-01 + TEST-02 — Markdown-artifact regression tests | `tests/*.test.cjs` via `node:test` | — | Project standard per CLAUDE.md (`node:test`, CJS, no Vitest at top level) and Phase 2 precedent |
| TEST-03 — Full-suite green at v0.2.0+new baseline | `npm test` (calls `scripts/run-tests.cjs`) | CI matrix (`.github/workflows/test.yml`) | Locks regression across all tests |
| INST-03 — CI install-smoke for agent files | `.github/workflows/install-smoke.yml` + `scripts/install-smoke.cjs` (already wired to it) | `tests/phase-04-mr01-install-smoke.test.cjs` (via `EXPECTED_AGENTS` update) | install-smoke.yml is the canonical INST-03 surface; the phase-04 test was the v0.1.0-era version of the same assertion but is now stale |
| PRTY-01 — Per-runtime smoke for two restored commands + three agents | `tests/phase-08-smoke-codex.integration.test.cjs` + `tests/phase-08-smoke-gemini.integration.test.cjs` + (optionally) a Claude variant or reuse of `phase-04-mr01-install-smoke.test.cjs` for Claude | — | Existing per-runtime smoke is the canonical PRTY pattern; extend rather than parallel-author |
| ADR-01 — Write ADR-15 | `decisions/ADR-15-restore-doc-and-eval-agents.md` | `tests/phase-01-adr-structure.test.cjs` (enforces shape) | ADR-09 format; ADR-numbering verified contiguous |
| ASVS / Codex sandbox locks per agent | Already locked in `bin/lib/runtime-codex.cjs:90-92` (Phase 1 D-04) | ADR-15 documents these decisions | Phase 3 is documentation + assertion only; no sandbox code changes |

## User Constraints

> **Note:** No CONTEXT.md exists for Phase 3 (`/oto-discuss-phase 3` has not been run). This research operates under ROADMAP.md Phase 3 success criteria + REQUIREMENTS.md TEST-01..03 / INST-03 / PRTY-01 / ADR-01 plus the additional_context block in the spawn message.

### Locked Decisions (inherited from project conventions and prior phase outcomes)

- **`node:test` is the test framework** (CLAUDE.md HIGH-confidence prescription): no Vitest, no Jest at top level.
- **Rebrand engine is the source of truth for any GSD→OTO port** (CLAUDE.md + Phase 1 D-01 + Phase 2 02-01-SUMMARY): TEST-01's port should run `scripts/rebrand.cjs` against the upstream test file, with hand fixups limited to engine blind spots and the stale assertions identified in this research.
- **D-04 read-only-agent reshape stands** (Phase 1 verification + Phase 2 regression guards): `oto-doc-classifier` and `oto-eval-auditor` declare tools `Read, Grep, Glob` and `Read, Bash, Grep, Glob` respectively (no `Write`); the workflow orchestrator persists their return values. Any ported assertion against `Write` in classifier/auditor agent files must be removed.
- **SDK-DEFER-01 tolerance pattern is mandatory**: `oto-sdk query … 2>/dev/null || …`. New tests must NOT depend on `oto-sdk` being on PATH.
- **Codex sandbox locks are authoritative** (Phase 1 INST-02 + D-04): classifier `read-only`, synthesizer `workspace-write`, auditor `read-only`. PRTY-01's Codex parity smoke must assert the per-agent `.toml` `sandbox_mode` line for each.
- **`.planning/` remains live in this repo** (DOG-01 deferred). New tests target `oto/workflows/` and `oto/commands/oto/` against `.oto/` paths (the workflow body's runtime target), not `.planning/`.
- **No new `oto install --all` semantics**: PRTY-01 verifies Claude / Codex / Gemini separately via existing per-runtime smoke tests, not a multi-runtime install in one shot.
- **AGNT-DEFER-01 is binding for ADR-15**: ADR-15 must affirm explicitly that the other seven dropped agents (`oto-ai-researcher`, `oto-eval-planner`, `oto-framework-selector`, `oto-pattern-mapper`, `oto-intel-updater`, `oto-user-profiler`, `oto-debug-session-manager`) stay dropped.

### Claude's Discretion

- Number of plans (2–4 viable). Recommendation: 3 plans / 2 waves (see Recommended Plan Shape below).
- Whether to update `EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs` or refactor `tests/phase-04-mr01-install-smoke.test.cjs` to consume `tests/fixtures/phase-04/retained-agents.json` directly. Recommendation: **update `EXPECTED_AGENTS`** — single source of truth for model profiles, low risk, and other consumers (`tests/phase-04-mr01-install-smoke.test.cjs`) pick up the change for free. The fixture is independent and remains the per-test golden file.
- Whether to add a third install-smoke job (Claude / Codex / Gemini) to `install-smoke.yml` or whether the existing `tests/phase-04-mr01-install-smoke.test.cjs` + `tests/phase-08-smoke-codex.integration.test.cjs` + `tests/phase-08-smoke-gemini.integration.test.cjs` suite (already part of `npm test`) is sufficient. Recommendation: **assert in both places**. INST-03 explicitly names `install-smoke.yml`, so the CI YAML must call out the three new agents (e.g., a post-install grep in the bash step or — cleaner — call into a single Node script that asserts file presence); the in-suite tests provide the developer-fast-feedback path.
- ADR-15 ASVS / sandbox decision per agent — Phase 1 D-04 already records these; ADR-15 just summarizes them.
- Whether the TEST-01 port wraps the upstream `import command` describe block (lines 285–307 of upstream `tests/ingest-docs.test.cjs`) — research recommends **dropping it** because `/oto-import` is not in v0.3.0 scope and that block tests a different command.

### Deferred Ideas (OUT OF SCOPE for Phase 3)

- Implementing the `oto-sdk` CLI surface (SDK-DEFER-01 — v0.4.0+ candidate).
- Migrating this repo's `.planning/` → `.oto/` (DOG-01 — v0.4.0+ candidate).
- Restoring the remaining seven ADR-07-dropped agents (AGNT-DEFER-01 — but ADR-15 affirms they stay dropped).
- Three-way interactive conflict resolution (`--resolve interactive`).
- Per-runtime parity for OpenCode / Cursor / Windsurf (PROJECT.md scope constraint).
- A "v0.3.0 milestone audit" doc (separate ritual after `/oto-verify-work` passes).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Port `tests/ingest-docs.test.cjs` from GSD with `gsd-` → `oto-`, `.planning/` → `.oto/`; passes under `npm test` | Upstream source verified at `foundation-frameworks/get-shit-done-main/tests/ingest-docs.test.cjs` (307 LOC, 12 describe blocks, file-shape + frontmatter + reference + content + agent-shape assertions). Stale assertion identified: classifier `Write` tools check. Recommend dropping the `import command` describe block (lines 285–307) as out-of-scope. |
| TEST-02 | New `tests/eval-review.test.cjs` covers workflow load + agent dispatch + EVAL-REVIEW.md shape; passes under `npm test` | Fresh authoring — upstream `ai-evals.test.cjs` is GSD-config-specific and not portable. Required surface: command file existence + frontmatter (`argument-hint: "[phase number]"`); workflow body shape (`oto-sdk query init.phase-op` with SDK fallback, AUDITOR_MODEL resolve, banner, State A/B/C detection, `oto-eval-auditor` dispatch with orchestrator-persistence wording, EVAL-REVIEW.md output target, COVERED/PARTIAL/MISSING vocabulary, verdict tokens, commit step); auditor agent file shape (no `Write` in tools per D-04, sandbox-implied behavior). |
| TEST-03 | Full `npm test` stays green at v0.2.0 baseline + new tests | Existing baseline: 562 tests / 561 pass / 1 skip / 0 fail (per `.planning/STATE.md` and `02-VERIFICATION.md`). TEST-01 adds ~24 tests (12 describe blocks × ~2 tests avg); TEST-02 adds ~10 tests. New baseline target: ~596 tests / 595 pass / 1 skip / 0 fail (planner should set exact target after Wave 1 lands). |
| INST-03 | `install-smoke.yml` asserts three new agent files in each runtime's agents dir under both install paths (tarball + unpacked-dir) | Current state: `install-smoke.yml` runs `oto --help` but does NOT install into a runtime config-dir and does NOT assert agent files. `scripts/install-smoke.cjs` runs `oto install --claude --config-dir <tmp>` but only asserts state file + CLAUDE.md marker. INST-03 fix: extend `scripts/install-smoke.cjs` to assert each of three new agent files exists in the target dir AND add Codex + Gemini variants; update `EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs` to include the three new agents (currently stale at 23). |
| PRTY-01 | Per-runtime smoke for `/oto-ingest-docs` and `/oto-eval-review` on Claude, Codex, Gemini matches v0.1.0 / v0.2.0 parity pattern | Existing precedent: `tests/phase-08-smoke-codex.integration.test.cjs` (asserts Codex `skills/oto-help/SKILL.md` exists), `tests/phase-08-smoke-gemini.integration.test.cjs` (asserts Gemini `commands/oto/help.md` exists). PRTY-01 extends each with: command surface assertions for `/oto-ingest-docs` and `/oto-eval-review`; agent file assertions for all three new agents; for Codex, additional per-agent `.toml` `sandbox_mode` assertions per D-04. |
| ADR-01 | Write `decisions/ADR-15-restore-doc-and-eval-agents.md` referencing ADR-07's reactivation criterion, naming the three agents restored, affirming the rest stay dropped, recording ASVS / Codex sandbox decisions | ADR-09 format verified (`tests/phase-01-adr-structure.test.cjs` enforces). ADR-15 is the next contiguous number (ADR-14 is the current highest). Reactivation criterion is paraphrased from ROADMAP.md milestone framing (no literal "reactivation" sentence in ADR-07). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | builtin (Node 22+) | Markdown-artifact assertions and install smoke | Project standard per CLAUDE.md TL;DR; matches all existing test files |
| `node:assert/strict` | builtin (Node 22+) | Strict assertions in tests | Project standard |
| `node:fs`, `node:path`, `node:os` | builtin | Filesystem reads and tmpdir creation | Used throughout `tests/` |
| `node:child_process` (`spawnSync`) | builtin | `npm pack` and `oto install --<runtime>` invocation in install-smoke tests | Pattern from `tests/phase-04-mr01-install-smoke.test.cjs` and `tests/phase-08-smoke-codex.integration.test.cjs` |
| `scripts/rebrand.cjs` | repo-local | Port the upstream `tests/ingest-docs.test.cjs` token-substitution path | Single source of truth per CLAUDE.md; Phase 1 D-01 + Phase 2 02-01 precedent |
| GitHub Actions `actions/checkout@de0fac…` + `actions/setup-node@53b83…` | pinned by SHA | CI runner setup for the INST-03 install-smoke extension | Already pinned in `install-smoke.yml`; preserve |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tests/fixtures/phase-04/retained-agents.json` | repo-local | Per-test golden file for the 26-agent retained set | Already correct (lists all 26); reuse for PRTY-01 assertions if convenient |
| `oto/bin/lib/model-profiles.cjs` (`EXPECTED_AGENTS`) | repo-local | Module-level golden list of 23 (currently stale) agents | INST-03 fix updates this to 26 |
| `bin/lib/runtime-codex.cjs` (`agentSandboxes`) | repo-local | Authoritative Codex sandbox map (already 26 entries) | Codex parity smoke asserts against this |
| `oto/workflows/help.md` and `oto/commands/INDEX.md` | repo-local | Already locked clean by `tests/workflow-no-deferral-marker.test.cjs` | No new assertions needed; reuse the locking test as is |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-porting `tests/ingest-docs.test.cjs` | Rebrand engine via `scripts/rebrand.cjs` | **Rejected**: violates CLAUDE.md "rebrand engine is single source of truth" + Phase 1 D-01 precedent. Hand fixups only for engine blind spots + the one stale assertion. |
| Update `EXPECTED_AGENTS` array | Refactor `tests/phase-04-mr01-install-smoke.test.cjs` to read `retained-agents.json` directly | **Choose update**: simpler change, preserves the array as single source of truth for both install-smoke and model-profile consumers. Fixture stays independent. |
| Separate Claude variant of `phase-08-smoke-*` for PRTY-01 | Reuse `tests/phase-04-mr01-install-smoke.test.cjs` as the Claude per-runtime smoke (extended for the two restored commands and three agents) | **Reuse**: it already does Claude tarball install + agent assertion; just needs command-surface additions for `/oto-ingest-docs` and `/oto-eval-review`. |
| Write ADR-15 in Phase 1 or 2 | Defer to Phase 3 per ROADMAP | **Roadmap-locked**: Phase 1 D-07 explicitly punts ADR-15 to Phase 3. |
| Extend `install-smoke.yml` with full per-runtime installs | Keep `install-smoke.yml` minimal and rely on in-suite tests via `npm test` (which CI already runs) | **Add to install-smoke.yml**: INST-03 explicitly names the YAML file. A bash post-install grep in the YAML is the minimal delta (or invoke a single Node helper script). |

**Installation:** No new npm dependencies.

**Version verification:** Node 22+ enforced by `package.json` `engines`. All existing tests (562 total) pass under this version.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  Phase 3 inputs (already on disk after Phases 1+2):                │
│  - oto/agents/{oto-doc-classifier,oto-doc-synthesizer,             │
│                oto-eval-auditor}.md                                │
│  - oto/commands/oto/{ingest-docs,eval-review,help}.md              │
│  - oto/workflows/{ingest-docs,eval-review,help}.md                 │
│  - oto/references/{doc-conflict-engine,ai-evals,gate-prompts,      │
│                    ui-brand}.md                                    │
│  - decisions/ADR-{01..14}.md                                       │
│  - bin/lib/runtime-codex.cjs (sandbox map locked Phase 1)          │
│  - tests/workflow-{ingest-docs,eval-review,                        │
│                    ingest-docs-fixture,no-deferral-marker}.test.cjs│
└─────────────────┬──────────────────────────────────────────────────┘
                  │
   ┌──────────────┼─────────────────┬──────────────────┐
   ▼              ▼                 ▼                  ▼
┌──────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
│ TEST-01  │ │ TEST-02     │ │ INST-03      │ │ PRTY-01          │
│ port via │ │ author      │ │ extend       │ │ extend           │
│ rebrand  │ │ fresh       │ │ install-     │ │ phase-08-smoke-* │
│ engine,  │ │ against     │ │ smoke.{yml,  │ │ tests for the    │
│ then     │ │ oto/        │ │  cjs}; fix   │ │ two restored     │
│ hand-fix │ │ workflows/  │ │ stale        │ │ commands + three │
│ Write    │ │ eval-       │ │ EXPECTED_    │ │ agents per       │
│ assertion│ │ review.md   │ │ AGENTS;      │ │ runtime; Codex   │
│ for      │ │ + agents/   │ │ assert 3 new │ │ also asserts     │
│ classi-  │ │ oto-eval-   │ │ agents per   │ │ per-agent .toml  │
│ fier     │ │ auditor.md  │ │ runtime in CI│ │ sandbox_mode     │
│          │ │             │ │              │ │                  │
└────┬─────┘ └──────┬──────┘ └──────┬───────┘ └────────┬─────────┘
     │              │               │                  │
     └──────┬───────┘               │                  │
            │                       │                  │
            ▼                       ▼                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │ tests/                                                   │
   │  ├── ingest-docs.test.cjs       (NEW — TEST-01)          │
   │  ├── eval-review.test.cjs       (NEW — TEST-02)          │
   │  ├── phase-04-mr01-install-     (UPDATED — INST-03/Claude│
   │  │      smoke.test.cjs                  via EXPECTED_AGENTS)│
   │  ├── phase-08-smoke-codex.      (UPDATED — PRTY-01/Codex)│
   │  │      integration.test.cjs                             │
   │  └── phase-08-smoke-gemini.     (UPDATED — PRTY-01/Gem)  │
   │         integration.test.cjs                             │
   │                                                          │
   │ scripts/                                                 │
   │  └── install-smoke.cjs          (UPDATED — INST-03 CI)   │
   │                                                          │
   │ .github/workflows/                                       │
   │  └── install-smoke.yml          (UPDATED — INST-03 step) │
   │                                                          │
   │ oto/bin/lib/                                             │
   │  └── model-profiles.cjs         (UPDATED — EXPECTED_     │
   │                                  AGENTS 23 → 26)         │
   │                                                          │
   │ decisions/                                               │
   │  └── ADR-15-restore-doc-and-    (NEW — ADR-01)           │
   │      eval-agents.md                                      │
   └──────────────────────────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────┐
   │ npm test (CI) — must stay green at 562 + ~34 new = ~596  │
   │ install-smoke.yml — must pass both tarball + unpacked    │
   │ with new agent-file assertions                           │
   └──────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No new directories. Phase 3 modifies:

```
tests/
├── ingest-docs.test.cjs            # NEW (TEST-01) — port of upstream
├── eval-review.test.cjs            # NEW (TEST-02) — fresh authoring
├── phase-04-mr01-install-smoke.test.cjs  # UPDATED (transitive: EXPECTED_AGENTS bump in oto/bin/lib/model-profiles.cjs picks up 3 new agents)
├── phase-08-smoke-codex.integration.test.cjs   # UPDATED (PRTY-01: assert ingest-docs/eval-review skill files + 3 agent files + sandbox_mode)
└── phase-08-smoke-gemini.integration.test.cjs  # UPDATED (PRTY-01: assert ingest-docs/eval-review command files + 3 agent files)

oto/bin/lib/
└── model-profiles.cjs              # UPDATED — EXPECTED_AGENTS 23 → 26

scripts/
└── install-smoke.cjs               # UPDATED (INST-03) — extend Claude smoke; add Codex/Gemini smoke; assert 3 new agent files per runtime

.github/workflows/
└── install-smoke.yml               # UPDATED (INST-03) — wire the new agent-file assertions into both jobs

decisions/
└── ADR-15-restore-doc-and-eval-agents.md   # NEW (ADR-01)
```

### Pattern 1: Rebrand-then-fixup for TEST-01 (Phase 1 D-01 + Phase 2 02-01 precedent)

**What:** Run `scripts/rebrand.cjs` on the upstream `tests/ingest-docs.test.cjs`, copy output into `tests/ingest-docs.test.cjs`, then hand-fix the one stale assertion that doesn't match the post-D-04 classifier shape.

**When to use:** Any GSD test file with `gsd-`, `.planning/`, or `get-shit-done/` path references that map cleanly to `oto-`, `.oto/`, `oto/` under the rename map. The rebrand engine produces near-complete output; hand fixups address engine blind spots and shape-changes that landed downstream of the upstream file.

**Example:**

```bash
# Step 1: confirm inventory row is keep + rebrand_required for tests/ingest-docs.test.cjs
# (research did NOT verify this — planner must check decisions/file-inventory.json and flip
# if currently dropped. The Phase 2 02-RESEARCH section "Open Questions" #1 noted that
# the engine output for commands/oto/* matches existing clean shipped frontmatter — same
# pattern applies here.)

# Step 2: run engine
node scripts/rebrand.cjs --apply \
  --target foundation-frameworks/get-shit-done-main \
  --owner OTOJulian \
  --out .oto-rebrand-stage

# Step 3: copy
cp .oto-rebrand-stage/tests/ingest-docs.test.cjs tests/ingest-docs.test.cjs

# Step 4: hand-fix the stale assertion (line ~191 of port — classifier Write check)
# Edit: change `/^tools:\s*.*Read.*Write.*/m` → `/^tools:\s*.*Read.*Grep.*Glob/m`
# and update the test name from "has Read and Write tools" to "has Read, Grep, Glob tools (read-only per Phase 1 D-04)"

# Step 5: drop the out-of-scope `import command` describe block (lines 285–307 of upstream)

# Step 6: drop the synthesizer assertion against `Write` ONLY if it doesn't apply
# (synthesizer KEEPS Write per Phase 1 D-04, so this one ports cleanly — keep it)

# Step 7: rm the staging dir
rm -rf .oto-rebrand-stage

# Step 8: verify
node --test tests/ingest-docs.test.cjs
```

### Pattern 2: Fresh authoring for TEST-02 against existing surface

**What:** Author `tests/eval-review.test.cjs` from scratch, mirroring the Phase 2 `tests/workflow-eval-review.test.cjs` skeleton + the upstream `ingest-docs.test.cjs` structure, against the already-shipped `oto/workflows/eval-review.md` + `oto/commands/oto/eval-review.md` + `oto/agents/oto-eval-auditor.md`.

**Required test surface** (≥10 assertions, mirror upstream `ingest-docs.test.cjs` style):

```javascript
// tests/eval-review.test.cjs (sketch — final naming and exact assertions are planner's call)
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CMD = path.join(ROOT, 'oto/commands/oto/eval-review.md');
const WF = path.join(ROOT, 'oto/workflows/eval-review.md');
const AUDITOR = path.join(ROOT, 'oto/agents/oto-eval-auditor.md');
const AI_EVALS_REF = path.join(ROOT, 'oto/references/ai-evals.md');

describe('eval-review file structure (TEST-02)', () => {
  test('command file exists', () => assert.ok(fs.existsSync(CMD)));
  test('workflow file exists', () => assert.ok(fs.existsSync(WF)));
  test('auditor agent exists', () => assert.ok(fs.existsSync(AUDITOR)));
  test('ai-evals reference exists', () => assert.ok(fs.existsSync(AI_EVALS_REF)));
});

describe('eval-review command frontmatter', () => {
  const content = fs.readFileSync(CMD, 'utf8');
  test('has name: oto:eval-review', () => assert.match(content, /^name:\s*oto:eval-review$/m));
  test('argument-hint mentions [phase', () => {
    const m = content.match(/^argument-hint:\s*"(.+)"$/m);
    assert.ok(m && m[1].includes('phase'));
  });
  test('allowed-tools include Task', () => assert.ok(content.includes('- Task')));
  test('references workflow and ai-evals', () => {
    assert.ok(content.includes('@~/.claude/oto/workflows/eval-review.md'));
    assert.ok(content.includes('@~/.claude/oto/references/ai-evals.md'));
  });
});

describe('eval-review workflow content', () => {
  const content = fs.readFileSync(WF, 'utf8');
  test('SDK init query has fallback', () => assert.match(content, /oto-sdk query init\.phase-op[^\n]*2>\/dev\/null/));
  test('AUDITOR_MODEL resolve has fallback', () => assert.match(content, /oto-sdk query resolve-model oto-eval-auditor[^\n]*2>\/dev\/null/));
  test('State A/B/C detection present', () => {
    assert.ok(content.includes('State A'));
    assert.ok(content.includes('State B'));
    assert.ok(content.includes('State C'));
  });
  test('dispatches oto-eval-auditor', () => assert.ok(content.includes('oto-eval-auditor')));
  test('orchestrator-persistence wording (Phase 1 D-04)', () => {
    // window check: orchestrator wording must appear near the oto-eval-auditor mention
    const lines = content.split('\n');
    let found = false;
    lines.forEach((line, idx) => {
      if (line.includes('oto-eval-auditor')) {
        const window = lines.slice(Math.max(0, idx - 5), idx + 20).join('\n');
        if (/orchestrator/i.test(window)) found = true;
      }
    });
    assert.ok(found, 'orchestrator wording must appear near oto-eval-auditor dispatch');
  });
  test('EVAL-REVIEW.md output target', () => assert.ok(content.includes('EVAL-REVIEW.md')));
  test('scoring vocabulary present', () => {
    assert.ok(content.includes('COVERED'));
    assert.ok(content.includes('PARTIAL'));
    assert.ok(content.includes('MISSING'));
  });
  test('verdict tokens present', () => {
    assert.ok(content.includes('PRODUCTION READY'));
    assert.ok(content.includes('NEEDS WORK'));
    assert.ok(content.includes('SIGNIFICANT GAPS'));
    assert.ok(content.includes('NOT IMPLEMENTED'));
  });
  test('no DEFERRED markers', () => {
    assert.ok(!/intentionally non-executable/i.test(content));
    assert.ok(!/DEFERRED/.test(content));
  });
  test('no gsd- token leakage', () => assert.ok(!content.includes('gsd-eval-auditor')));
});

describe('oto-eval-auditor agent', () => {
  const content = fs.readFileSync(AUDITOR, 'utf8');
  test('has Read, Bash, Grep, Glob tools (read-only per Phase 1 D-04)', () => {
    // Asserts tools list does NOT include Write — locks D-04
    assert.ok(/^tools:\s*.*Read/m.test(content));
    assert.ok(!/^tools:\s*.*Write/m.test(content), 'auditor must not declare Write (read-only sandbox)');
  });
  test('scoring vocabulary in agent prompt', () => {
    assert.ok(content.includes('COVERED'));
    assert.ok(content.includes('PARTIAL'));
    assert.ok(content.includes('MISSING'));
  });
});
```

### Pattern 3: Install-smoke extension (INST-03)

**What:** Extend `scripts/install-smoke.cjs` to assert that each of the three new agent files (`oto-doc-classifier.md`, `oto-doc-synthesizer.md`, `oto-eval-auditor.md`) is present in the target dir after `oto install --<runtime>`, for each of the three runtimes. Wire this into `install-smoke.yml` so both `smoke-tarball` and `smoke-unpacked` jobs assert the new agent files.

**Two complementary surfaces:**

1. **CI YAML** (the literal INST-03 requirement): add a bash step in both `smoke-tarball` and `smoke-unpacked` jobs that runs:
   ```bash
   # After `oto install --claude --config-dir <tmp>` in the smoke
   for AGENT in oto-doc-classifier oto-doc-synthesizer oto-eval-auditor; do
     test -f "$TMP/agents/$AGENT.md" || { echo "FAIL: $AGENT not installed"; exit 1; }
   done
   ```
   Repeat for `--codex` (assert `$TMP/agents/$AGENT.md`) and `--gemini` (assert `$TMP/agents/$AGENT.md`).
   For Codex, also assert `$TMP/agents/$AGENT.toml` contains the expected `sandbox_mode = "read-only"` or `"workspace-write"` per D-04.

2. **In-suite tests** (via `npm test` and the existing test matrix): update `EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs` from 23 → 26 entries (add the three new agents alphabetically). The existing `tests/phase-04-mr01-install-smoke.test.cjs` loop (`for (const agent of EXPECTED_AGENTS)`) then asserts each agent installs without further test changes.

### Pattern 4: Per-runtime parity smoke extension (PRTY-01)

**What:** Extend the existing `tests/phase-08-smoke-codex.integration.test.cjs` and `tests/phase-08-smoke-gemini.integration.test.cjs` (and add a Claude-side block, or reuse `tests/phase-04-mr01-install-smoke.test.cjs`) to assert per-runtime that:

- `/oto-ingest-docs` command file lands in the per-runtime command dir.
- `/oto-eval-review` command file lands in the per-runtime command dir.
- All three new agent files land in the per-runtime agents dir.
- For Codex: per-agent `.toml` shows the expected `sandbox_mode` (classifier `read-only`, synthesizer `workspace-write`, auditor `read-only`).

**Per-runtime command-surface differences (from Phase 2 + Phase 8 research):**

| Runtime | Command surface path | Agent surface path | Codex extras |
|---------|---------------------|--------------------|--|
| Claude | `commands/oto/ingest-docs.md`, `commands/oto/eval-review.md` | `agents/oto-*.md` | n/a |
| Codex | `skills/oto-ingest-docs/SKILL.md`, `skills/oto-eval-review/SKILL.md` (QUICK-260505-bxx pattern) | `agents/oto-*.md` | `agents/oto-*.toml` with `sandbox_mode = "<mode>"` |
| Gemini | `commands/oto/ingest-docs.md`, `commands/oto/eval-review.md` | `agents/oto-*.md` | n/a |

**Notably**: for Codex, the `commands/oto/` tree is NOT produced — only `skills/oto-*/SKILL.md`. Don't assert `commands/oto/ingest-docs.md` on the Codex install.

### Pattern 5: ADR-15 authoring against ADR-09 format

**What:** Write `decisions/ADR-15-restore-doc-and-eval-agents.md` strictly following the ADR-09 lightweight format. `tests/phase-01-adr-structure.test.cjs` enforces required fields.

**Example skeleton:**

```markdown
# ADR-15: Restore doc-intake and eval-review agents

Status: Accepted
Date: 2026-05-18
Implements: v0.3.0 Phase 1 D-01, D-04; Phase 3 ADR-01

## Context

ADR-07 dropped 10 GSD agents, including three (`gsd-doc-classifier`, `gsd-doc-synthesizer`, `gsd-eval-auditor`) that powered two `/oto-help` commands listed as `[deferred]` in v0.1.0: `/oto-ingest-docs` and `/oto-eval-review`. Those two dead commands violate v0.3.0's north-star goal ("no dead commands in `/oto-help`"). The minimal reversal that retires both stubs requires exactly the three named agents — restoring more would re-inflate the maintenance surface against the personal-use cost ceiling.

## Decision

Partially reverse ADR-07 by restoring exactly three of the ten dropped agents:

| Agent | Sandbox | Tools | Persistence model |
|-------|---------|-------|-------------------|
| `oto-doc-classifier` | `read-only` (Codex) | `Read, Grep, Glob` | Workflow orchestrator writes classifier's returned JSON to `.oto/intel/classifications/` |
| `oto-doc-synthesizer` | `workspace-write` (Codex) | `Read, Write, Grep, Glob, Bash` | Agent writes `.oto/INGEST-CONFLICTS.md` and `.oto/intel/SYNTHESIS.md` directly |
| `oto-eval-auditor` | `read-only` (Codex) | `Read, Bash, Grep, Glob` | Workflow orchestrator writes auditor's returned markdown to `.oto/phases/<phase>/EVAL-REVIEW.md` |

The remaining seven ADR-07-dropped agents (`oto-ai-researcher`, `oto-eval-planner`, `oto-framework-selector`, `oto-pattern-mapper`, `oto-intel-updater`, `oto-user-profiler`, `oto-debug-session-manager`) stay dropped per AGNT-DEFER-01.

## Rationale

The retained-set count grows from 23 to 26 — well under GSD's original 33 — and both `/oto-help` dead commands become live. The classifier and auditor are deliberately `read-only` to honor INST-02 and align with the existing `oto-plan-checker` / `oto-integration-checker` convention; the synthesizer keeps `workspace-write` because it must write conflict reports during its own run. The reactivation criterion from ADR-07 (paraphrased: a future milestone restores document intake) is satisfied by v0.3.0 itself.

## Consequences

- The rebrand engine's coverage manifest grows by three target paths (`oto/agents/oto-doc-classifier.md`, `oto/agents/oto-doc-synthesizer.md`, `oto/agents/oto-eval-auditor.md`) plus the `oto/references/doc-conflict-engine.md` reference.
- `decisions/file-inventory.json` and `decisions/agent-audit.md` mutate three rows from DROP to KEEP and update verdict counts (KEEP: 26, DROP: 7).
- `bin/lib/runtime-codex.cjs` `agentSandboxes` carries 26 entries.
- `oto/bin/lib/model-profiles.cjs` `EXPECTED_AGENTS` updates from 23 to 26.
- Future restoration of any of the remaining seven dropped agents requires a separate ADR superseding the AGNT-DEFER-01 deferral.
```

### Anti-Patterns to Avoid

- **Hand-porting the upstream `tests/ingest-docs.test.cjs`.** Violates CLAUDE.md and the Phase 1 D-01 / Phase 2 02-01 precedent. Always run `scripts/rebrand.cjs` first.
- **Porting the upstream `import command` describe block** (lines 285–307 of upstream). `/oto-import` is not in v0.3.0 scope; that block tests a different command's reference wiring. Drop it.
- **Adding a `Write` assertion to the classifier or auditor agent file in TEST-01 or TEST-02.** Phase 1 D-04 stripped `Write` from both; any assertion that requires it will fail. The upstream test has one such assertion in the classifier block — it must be fixed up.
- **Asserting `commands/oto/ingest-docs.md` on the Codex install.** Codex installs `skills/oto-ingest-docs/SKILL.md` instead (per QUICK-260505-bxx). Use the right path per runtime.
- **Writing ADR-15 in any format other than ADR-09's** — `tests/phase-01-adr-structure.test.cjs` will fail otherwise. Required sections: `Status:`, `Date:`, `Implements:`, `## Context`, `## Decision`, `## Rationale`, `## Consequences`.
- **Using the literal phrase "reactivation criterion" in ADR-15 as a verbatim quote from ADR-07.** ADR-07 does not contain that phrase. Paraphrase the criterion from ROADMAP.md milestone framing instead.
- **Letting the existing `tests/phase-04-mr01-install-smoke.test.cjs` pass without updating `EXPECTED_AGENTS`.** The test loops over the array; if the array doesn't include the three new agents, the test silently passes without asserting them. This is the load-bearing gap that INST-03 fixes.
- **Bumping the `pull_request: paths:` filter in `install-smoke.yml`** to exclude `tests/` or `oto/` — INST-03 wants install-smoke to fire when agent files change. The current paths filter (`bin/**`, `package.json`, `scripts/install-smoke.cjs`, `.github/workflows/install-smoke.yml`, `.github/workflows/release.yml`) should be extended to include `oto/agents/**` so renames/adds trigger smoke.
- **Pretending PRTY-01 needs new infrastructure.** The phase-08-smoke-{codex,gemini} tests already exist and already do isolated `--config-dir` installs; just extend their assertions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token substitution in upstream test file | Custom `sed` script | `scripts/rebrand.cjs` | Single source of truth; Phase 1+2 precedent |
| Per-runtime install smoke harness | New test infrastructure | Extend `tests/phase-08-smoke-{codex,gemini}.integration.test.cjs` + reuse `tests/phase-04-mr01-install-smoke.test.cjs` for Claude | Existing patterns proven through v0.1.0 + v0.2.0 |
| ADR format | Custom format | ADR-09 template + `tests/phase-01-adr-structure.test.cjs` enforcement | Already in place, machine-checkable |
| Agent enumeration for install-smoke | Custom helper | Update `EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs` (single source of truth) | Used by existing test loop; one-line change |
| Codex sandbox-mode assertion | Custom TOML parser | Grep for `sandbox_mode = "<mode>"` in the per-agent `.toml` (matches `tests/phase-08-codex-toml.test.cjs` pattern) | Pattern already in use |
| CI runner setup | New action | Reuse pinned `actions/checkout@de0fac…` and `actions/setup-node@53b83…` | Already in install-smoke.yml; SHA-pinned for supply-chain safety |
| Cross-machine agent dispatch test | Real Task() invocation | Markdown-shape assertion only (workflows are LLM prompts) | Same as Phase 2 — `node:test` can't execute LLM prompts |

**Key insight:** Phase 3's deliverable is **regression tests + CI assertions + one ADR**. Zero new shipped runtime surface. All four work streams extend existing patterns; the only fresh authoring is TEST-02 and ADR-15.

## Runtime State Inventory

> Phase 3 is a test + CI + ADR phase. Mostly code/config-only changes, but a few categories apply.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no DB / KV store referenced. New tests read existing files; CI assertions are ephemeral tmpdir installs that are cleaned up. | None |
| Live service config | **None** — no external services. | None |
| OS-registered state | **None** — no Task Scheduler / launchd / pm2 / systemd registrations. | None |
| Secrets/env vars | `OTO_VERSION` referenced by render scripts (no change). Tests use `npm_config_cache` and `npm_config_loglevel` env overrides in isolated test runs (pattern already in `tests/phase-04-mr01-install-smoke.test.cjs`). | None |
| Build artifacts | **`oto/bin/lib/model-profiles.cjs`** has a stale `EXPECTED_AGENTS` array (23 instead of 26). This is a one-line module export, not a build artifact strictly — but it functions as a golden enumeration and is consumed by the install-smoke test. **Action: update from 23 → 26 entries during INST-03**. Also: any cached `oto-*.egg-info`-style artifacts? None — pure Node project. | Update `EXPECTED_AGENTS` array |

## Common Pitfalls

### Pitfall 1: Stale `EXPECTED_AGENTS` lets install-smoke pass silently

**What goes wrong:** `tests/phase-04-mr01-install-smoke.test.cjs` loops over `EXPECTED_AGENTS` from `oto/bin/lib/model-profiles.cjs`. The array currently has 23 entries. After Phase 1 added three new agents to `oto/agents/`, the test was supposed to break — but it didn't, because the array wasn't extended. The test passes today, asserting only the 23 v0.1.0 agents install.

**Why it happens:** No automated coverage between "what's on disk in `oto/agents/`" and "what `EXPECTED_AGENTS` enumerates." The fixture `tests/fixtures/phase-04/retained-agents.json` has the correct 26 entries but is only consumed by `tests/phase-04-codex-sandbox-coverage.test.cjs`.

**How to avoid:** Update `EXPECTED_AGENTS` to 26 entries in `oto/bin/lib/model-profiles.cjs` during the INST-03 plan. Optional hardening: add a test that asserts `EXPECTED_AGENTS` set-equals the set of `*.md` files in `oto/agents/` (sets up a single source-of-truth contract).

**Warning signs:** `npm test` passes, but `ls $TMP/agents/oto-doc-classifier.md` returns no such file after `oto install --claude --config-dir $TMP`.

### Pitfall 2: Porting the upstream import-command block to TEST-01

**What goes wrong:** The upstream `tests/ingest-docs.test.cjs` ends with a 22-line `describe('import command adopts shared conflict-engine', …)` block (lines 285–307) that asserts `/gsd-import` correctly references the shared `doc-conflict-engine.md`. `/oto-import` is not in v0.3.0 scope, and this block tests a different command's reference wiring. Porting it produces test failures or, worse, false-pass tests if `oto/commands/oto/import.md` exists in a different shape.

**Why it happens:** Mechanical port through `scripts/rebrand.cjs` produces all of the upstream test file; it doesn't know which blocks are out-of-scope.

**How to avoid:** Drop the `import command adopts shared conflict-engine` describe block (and its `cmdContent`/`wfContent` reads) during the TEST-01 hand-fixup pass. Document the deletion in the plan SUMMARY.

**Warning signs:** Tests fail with `oto/commands/oto/import.md` not found, or assertions reference `doc-conflict-engine.md` in a command that doesn't load it.

### Pitfall 3: D-04 stale assertion in TEST-01 classifier block

**What goes wrong:** Upstream line 192: `assert.match(content, /^tools:\s*.*Read.*Write.*/m)` (classifier "has Read and Write tools"). The oto classifier shipped in Phase 1 has tools `Read, Grep, Glob` only — no `Write`. The ported assertion will fail because the regex requires `Write` after `Read`.

**Why it happens:** Phase 1 D-04 stripped `Write` from the classifier agent's tool list to honor the `read-only` Codex sandbox lock. Upstream classifier kept it. Mechanical port doesn't know about the downstream reshape.

**How to avoid:** During TEST-01 hand-fixup, change the assertion to assert the **absence** of `Write` and the presence of `Read, Grep, Glob`. Test name should change too: "has Read, Grep, Glob tools (read-only per Phase 1 D-04)". The synthesizer assertion (`Read.*Write.*Bash`) is fine — synthesizer kept `Write`.

**Warning signs:** TEST-01 fails with a regex-doesn't-match error in the classifier block.

### Pitfall 4: Codex parity smoke asserts `commands/oto/ingest-docs.md` (wrong path)

**What goes wrong:** A naive PRTY-01 extension to `tests/phase-08-smoke-codex.integration.test.cjs` asserts `$TMP/commands/oto/ingest-docs.md` exists. The Codex install does NOT produce `commands/oto/` — it produces `skills/oto-ingest-docs/SKILL.md` per QUICK-260505-bxx (the Codex command-to-skill adapter).

**Why it happens:** Claude / Gemini share the `commands/oto/<name>.md` shape; Codex diverges.

**How to avoid:** For Codex, assert `$TMP/skills/oto-ingest-docs/SKILL.md` and `$TMP/skills/oto-eval-review/SKILL.md`. The existing test already does this pattern for help/progress/new-project (lines 60–67 of `phase-08-smoke-codex.integration.test.cjs`); just extend the array. Also assert that `commands/oto/` does NOT exist on Codex (existing test does this at line 70–74).

**Warning signs:** Codex parity test fails with `commands/oto/ingest-docs.md` not found, while files actually present in `skills/`.

### Pitfall 5: ADR-15 misses required sections per ADR-09 format

**What goes wrong:** `tests/phase-01-adr-structure.test.cjs` runs over every `decisions/ADR-*.md` and asserts each has `Status:`, `Date:`, `Implements:` frontmatter lines and `## Context`, `## Decision`, `## Rationale`, `## Consequences` section headers. ADR-15 missing any of these fails the test.

**Why it happens:** Easy to forget under deadline pressure, especially the `Implements:` line if the planner thinks it's optional.

**How to avoid:** Use the ADR-15 skeleton in Pattern 5 above verbatim. Run `node --test tests/phase-01-adr-structure.test.cjs` immediately after writing the ADR.

**Warning signs:** `tests/phase-01-adr-structure.test.cjs` reports failure on `decisions/ADR-15-*.md`.

### Pitfall 6: Mixing TEST-01 and TEST-02 in one plan and hitting `files_modified` blockage

**What goes wrong:** If TEST-01 (`tests/ingest-docs.test.cjs`) and TEST-02 (`tests/eval-review.test.cjs`) are in different plans run in parallel, no conflict. But if INST-03 also touches `oto/bin/lib/model-profiles.cjs` and PRTY-01 touches the same file (e.g., to add a tool-map entry), parallel execution dies on `files_modified` overlap.

**Why it happens:** EXPECTED_AGENTS update is INST-03's responsibility; PRTY-01 doesn't touch model-profiles.cjs in the recommended decomposition.

**How to avoid:** Ensure INST-03's plan owns `oto/bin/lib/model-profiles.cjs` exclusively. PRTY-01 only touches `tests/phase-08-smoke-{codex,gemini}.integration.test.cjs` (and optionally `tests/phase-04-mr01-install-smoke.test.cjs` if reused for Claude PRTY).

**Warning signs:** Parallel plans declared with overlapping `files_modified`.

### Pitfall 7: `install-smoke.yml` agent-file step doesn't fail loudly enough

**What goes wrong:** A bash loop in the YAML step uses `test -f $AGENT || echo MISSING` without `exit 1`. The loop prints MISSING but the step exits 0, so CI passes despite the missing file.

**Why it happens:** Easy to forget the `|| { echo MISSING; exit 1; }` pattern under bash.

**How to avoid:** Use `set -euo pipefail` at the top of the smoke step (existing pattern in `install-smoke.yml`), then either `test -f ... || exit 1` or wrap each in `{ echo "FAIL: $AGENT not installed"; exit 1; }`. The example in Pattern 3 above shows the correct shape.

**Warning signs:** CI passes after deleting `oto/agents/oto-doc-classifier.md` from the working tree — clear signal the assertion doesn't fire.

### Pitfall 8: Forgetting AGNT-DEFER-01 affirmation in ADR-15

**What goes wrong:** ADR-15 names the three restored agents but doesn't explicitly say the other seven stay dropped. AGNT-DEFER-01 from REQUIREMENTS.md v2 says "ADR-15 (Phase 3) explicitly affirms these stay deferred." Missing this clause means a future reader could read ADR-15 as the start of a broader restoration.

**Why it happens:** Easy to focus on what's restored rather than what stays dropped.

**How to avoid:** ADR-15's `## Decision` section must enumerate the seven that stay dropped (see Pattern 5 skeleton). Cite AGNT-DEFER-01 by name.

**Warning signs:** A grep for `oto-pattern-mapper\|oto-ai-researcher\|AGNT-DEFER-01` in `decisions/ADR-15-*.md` returns 0 hits.

### Pitfall 9: Rebrand engine writes outside `oto/` for the test port

**What goes wrong:** `scripts/rebrand.cjs --apply` writes engine output under `<out>/tests/ingest-docs.test.cjs`. The planner assumes this is the final shipping location and skips the explicit copy step. The shipped `tests/ingest-docs.test.cjs` never gets the rebranded content.

**Why it happens:** Engine output is staged to `--out` (defaults to `.oto-rebrand-out/`), not into the repo tree (Phase 2 Pitfall 3 identical pattern).

**How to avoid:** Plan must include an explicit `cp .oto-rebrand-stage/tests/ingest-docs.test.cjs tests/ingest-docs.test.cjs` step (same as Phase 2's workflow copy). Then `rm -rf .oto-rebrand-stage`.

**Warning signs:** `npm test` reports no new test file detected; `git status` shows no `tests/ingest-docs.test.cjs` change.

## Code Examples

### Run the rebrand engine for TEST-01 port

```bash
# Source: scripts/rebrand.cjs (verified during Phase 2 research)
node scripts/rebrand.cjs --apply \
  --target foundation-frameworks/get-shit-done-main \
  --owner OTOJulian \
  --out .oto-rebrand-stage

# Copy ported test file into shipping location
cp .oto-rebrand-stage/tests/ingest-docs.test.cjs tests/ingest-docs.test.cjs

# Hand-fixup the stale classifier assertion (line ~191 in port):
# OLD: assert.match(content, /^tools:\s*.*Read.*Write.*/m);
# NEW: assert.match(content, /^tools:\s*.*Read.*Grep.*Glob/m); assert.ok(!/Write/.test(content.match(/^tools:.*$/m)?.[0] || ''));

# Drop the out-of-scope import-command describe block (lines 285–307 of port)

# Clean staging
rm -rf .oto-rebrand-stage

# Verify
node --test tests/ingest-docs.test.cjs
```

### Update EXPECTED_AGENTS (INST-03)

```javascript
// oto/bin/lib/model-profiles.cjs — extend the array
const EXPECTED_AGENTS = [
  'oto-advisor-researcher',
  'oto-assumptions-analyzer',
  'oto-code-fixer',
  'oto-code-reviewer',
  'oto-codebase-mapper',
  'oto-debugger',
  'oto-doc-classifier',     // NEW (v0.3.0 Phase 1)
  'oto-doc-synthesizer',    // NEW (v0.3.0 Phase 1)
  'oto-doc-verifier',
  'oto-doc-writer',
  'oto-domain-researcher',
  'oto-eval-auditor',       // NEW (v0.3.0 Phase 1)
  'oto-executor',
  'oto-integration-checker',
  'oto-nyquist-auditor',
  'oto-phase-researcher',
  'oto-plan-checker',
  'oto-planner',
  'oto-project-researcher',
  'oto-research-synthesizer',
  'oto-roadmapper',
  'oto-security-auditor',
  'oto-ui-auditor',
  'oto-ui-checker',
  'oto-ui-researcher',
  'oto-verifier',
];  // 26 entries
```

### Extend `install-smoke.yml` for INST-03

```yaml
# In smoke-tarball job, after "Pack and install tarball" step:
- name: Assert new agent files installed for each runtime (INST-03)
  shell: bash
  run: |
    set -euo pipefail
    for RUNTIME in claude codex gemini; do
      TMP=$(mktemp -d)
      oto install "--$RUNTIME" --config-dir "$TMP"
      for AGENT in oto-doc-classifier oto-doc-synthesizer oto-eval-auditor; do
        test -f "$TMP/agents/$AGENT.md" || { echo "FAIL: $RUNTIME missing $AGENT.md"; exit 1; }
      done
      if [ "$RUNTIME" = "codex" ]; then
        # Phase 1 D-04: assert sandbox_mode per agent
        grep -q 'sandbox_mode\s*=\s*"read-only"' "$TMP/agents/oto-doc-classifier.toml"
        grep -q 'sandbox_mode\s*=\s*"workspace-write"' "$TMP/agents/oto-doc-synthesizer.toml"
        grep -q 'sandbox_mode\s*=\s*"read-only"' "$TMP/agents/oto-eval-auditor.toml"
      fi
      rm -rf "$TMP"
    done
    echo "PASS: 3 new agents installed across claude/codex/gemini (tarball)"

# Mirror the same step in smoke-unpacked job after "Install from unpacked workspace" step
```

### Per-runtime parity extension (PRTY-01)

```javascript
// tests/phase-08-smoke-codex.integration.test.cjs — append assertions:
test('PRTY-01: /oto-ingest-docs and /oto-eval-review skill surfaces install (codex)', async (t) => {
  const tmp = freshTmpDir('oto-smoke-codex-prty-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const install = installCodex(tmp);
  assert.equal(install.status, 0, `install failed: ${install.stderr}`);

  for (const skill of ['skills/oto-ingest-docs/SKILL.md', 'skills/oto-eval-review/SKILL.md']) {
    assert.ok(fs.existsSync(path.join(tmp, skill)), `${skill} must install`);
  }
  for (const agent of ['oto-doc-classifier', 'oto-doc-synthesizer', 'oto-eval-auditor']) {
    assert.ok(fs.existsSync(path.join(tmp, 'agents', `${agent}.md`)), `${agent}.md must install`);
    const tomlPath = path.join(tmp, 'agents', `${agent}.toml`);
    assert.ok(fs.existsSync(tomlPath), `${agent}.toml must install`);
    const toml = fs.readFileSync(tomlPath, 'utf8');
    const expectedMode = agent === 'oto-doc-synthesizer' ? 'workspace-write' : 'read-only';
    assert.match(toml, new RegExp(`sandbox_mode\\s*=\\s*"${expectedMode}"`),
      `${agent}.toml must declare sandbox_mode = "${expectedMode}" per Phase 1 D-04`);
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tests/phase-04-mr01-install-smoke.test.cjs` asserts 23 retained agents via `EXPECTED_AGENTS` | Will assert 26 retained agents after `EXPECTED_AGENTS` is updated | Phase 3 (this phase) | INST-03 satisfied in the in-suite test path; CI YAML path also updated |
| `install-smoke.yml` runs `oto --help` and asserts PATH + executable bit only | Will additionally assert per-runtime install + 3 new agent files + Codex sandbox lines | Phase 3 (this phase) | INST-03 satisfied at the CI YAML surface |
| `tests/phase-08-smoke-{codex,gemini}.integration.test.cjs` assert basic spine commands (help/progress/new-project) install per runtime | Will additionally assert `/oto-ingest-docs` + `/oto-eval-review` command surfaces + 3 new agent files per runtime | Phase 3 (this phase) | PRTY-01 satisfied |
| `decisions/` highest ADR: ADR-14 | ADR-15 added | Phase 3 (this phase) | Formal record of v0.3.0 reversal |
| `/oto-help` advertises `/oto-ingest-docs` and `/oto-eval-review` as live commands but no tests yet lock the contract end-to-end across runtimes | TEST-01 + TEST-02 + PRTY-01 lock the contract | Phase 3 (this phase) | v0.3.0 baseline complete |

**Deprecated/outdated:**
- The 23-entry `EXPECTED_AGENTS` array — stale since Phase 1 added three agents.
- The interpretation of ADR-07's "drop list" as absolute — superseded by ADR-15 for three named agents; remaining seven still apply.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The rebrand engine produces clean output for `tests/ingest-docs.test.cjs` requiring only the classifier `Write`-assertion fixup and the import-block deletion | Pattern 1 + Pitfalls 2, 3 | Could miss additional engine blind spots specific to test-file content (e.g., path constants like `path.join(ROOT, 'commands', 'gsd', 'ingest-docs.md')` need to become `path.join(ROOT, 'oto/commands/oto', 'ingest-docs.md')` — research suggests this is handled by rename-map `path` rules but not verified empirically). Mitigation: planner runs the engine and diffs output before committing. |
| A2 | `decisions/file-inventory.json` already has the row for `tests/ingest-docs.test.cjs` set to `verdict: keep, rebrand_required: true` with correct `target_path` | Pattern 1 step 1 | If the row is `verdict: drop` or missing `target_path`, the engine will not produce output for this file. Mitigation: planner verifies the row before running the engine; flips if needed. Phase 2 had the same dependency and verified ahead of time. |
| A3 | Updating `EXPECTED_AGENTS` to 26 entries does not break any other tests | INST-03 plan | Other tests may consume `EXPECTED_AGENTS` and assert length === 23. Mitigation: grep for `EXPECTED_AGENTS` consumers (verified during research: 5 hits, primarily `tests/phase-04-mr01-install-smoke.test.cjs`, `oto/bin/lib/core.cjs`, `tests/workflow-*.test.cjs`). Planner should re-run the full suite after the update. |
| A4 | ADR-07 does not contain a literal "reactivation criterion" sentence | Summary point 7 + Pattern 5 | If a literal phrase exists in ADR-07 that the additional_context message paraphrased, ADR-15 may quote a non-existent sentence. **VERIFIED FALSE-RISK** during research — read ADR-07 in full: it lists drops by category in a table but contains no "reactivation criterion" sentence. ADR-15 must paraphrase. |
| A5 | Codex install produces `agents/<name>.toml` files in addition to `agents/<name>.md` | Code Example "Per-runtime parity extension" | If the Codex install structure is different (e.g., TOMLs in a sibling directory), the assertion path is wrong. Mitigation: planner runs `tests/phase-08-smoke-codex.integration.test.cjs` against a fresh tmpdir and inspects layout before writing the assertion. Pattern `tests/phase-08-codex-toml.test.cjs` (5920 LOC index entry suggests it exists and asserts TOML shape) is the precedent to follow. |
| A6 | The pre-built `tests/phase-04-mr01-install-smoke.test.cjs` (Claude) can serve as PRTY-01's Claude surface once `EXPECTED_AGENTS` is updated | Pattern 4 + 02-RESEARCH Recommended Plan Shape | If PRTY-01 requires distinct command-surface assertions (e.g., `/oto-ingest-docs` and `/oto-eval-review` Claude command files in `$TMP/commands/oto/`) that `phase-04-mr01-install-smoke.test.cjs` doesn't currently cover, the planner needs to add them. Today the test asserts `commands/oto/plan-phase.md` exists but doesn't enumerate other command files. Mitigation: extend the test to assert the two restored Claude command files explicitly. |
| A7 | `tests/eval-review.test.cjs` does not need a fixture tree (unlike `tests/ingest-docs.test.cjs` which has `tests/fixtures/ingest-docs/`) | Pattern 2 + Recommended Plan Shape | `/oto-eval-review` operates against a phase directory in `.oto/phases/<N>-<slug>/` — a fixture phase directory might strengthen the test (assert `EVAL-REVIEW.md` could be produced if the workflow ran). Mitigation: planner can decide whether to add `tests/fixtures/eval-review/<phase-N>-<slug>/{N-PLAN.md, N-AI-SPEC.md, N-SUMMARY.md}` as a stretch. Not required by TEST-02 — workflow-shape assertions suffice. |
| A8 | The current `install-smoke.yml` pull_request paths filter can be extended without breaking existing triggers | Code Example "Extend install-smoke.yml" + Anti-Patterns | If the paths filter excludes `oto/agents/**`, deleting an agent file from a PR won't trigger the smoke; adding `oto/agents/**` to the filter is safe (broadens trigger surface). Mitigation: planner extends the filter and validates with a test PR that touches only an agents file. |

## Open Questions

1. **Does `decisions/file-inventory.json` currently have `tests/ingest-docs.test.cjs` marked as keep + rebrand_required, or is it set to drop?**
   - What we know: Phase 2 verified workflow rows were correctly set before running the engine. Tests in the upstream-tests path may have been excluded from Phase 1's inventory edits.
   - What's unclear: Whether the row exists at all, and if so, what verdict.
   - Recommendation: Planner runs `grep ingest-docs.test.cjs decisions/file-inventory.json` and reports state. If row is `verdict: drop`, flip to `verdict: keep` with `target_path: tests/ingest-docs.test.cjs, rebrand_required: true, phase_owner: 3, reason: "v0.3.0 Phase 3 TEST-01 port"`. This becomes one task within the TEST-01 plan.

2. **Should PRTY-01 add a Claude-side parity test or extend `tests/phase-04-mr01-install-smoke.test.cjs`?**
   - What we know: `tests/phase-04-mr01-install-smoke.test.cjs` already covers Claude install smoke. Symmetric per-runtime parity would suggest a `tests/phase-08-smoke-claude.integration.test.cjs` to match the Codex and Gemini siblings.
   - What's unclear: Whether the project's convention favors symmetry or pragmatic reuse.
   - Recommendation: **Extend `tests/phase-04-mr01-install-smoke.test.cjs`** with the two new command-file assertions for `/oto-ingest-docs` and `/oto-eval-review`. Reuse keeps the test count tighter and avoids duplicating `npm pack` overhead. If the project converges on per-runtime symmetry later, the test can be renamed.

3. **Should the EXPECTED_AGENTS bump live in INST-03's plan or Phase 1's plan (retroactively)?**
   - What we know: Phase 1 finished with `EXPECTED_AGENTS` stale; Phase 1 verification passed despite the staleness.
   - What's unclear: Whether Phase 3 should "fix" Phase 1's gap or roll the fix forward as part of INST-03's scope.
   - Recommendation: **Roll forward as part of INST-03**. Phase 1 is closed; reopening it would inflate scope. The fix is one-line and naturally belongs with the install-smoke assertions it unblocks.

4. **Should ADR-15 reference Phase 1 D-04 directly (the read-only-agent reshape) or only summarize the outcome?**
   - What we know: D-04 is the Phase 1 decision that reshaped classifier and auditor tool lists. ADR-15 names sandbox modes per agent.
   - What's unclear: Whether the ADR should cite Phase 1's decision-ID-level references or stand alone.
   - Recommendation: Reference Phase 1 D-04 in the `Implements:` frontmatter line and the `## Context` body for traceability. The ADR-15 skeleton in Pattern 5 above does both.

5. **Should INST-03 also update the install-smoke paths filter to include `oto/agents/**`?**
   - What we know: Current paths filter: `bin/**`, `package.json`, `scripts/install-smoke.cjs`, `.github/workflows/install-smoke.yml`, `.github/workflows/release.yml`. Adding/removing an agent file does NOT currently trigger install-smoke on PR.
   - What's unclear: Whether triggering install-smoke on every agent file PR is desirable (it adds CI minutes) or whether the in-suite tests via `npm test` (always-run) are sufficient.
   - Recommendation: **Add `oto/agents/**` to the filter**. Install-smoke catches install-shape regressions that in-suite tests can't (e.g., file mode 644 on a freshly-renamed agent). The marginal CI cost is small.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts and tests | ✓ | 22+ (project requires; CI tests on 22 + 24) | — |
| `node:test` | All phase tests | ✓ | builtin | — |
| `npm` (CLI) | `npm pack`, `npm install -g`, `npm test` | ✓ | ≥10 (Node 22+ ships) | — |
| `scripts/rebrand.cjs` | TEST-01 port mechanic | ✓ | repo-local | — |
| `scripts/install-smoke.cjs` | INST-03 CI smoke harness | ✓ | repo-local | — |
| GitHub Actions runner | `install-smoke.yml`, `test.yml` | ✓ (CI only — ubuntu-latest + macos-latest) | pinned by SHA | local `act` if needed but not required |
| `git` | Commits | ✓ | — | — |
| `codex` CLI | `tests/phase-08-smoke-codex.integration.test.cjs` integration assertions | conditional | ≥0.120 | Test self-skips via `probeCodex()` |
| `gemini` CLI | `tests/phase-08-smoke-gemini.integration.test.cjs` integration assertions | conditional | ≥0.38 | Test self-skips via `probeGemini()` |
| `claude` CLI | Optional — not strictly required by tests; `tests/phase-04-mr01-install-smoke.test.cjs` uses `node bin/install.js` directly | n/a | — | — |
| `oto-sdk` | NONE of the new tests should depend on it | ✗ | — | Tests must use `2>/dev/null || …` if invoking workflow surfaces; pattern already standard |
| Three new agent files (`oto/agents/oto-{doc-classifier,doc-synthesizer,eval-auditor}.md`) | All four work streams | ✓ | landed in Phase 1 | — |
| Two restored command files (`oto/commands/oto/{ingest-docs,eval-review}.md`) | TEST-01, TEST-02, PRTY-01 | ✓ | landed in Phase 1/Phase 2 | — |
| Two rebrand-ported workflow bodies (`oto/workflows/{ingest-docs,eval-review}.md`) | TEST-01, TEST-02 | ✓ | landed in Phase 2 | — |
| `oto/references/{doc-conflict-engine,ai-evals,gate-prompts,ui-brand}.md` | TEST-01, TEST-02 reference assertions | ✓ | already shipped (doc-conflict-engine landed Phase 1; rest pre-existing) | — |
| `bin/lib/runtime-codex.cjs` `agentSandboxes` | PRTY-01 Codex sandbox assertion | ✓ | already 26 entries (Phase 1) | — |
| `tests/fixtures/phase-04/retained-agents.json` | PRTY-01 + Codex sandbox coverage test | ✓ | already 26 entries | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `codex` and `gemini` CLIs are conditional — tests self-skip if absent. `oto-sdk` is deferred (SDK-DEFER-01) and must not be relied on by new tests.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (builtin Node 22+) |
| Config file | none — `npm test` calls `scripts/run-tests.cjs`; current Phase 2 baseline 562 tests / 561 pass / 1 skip / 0 fail |
| Quick run command | `node --test tests/ingest-docs.test.cjs tests/eval-review.test.cjs tests/phase-04-mr01-install-smoke.test.cjs tests/phase-08-smoke-codex.integration.test.cjs tests/phase-08-smoke-gemini.integration.test.cjs` |
| Full suite command | `npm test` |
| Install-smoke command | `node scripts/install-smoke.cjs --ref HEAD` (manual) or push to a branch and let `install-smoke.yml` fire |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Ported upstream `ingest-docs.test.cjs` passes (file shape + frontmatter + reference + content + agent-shape assertions for `/oto-ingest-docs`) | unit (markdown-artifact) | `node --test tests/ingest-docs.test.cjs` | ❌ Wave 0 |
| TEST-02 | New `eval-review.test.cjs` passes (file shape + frontmatter + reference + content + agent-shape assertions for `/oto-eval-review`) | unit (markdown-artifact) | `node --test tests/eval-review.test.cjs` | ❌ Wave 0 |
| TEST-03 | Full suite stays green at v0.2.0 + new tests | regression | `npm test` (target: ~596 tests / 595 pass / 1 skip / 0 fail; planner sets exact post-Wave-1 number) | ✅ exists (`scripts/run-tests.cjs`) |
| INST-03 (in-suite) | `tests/phase-04-mr01-install-smoke.test.cjs` asserts all 26 retained agents install for Claude | integration (npm pack + install) | `node --test tests/phase-04-mr01-install-smoke.test.cjs` | ✅ exists (needs EXPECTED_AGENTS update) |
| INST-03 (CI YAML) | `install-smoke.yml` asserts 3 new agent files per runtime under both install paths | smoke (CI bash) | push to branch; `install-smoke.yml` runs | ✅ exists (needs step extension) |
| INST-03 (Codex sandbox) | Codex install per-agent `.toml` declares correct `sandbox_mode` for 3 new agents | integration | inline in `tests/phase-08-smoke-codex.integration.test.cjs` (extended) and `install-smoke.yml` (codex job) | ✅ exists (needs assertion additions) |
| PRTY-01 (Claude) | `/oto-ingest-docs` and `/oto-eval-review` command files + 3 agent files install in Claude config dir | integration (npm pack + install) | extend `tests/phase-04-mr01-install-smoke.test.cjs` | ✅ exists (needs command-file assertions) |
| PRTY-01 (Codex) | `/oto-ingest-docs` and `/oto-eval-review` skill files + 3 agent files install in Codex config dir; per-agent `.toml` sandbox correct | integration | extend `tests/phase-08-smoke-codex.integration.test.cjs` | ✅ exists (needs PRTY-01 block) |
| PRTY-01 (Gemini) | `/oto-ingest-docs` and `/oto-eval-review` command files + 3 agent files install in Gemini config dir | integration | extend `tests/phase-08-smoke-gemini.integration.test.cjs` | ✅ exists (needs PRTY-01 block) |
| ADR-01 | `decisions/ADR-15-restore-doc-and-eval-agents.md` follows ADR-09 format and names 3 restored agents + 7 still-dropped + sandbox decisions | unit (format) | `node --test tests/phase-01-adr-structure.test.cjs` (auto-discovers ADR-15) | ✅ exists (auto-discovers new ADRs) |

### Sampling Rate

- **Per task commit:** `node --test tests/ingest-docs.test.cjs tests/eval-review.test.cjs tests/phase-01-adr-structure.test.cjs tests/phase-04-mr01-install-smoke.test.cjs tests/phase-08-smoke-codex.integration.test.cjs tests/phase-08-smoke-gemini.integration.test.cjs` — fast targeted run on each Phase 3 commit.
- **Per wave merge:** `npm test` — full suite, must stay at the post-Wave-1 baseline number with 0 failures.
- **Phase gate:**
  - Full suite green at the new baseline (~596 tests / 595 pass / 1 skip / 0 fail).
  - `node --test tests/phase-01-adr-structure.test.cjs` passes on ADR-15.
  - `install-smoke.yml` passes on a fresh CI run (both `smoke-tarball` and `smoke-unpacked` jobs).
  - `grep '\bdeferred\b' oto/commands/oto/{ingest-docs,eval-review}.md` returns 0 (Phase 2 lock holds).
  - `EXPECTED_AGENTS.length === 26` in `oto/bin/lib/model-profiles.cjs`.

### Wave 0 Gaps

- [ ] `tests/ingest-docs.test.cjs` — TEST-01, ported from upstream via `scripts/rebrand.cjs --apply` + hand fixups (classifier `Write` assertion, drop import-block).
- [ ] `tests/eval-review.test.cjs` — TEST-02, fresh authoring against `oto/workflows/eval-review.md` + `oto/commands/oto/eval-review.md` + `oto/agents/oto-eval-auditor.md`.
- [ ] `oto/bin/lib/model-profiles.cjs` `EXPECTED_AGENTS` update (23 → 26).
- [ ] `scripts/install-smoke.cjs` extension to assert 3 new agent files per runtime (or unified helper that all three runtimes use).
- [ ] `.github/workflows/install-smoke.yml` step additions in both `smoke-tarball` and `smoke-unpacked` jobs to assert new agent files (and Codex sandbox lines) under both install paths.
- [ ] `tests/phase-08-smoke-codex.integration.test.cjs` PRTY-01 block: assert 2 skill files + 3 agent files + 3 sandbox-mode lines.
- [ ] `tests/phase-08-smoke-gemini.integration.test.cjs` PRTY-01 block: assert 2 command files + 3 agent files.
- [ ] `tests/phase-04-mr01-install-smoke.test.cjs` PRTY-01 Claude additions: assert 2 command files (in addition to existing 3-agent loop via EXPECTED_AGENTS).
- [ ] `decisions/ADR-15-restore-doc-and-eval-agents.md` (NEW).
- [ ] Optional: `tests/fixtures/eval-review/<phase>/` fixture tree if planner chooses to deepen TEST-02 (Stretch — research recommends skipping for v0.3.0; workflow-shape assertions are sufficient).
- [ ] Optional: `install-smoke.yml` `pull_request: paths:` filter extension to include `oto/agents/**`.

(Framework install: none — `node:test` is builtin.)

## Security Domain

> `security_enforcement` not explicitly set in `.oto/config.json` for this project; treat as enabled per default convention. Phase 3 is a test + CI + documentation phase with no runtime parsing of user input. Most ASVS categories don't apply.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | yes (Codex sandbox) | `sandbox_mode = "read-only"` for classifier + auditor (no write capability) and `sandbox_mode = "workspace-write"` for synthesizer (scoped to workspace). PRTY-01's Codex parity smoke must assert these survive install. Already locked in `bin/lib/runtime-codex.cjs` line 90-92; Phase 3 only verifies. |
| V5 Input Validation | yes (preserved from Phase 2) | The Phase 2 workflow body contains `case "{SCAN_PATH}" in *..*) ...` + realpath containment + BLOCKER gate. **Phase 3 tests must NOT touch these** — `tests/workflow-ingest-docs.test.cjs` already asserts they survive. Phase 3 just needs to not regress them. |
| V6 Cryptography | no | n/a |
| V14 Configuration | yes | `install-smoke.yml` MUST keep `actions/checkout@de0fac…` and `actions/setup-node@53b83…` SHA-pinned (current state). Any new action added must also be SHA-pinned. No floating `@v3` or `@main`. |

### Known Threat Patterns for the stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain attack via floating GitHub Actions ref | Tampering | SHA-pin all actions (existing pattern); any new action in install-smoke.yml MUST be pinned by full SHA |
| `npm install -g <attacker-tarball>` in CI smoke | Tampering / EoP | Already mitigated by installing from `$GITHUB_WORKSPACE/$TARBALL` produced in-job, not from a registry. New steps must preserve this — no `npm install -g` from a URL outside the runner. |
| Codex sandbox-mode regression (e.g., synthesizer accidentally becomes `read-only`, breaking its `.oto/INGEST-CONFLICTS.md` write, OR classifier accidentally becomes `workspace-write`, breaking the D-04 lock) | Tampering | PRTY-01 Codex parity smoke asserts exact `sandbox_mode` per agent. INST-03 CI step also asserts. Two layers. |
| ADR drift — ADR-15 written but `decisions/file-inventory.json` and `decisions/agent-audit.md` don't reference it | Repudiation | Planner should backfill the ADR-15 cross-reference in inventory + audit `reason` fields per Phase 1 D-07's deferred work (Phase 1 used `"v0.3.0 Phase 1 agent port — partial ADR-07 reversal"` provisionally; Phase 3 ADR-15 plan can update to `"v0.3.0 Phase 1 agent port — see ADR-15"`). |

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Phase 3 Impact |
|------------|--------|----------------|
| Node.js >= 22.0.0 | CLAUDE.md engines field; package.json | All new tests + scripts must run on Node 22 (CI tests on 22 + 24) |
| CommonJS (`.cjs`) for tooling, raw `.js`/`.md` for shipped artifacts | CLAUDE.md TL;DR | All new test files MUST be `.cjs`; no TypeScript at top level |
| Test framework: `node:test` (builtin) | CLAUDE.md TL;DR HIGH | TEST-01, TEST-02, INST-03, PRTY-01 ALL use `node:test`; no Vitest or Jest |
| No TypeScript at top level | CLAUDE.md | All new files stay `.cjs` / `.md` / `.yml` |
| Runtime targets: Claude / Codex / Gemini only | CLAUDE.md + PROJECT.md | PRTY-01 explicitly covers exactly these three; OpenCode / Cursor / Windsurf are out of scope |
| Install mechanism: copy files (not symlink) | CLAUDE.md | INST-03 + PRTY-01 install-smoke tests assert file presence at copied paths, never symlinks |
| Personal-use cost ceiling | CLAUDE.md core value | ADR-15 explicitly affirms AGNT-DEFER-01 (don't re-inflate to all 33 agents) |
| MIT-licensed both upstreams; attribution preserved | CLAUDE.md constraints | TEST-01 port should preserve any upstream attribution comment block (research note: upstream `tests/ingest-docs.test.cjs` head comment cites `#2387` — rebrand handles `gsd-` references; planner may keep or drop the issue number) |
| GitHub Actions for CI | CLAUDE.md TL;DR | INST-03 stays in `install-smoke.yml`; SHA-pinned actions preserved |
| `npm install -g github:OTOJulian/oto-hybrid-framework[#vX.Y.Z]` is the install path | CLAUDE.md TL;DR | INST-03 CI step uses tarball + unpacked-dir patterns already in install-smoke.yml |

## Sources

### Primary (HIGH confidence)

- **Empirical filesystem reads** during research:
  - `foundation-frameworks/get-shit-done-main/tests/ingest-docs.test.cjs` (307 LOC) — the file to port for TEST-01; structure verified directly.
  - `foundation-frameworks/get-shit-done-main/tests/ai-evals.test.cjs` (head 100 LOC inspected) — confirmed not portable for TEST-02 (GSD-config-specific).
  - `oto/workflows/eval-review.md` (155 LOC) and `oto/workflows/ingest-docs.md` (332 LOC) — verified workflow shapes for TEST-01 / TEST-02 assertions.
  - `oto/commands/oto/eval-review.md` (verified frontmatter), `oto/commands/oto/ingest-docs.md` (verified frontmatter).
  - `oto/agents/oto-eval-auditor.md`, `oto/agents/oto-doc-classifier.md`, `oto/agents/oto-doc-synthesizer.md` — verified present (Phase 1 outputs).
  - `tests/workflow-ingest-docs.test.cjs`, `tests/workflow-eval-review.test.cjs`, `tests/workflow-no-deferral-marker.test.cjs` — Phase 2 outputs; pattern reference for TEST-01 / TEST-02.
  - `tests/phase-04-mr01-install-smoke.test.cjs` (113 LOC) — verified INST-03 in-suite path (`EXPECTED_AGENTS` loop pattern).
  - `tests/phase-08-smoke-codex.integration.test.cjs` (verified per-runtime install pattern, skill-vs-command surface, sandbox TOML assertions).
  - `tests/phase-08-smoke-gemini.integration.test.cjs` (verified Gemini install pattern).
  - `tests/phase-08-runtime-matrix-render.test.cjs` (verified runtime matrix render test infrastructure).
  - `tests/phase-04-codex-sandbox-coverage.test.cjs` and `tests/fixtures/phase-04/retained-agents.json` (verified 26-agent retained set is the source-of-truth fixture).
  - `oto/bin/lib/model-profiles.cjs` lines 29–53 — verified `EXPECTED_AGENTS` is currently 23 entries (stale).
  - `bin/lib/runtime-codex.cjs` lines 90–92 — verified `agentSandboxes` has all 3 new entries with correct sandbox modes.
  - `.github/workflows/install-smoke.yml` (106 LOC) — verified current shape; smoke-tarball + smoke-unpacked jobs; no per-runtime install or agent-file assertions today.
  - `.github/workflows/test.yml` (33 LOC) — verified `npm test` is the CI test command on matrix ubuntu/macos × node 22/24.
  - `scripts/install-smoke.cjs` (98 LOC) — verified current Claude-only smoke; pattern to extend.
  - `decisions/ADR-07-agent-trim.md`, `decisions/ADR-09-adr-format.md`, `decisions/ADR-14-inventory-scope.md` — verified ADR format; ADR-14 is current highest; ADR-15 is next slot; no "reactivation criterion" literal phrase in ADR-07.
  - `.planning/phases/01-agent-ports-installer-wiring/01-CONTEXT.md` + `01-VERIFICATION.md` — Phase 1 D-04 read-only-agent reshape locks.
  - `.planning/phases/02-workflow-rebrand-ports-command-de-deferral/02-RESEARCH.md` + `02-VERIFICATION.md` + `02-01-SUMMARY.md` — Phase 2 patterns (rebrand-then-fixup, SDK fallback, orchestrator persistence).
  - `.planning/STATE.md` — verified Phases 1+2 complete; v0.2.0 baseline 562 tests / 561 pass / 1 skip / 0 fail.
  - `.planning/ROADMAP.md` Phase 3 section (lines 87–101) — verified success criteria.
  - `.planning/REQUIREMENTS.md` — verified TEST-01..03, INST-03, PRTY-01, ADR-01 spec.
  - `CLAUDE.md` — verified tech stack prescriptions.

### Secondary (MEDIUM confidence)

- The upstream `import command adopts shared conflict-engine` describe block is out-of-scope for v0.3.0 — confirmed by reading both the upstream block and `oto/commands/oto/` (no `/oto-import` command present), but not empirically verified the rebrand engine handles a `commands/gsd/import.md` → `oto/commands/oto/import.md` rewrite cleanly. Mitigation: planner drops the block during TEST-01 hand-fixup.

### Tertiary (LOW confidence)

- None — all critical claims verified directly during research.

## Metadata

**Confidence breakdown:**
- TEST-01 port path: HIGH — upstream file inspected line-by-line; rebrand engine pattern verified by Phase 2; one stale assertion identified and remediation documented.
- TEST-02 authoring path: HIGH — target surface (workflow + command + agent files) all read; assertion set sized against upstream `ingest-docs.test.cjs` and Phase 2 `workflow-eval-review.test.cjs` for parity.
- INST-03 path: HIGH — current `install-smoke.yml` and `scripts/install-smoke.cjs` shapes verified; `EXPECTED_AGENTS` staleness verified by direct file read; extension pattern documented.
- PRTY-01 path: HIGH — `phase-08-smoke-{codex,gemini}.integration.test.cjs` patterns verified; Codex skill-vs-command divergence confirmed; sandbox TOML assertion pattern documented.
- ADR-15 path: HIGH — ADR-09 format verified; ADR-14 confirmed as current highest; ADR-07 read in full to confirm no literal "reactivation criterion" phrase; AGNT-DEFER-01 requirement to be cited identified in REQUIREMENTS.md.

**Research date:** 2026-05-18
**Valid until:** Until next upstream sync (`tests/ingest-docs.test.cjs` rebrand output is deterministic against `foundation-frameworks/get-shit-done-main` HEAD; re-run the port if upstream is re-synced via `scripts/sync-upstream/`).

## Recommended Plan Shape

**Recommended: 3 plans across 2 waves.** Two-plan alternative described below.

### Plan 03-01 — TEST-01 port + TEST-02 fresh authoring (Wave 1, parallel to 03-02 and 03-03)

**Objective:** Port the upstream `tests/ingest-docs.test.cjs` to the `oto-` namespace via the rebrand engine, hand-fix the classifier `Write`-assertion staleness and drop the out-of-scope import-block; author `tests/eval-review.test.cjs` from scratch mirroring the Phase 2 `tests/workflow-eval-review.test.cjs` skeleton plus the upstream `ingest-docs.test.cjs` structure adapted for the auditor surface.

**Scope:**
- Verify `decisions/file-inventory.json` row for `tests/ingest-docs.test.cjs` is `verdict: keep, rebrand_required: true` with correct `target_path` (Open Question #1); flip if needed.
- Run `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --owner OTOJulian --out .oto-rebrand-stage`.
- Copy `.oto-rebrand-stage/tests/ingest-docs.test.cjs` → `tests/ingest-docs.test.cjs`.
- Hand-fixup pass: update classifier `Write` assertion to assert absence of `Write` + presence of `Read, Grep, Glob`; drop the `import command adopts shared conflict-engine` describe block (lines 285–307 of port output).
- Author `tests/eval-review.test.cjs` from scratch (file-existence + command frontmatter + workflow content + auditor agent shape, per Pattern 2 above).
- Verify `node --test tests/ingest-docs.test.cjs tests/eval-review.test.cjs` passes.
- Verify `npm test` baseline holds.
- Clean up `.oto-rebrand-stage`.

**Files modified:** `tests/ingest-docs.test.cjs` (new), `tests/eval-review.test.cjs` (new), possibly `decisions/file-inventory.json` (one row flip if needed).

**Requirements addressed:** TEST-01, TEST-02, TEST-03 (regression).

**Dependencies:** none (depends on Phase 1+2 outputs, already present).

**Wave:** 1.

### Plan 03-02 — INST-03 install-smoke extension (Wave 1, parallel to 03-01 and 03-03)

**Objective:** Update `EXPECTED_AGENTS` in `oto/bin/lib/model-profiles.cjs` from 23 to 26 entries; extend `scripts/install-smoke.cjs` to assert each of the three new agent files in each runtime's config dir; wire that into `install-smoke.yml` for both `smoke-tarball` and `smoke-unpacked` jobs; for Codex, additionally assert per-agent `.toml` `sandbox_mode` per D-04.

**Scope:**
- Update `EXPECTED_AGENTS` to 26 entries (insert `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor` alphabetically).
- Run `node --test tests/phase-04-mr01-install-smoke.test.cjs` to verify the 26-agent assertion passes against a fresh Claude install.
- Extend `scripts/install-smoke.cjs` to support `--runtime claude|codex|gemini` (or a multi-runtime loop) and assert agent file presence.
- Extend `.github/workflows/install-smoke.yml`:
  - Add a bash step in `smoke-tarball` job that runs `oto install --<runtime> --config-dir <tmp>` for each of claude/codex/gemini and asserts the three new agent files exist (plus, for codex, the three `.toml` files with correct `sandbox_mode` per D-04).
  - Mirror the same step in `smoke-unpacked` job.
  - Optionally extend the `pull_request: paths:` filter to include `oto/agents/**` (Open Question #5).
- Verify install-smoke runs locally via `node scripts/install-smoke.cjs --ref HEAD` (manual sanity check).

**Files modified:** `oto/bin/lib/model-profiles.cjs` (EXPECTED_AGENTS update), `scripts/install-smoke.cjs` (extended), `.github/workflows/install-smoke.yml` (extended). `tests/phase-04-mr01-install-smoke.test.cjs` is unchanged but picks up the new agents transitively.

**Requirements addressed:** INST-03, TEST-03 (regression).

**Dependencies:** none (depends on Phase 1+2 outputs, already present).

**Wave:** 1.

### Plan 03-03 — PRTY-01 per-runtime parity smoke (Wave 1, parallel to 03-01 and 03-02)

**Objective:** Extend the three existing per-runtime install-smoke tests to assert the two restored commands and three new agent files install correctly per runtime, with Codex additionally asserting per-agent `.toml` `sandbox_mode`.

**Scope:**
- Extend `tests/phase-08-smoke-codex.integration.test.cjs` with a PRTY-01 block: assert `skills/oto-ingest-docs/SKILL.md` + `skills/oto-eval-review/SKILL.md` install; assert three new agent `.md` files; assert three corresponding `.toml` files with `sandbox_mode = "read-only"|"workspace-write"` per D-04. Preserve the existing `probeCodex()` skip-on-CLI-absent guard.
- Extend `tests/phase-08-smoke-gemini.integration.test.cjs` with a PRTY-01 block: assert `commands/oto/ingest-docs.md` + `commands/oto/eval-review.md` install; assert three new agent `.md` files. Preserve the existing `probeGemini()` skip-on-CLI-absent guard.
- Extend `tests/phase-04-mr01-install-smoke.test.cjs` (Claude per-runtime parity surface) with assertions: `commands/oto/ingest-docs.md` and `commands/oto/eval-review.md` install. (The 3 agent files are already covered transitively via `EXPECTED_AGENTS` updated in 03-02.)
- Verify `node --test tests/phase-08-smoke-codex.integration.test.cjs tests/phase-08-smoke-gemini.integration.test.cjs tests/phase-04-mr01-install-smoke.test.cjs` passes.

**Files modified:** `tests/phase-08-smoke-codex.integration.test.cjs`, `tests/phase-08-smoke-gemini.integration.test.cjs`, `tests/phase-04-mr01-install-smoke.test.cjs`.

**Requirements addressed:** PRTY-01, TEST-03 (regression).

**Dependencies:** 03-02 only by ordering (03-02 owns `EXPECTED_AGENTS` update). If 03-02 is committed first, 03-03's `tests/phase-04-mr01-install-smoke.test.cjs` updates are conflict-free. **Recommend running 03-02 before 03-03 within Wave 1**; both can be authored in parallel, but 03-03 should commit after 03-02.

**Wave:** 1 (committed after 03-02 if both touch `tests/phase-04-mr01-install-smoke.test.cjs`).

### Plan 03-04 — ADR-15 + Phase 3 finalization (Wave 2, blocked on Wave 1 completion)

**Objective:** Write `decisions/ADR-15-restore-doc-and-eval-agents.md` strictly per ADR-09 format, naming the three restored agents + their sandbox modes + the seven still-dropped agents (AGNT-DEFER-01 affirmation); optionally backfill ADR-15 cross-references in `decisions/file-inventory.json` and `decisions/agent-audit.md` `reason` fields.

**Scope:**
- Author `decisions/ADR-15-restore-doc-and-eval-agents.md` per Pattern 5 skeleton above. Required content:
  - `Status: Accepted`
  - `Date: 2026-05-18` (or current date)
  - `Implements: v0.3.0 Phase 1 D-01, D-04; Phase 3 ADR-01`
  - `## Context` — name the no-dead-commands-in-`/oto-help` goal and the three commands' agent dependencies.
  - `## Decision` — restore exactly three agents with sandbox modes + tool lists per agent; explicit affirmation that the seven other ADR-07-dropped agents stay dropped per AGNT-DEFER-01.
  - `## Rationale` — paraphrase ADR-07's reactivation criterion from ROADMAP.md milestone framing.
  - `## Consequences` — coverage manifest growth, inventory/audit row flips, sandbox map size, EXPECTED_AGENTS bump.
- Run `node --test tests/phase-01-adr-structure.test.cjs` to verify ADR-15 conforms to ADR-09 format.
- Optionally update `decisions/file-inventory.json` and `decisions/agent-audit.md` `reason` fields to reference ADR-15 (Phase 1 D-07 left this as deferred to Phase 3).
- Run `npm test` to confirm the full suite is green at the new baseline.
- Open `/oto-verify-work` (or equivalent) once tests are green.

**Files modified:** `decisions/ADR-15-restore-doc-and-eval-agents.md` (new); optionally `decisions/file-inventory.json` and `decisions/agent-audit.md` (backfill cross-references).

**Requirements addressed:** ADR-01.

**Dependencies:** Wave 1 (03-01 + 03-02 + 03-03) complete and green. ADR-15 should be written after the install + parity + tests have landed, so the ADR can cite them as already-shipped.

**Wave:** 2.

### Two-plan alternative

If the planner prefers a tighter plan budget:

- **03-01 — Tests + install-smoke + parity (combined)** — Merges 03-01, 03-02, 03-03 into a single plan. Acceptable but bigger blast radius; conflicts with the parallel-execution preference of the project's `oto-planner` agent.
- **03-02 — ADR-15** — Wave 2, same as 03-04 above.

**Three-plan structure is preferred** because it isolates the four work streams (TEST-01/02 vs INST-03 vs PRTY-01) with non-overlapping `files_modified` sets — enabling Wave 1 parallel execution and reducing review surface per plan. ADR-15 in Wave 2 stays minimal and depends only on Wave 1 being green.

## RESEARCH COMPLETE

Phase 3 closes v0.3.0 with three parallel Wave 1 plans (TEST-01+TEST-02 port/author; INST-03 install-smoke + EXPECTED_AGENTS fix; PRTY-01 per-runtime smoke extension) and one Wave 2 plan (ADR-15 + finalization), all extending existing patterns from Phases 1+2 — no new shipped runtime surface, just regression coverage and one ADR.
