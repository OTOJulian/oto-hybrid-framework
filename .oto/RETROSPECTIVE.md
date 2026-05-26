# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.1.0 - Release

**Shipped:** 2026-05-04
**Phases:** 10 | **Plans:** 50 | **Requirements:** 100/100

### What Was Built

- A GitHub-installable `oto` package with a Node/CommonJS installer and explicit release path.
- A schema-backed rebrand engine and archive-safe attribution model for GSD plus Superpowers.
- A ported `/oto-*` workflow spine with retained agents, hooks, skills, workstreams, and workspaces.
- Claude Code, Codex, and Gemini runtime outputs generated from shared source where practical.
- CI, docs, command index, upstream sync tooling, release tag, and clean install UAT.

### What Worked

- Locking decisions before implementation reduced rebrand ambiguity.
- The rebrand engine paid for itself once bulk porting began.
- Disposable dogfood projects caught issues that static tests would have missed.
- Generated root instruction files prevented runtime documentation drift.

### What Was Inefficient

- Helper-driven closeout still required manual state repair and human curation.
- Some older validation artifacts used draft metadata even after implementation passed.
- Runtime parity work had to correct earlier "best effort" assumptions about Codex/Gemini.

### Patterns Established

- Treat Claude, Codex, and Gemini as daily-peer runtime targets when a feature claims parity.
- Preserve generated output by default; hand-edit only the explicitly scoped high-visibility files.
- Use archive-before-delete for milestone requirements and roadmap state.
- Keep release gates grounded in real install or disposable-project dogfood, not just smoke file checks.

### Key Lessons

1. Personal-use rigor needs active scope control; production-grade should mean reliable daily flow, not broad community support.
2. `.planning` leak checks must stay path-sensitive: planning docs can live in the repo, but shipped runtime payloads should not expose legacy planning paths.
3. Milestone closeout should trust `audit-open` and milestone audit artifacts over progress percentage alone.
4. Generated helper summaries need curation before they become durable release history.

### Cost Observations

- The highest-value manual spend was dogfood and release verification.
- The highest-cost risk was broad runtime surface area; generator/test pipelines reduced that ongoing cost.

---

## Milestone: v0.3.0 - Restore doc-intake and eval-review agents

**Shipped:** 2026-05-18
**Phases:** 3 | **Plans:** 9 | **Requirements:** 20/20

### What Was Built

- Three restored agents (`oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor`) ported through the rebrand engine and wired into the per-runtime installer.
- Executable workflow bodies for `/oto-ingest-docs` (~332 LOC) and `/oto-eval-review` (~155 LOC) replacing the v0.1.0 deferral stubs.
- Deferral framing stripped from the two command files and `/oto-help`; CMD-01/02/03 absence regression-guarded by a workflow-shape test.
- Per-agent Codex sandbox map (D-04) encoded in installer adapter, `EXPECTED_AGENTS=26`, and Codex `.toml` parity assertions.
- Install-smoke and per-runtime parity tests extended for Claude / Codex / Gemini.
- `decisions/ADR-15-restore-doc-and-eval-agents.md` (D-24) recording the partial ADR-07 reversal and reaffirming AGNT-DEFER-01 for the remaining seven dropped agents.

### What Worked

- The rebrand engine produced near-final agent and workflow bodies; hand-fixups were small and well-scoped (D-04 read-only persistence reshape, SDK fallback pattern, three engine blind-spot patches).
- Phase 3 wave 1 + 1b parallelism (test authoring + install-smoke + per-runtime parity in disjoint files) compressed the closing phase without merge contention.
- Locking the read-only-agent persistence reshape with explicit ABSENCE regression-guard tests caught the engine blind-spot in the first run.
- Treating `audit-open` and per-phase VERIFICATION/SECURITY artifacts as the release gate (not just plan completion) kept the milestone honest.

### What Was Inefficient

- ROADMAP.md drift between "milestone_completion_pending" and "shipped" required manual fixup at archive time — STATE.md and the milestone roadmap should agree without rewriting.
- Some `oto-sdk query` workflow calls still rely on file-ops fallback (SDK-DEFER-01); every workflow has to thread the `2>/dev/null || …` pattern manually.
- The project still runs on `.planning/` despite the framework's own command surface assuming `.oto/` — DOG-01 is now the most surface-leaky deferred item.

### Patterns Established

- "Surgical reversal" of broad cut-list ADRs: name exactly the items restored, enumerate the items that stay deferred, mint a new global decision (D-NN) that anchors the partial reversal in the registry.
- Per-agent sandbox declarations belong in two places that must stay in sync: the installer adapter map and the ADR. Tests assert both, with the ADR as the source of truth for prose.
- Workflow regression-guard tests should assert ABSENCE of recurring engine blind spots (deferral markers, read-only-agent write attempts, missing SDK fallbacks) — not just presence of the desired surface.

### Key Lessons

1. ADRs can be reversed without re-litigating the whole carveout — name the exact items in scope and the exact items still out of scope; the registry handles the rest.
2. The release gate for restoring deferred commands is not "the workflow loads" — it is "running the command end-to-end against a fixture produces the canonical artifact." Workflow-shape + fixture-tree tests together cover that gate.
3. Test count drift (533 → 613 in one milestone) is acceptable when each new test locks a specific D-NN or PRTY-01-style cross-cutting constraint; tests as cheap decision permanence beats narrative documentation.

### Cost Observations

- Three-phase milestone with parallel wave execution kept end-to-end wall time tight.
- The largest manual spend was workflow body fixups for the three engine blind spots; the second-largest was per-runtime parity test extension across Claude / Codex / Gemini.
- ADR-15 authoring was cheap because ADR-07 had already named the reactivation criterion — the ADR registry pays compound interest at restoration time.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.1.0 | 10 | Moved from architecture/rebrand discovery to a tagged installable release. |
| v0.2.0 | 2 | Tight post-release command additions (`/oto-migrate`, `/oto-log`) with per-runtime parity. |
| v0.3.0 | 3 | Surgical ADR-07 partial reversal — restored three agents and de-deferred two commands without re-inflating the agent footprint. |

### Cumulative Quality

| Milestone | Tests | Release Gate |
|-----------|-------|--------------|
| v0.1.0 | `npm test` passed: 418 pass, 1 expected skip, 0 fail | GitHub Release plus clean install UAT |
| v0.2.0 | `npm test` passed: 533 pass, 1 expected skip, 0 fail | Milestone audit `passed`, threats_open 0 across phases |
| v0.3.0 | `npm test` passed: 612 pass, 1 expected skip, 0 fail | Per-phase VERIFICATION + SECURITY + REVIEW clean; per-runtime parity smoke green |

### Top Lessons

1. Real dogfood is a required release gate for this project.
2. Archive and state files need a final sanity pass after helper-driven closeout.
3. ADR reversal is cheap when the original ADR named the reactivation criterion — keep that pattern.
4. Engine blind-spot regression-guard tests (ABSENCE assertions) outlast individual fixups.
