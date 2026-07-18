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

## Milestone: v0.4.0 - SDK + Dogfood

**Shipped:** 2026-05-26
**Phases:** 3 | **Plans:** 12 | **Requirements:** 8/8

### What Was Built

- `oto-sdk` query CLI: a faithful port of GSD's `sdk/` subpackage under an `oto-sdk` surface (committed prebuilt `dist/`, parent-package bin wiring, installer PATH-resolution), resolving `command not found: oto-sdk`.
- Query registry rebuilt to resolve against `.oto/` paths via a dependency-free planning-root resolver mirroring the CJS contract, with ~40 raw `.planning/` join sites swept.
- Tiered SDK-fallback policy — read-only queries degrade to defaults; structural/stateful operations fail fast with one clear error — enforced by `tests/sdk-fallback-policy.test.cjs`.
- Dogfood migration: this repo's planning root moved `.planning/` → `.oto/` via a pure `git mv` (history preserved), a clean cutover with no dual-location shim, guarded by a `node:test`.

### What Worked

- The two inefficiencies the v0.3.0 retro flagged as most surface-leaky — the manual `oto-sdk` file-ops fallback (SDK-DEFER-01) and the `.planning/` vs `.oto/` split-brain (DOG-01) — were made the explicit v0.4.0 targets and both closed in one milestone.
- Porting GSD's proven `sdk/` with a surface-only rebrand (internal identifiers untouched) kept the port faithful and the diff reviewable; committing prebuilt `dist/` kept the clean install build-free.
- Sequencing SDK before dogfood (the new `.oto/` location had working tooling before the repo moved onto it) avoided a chicken-and-egg migration.
- Backfilling Phase 12's missing VERIFICATION + SECURITY at close (parallel agents) brought all three phases to a uniform gate before the tag — and the security pass independently re-confirmed the CR-01 path-traversal fix.

### What Was Inefficient

- Phase 12 shipped without a VERIFICATION.md or SECURITY.md — the only phase in the project to do so — and the gap was caught only at milestone close. A phase at 100% plan completion still skipped its quality gate; nothing blocked the omission at the time.
- ROADMAP Progress-table drift recurred (Phase 12 left as `1/4 Executing` while actually 4/4 complete) — the same class of drift v0.3.0 flagged. `oto-sdk query milestone.complete` does not reconcile the progress table, so it needs a manual pass.
- The ported `milestone.complete` CLI emitted GSD-era output into the dogfooded repo: it rewrote the STATE.md frontmatter marker to `gsd_state_version` (silently un-migrating DOG-01 until restored) and mis-parsed three "what broke" lines as accomplishments. Both required manual repair.
- LOC accounting is meaningless this milestone — the diff is dominated by the vendored SDK port and the rename, not authored code.

### Patterns Established

- **Backfill-at-close, don't waive:** if a phase shipped without its VERIFICATION/SECURITY, generate them before archiving (parallel verifier + security-auditor agents) rather than recording the omission as accepted debt.
- **Port-with-surface-rebrand for vendored subpackages:** keep upstream internal identifiers, rebrand only the package/bin/user-facing surface, and ship prebuilt `dist/` so a clean install needs no build step.
- **Dogfooding is the leak detector:** the moment the tool writes to its own repo, every place it still emits the old location (`gsd_state_version`, `.planning/quick/…`) surfaces immediately — treat post-close frontmatter/markers as needing a sanity pass.

### Key Lessons

1. "Trust artifacts over progress %" (a v0.1.0 lesson) bites again at the phase level: a phase can be 100% plans-complete and still be missing its verification gate. Audit the gate artifacts per phase, not the checkboxes — ideally before the phase is marked done, not at milestone close.
2. Ported tooling carries upstream identifiers into its output; dogfooding makes that visible because the tool now writes to its own state. The `milestone.complete` marker regression and the `init.cjs:554` `.planning/` leak are the same bug class, deferred to a `/oto-quick`.
3. A retro's "What Was Inefficient" list is a forward backlog: v0.3.0 named the SDK fallback and `.planning/` split-brain as the leakiest debt, and they became the next milestone's scope. Keep mining the retro for the next milestone's targets.

### Cost Observations

- The largest spend was the one-time SDK port; closeout repair (marker, accomplishments, progress table) recurred and remains manual.
- Phase 12 verification + security backfill cost ~12 min of parallel agent time — cheap insurance for a uniform release gate, and it caught the documentation asymmetry the close would otherwise have shipped.

---

## Milestone: v0.5.0 - Exa Search Integration

**Shipped:** 2026-07-18
**Phases:** 3 | **Plans:** 40 | **Requirements:** 23/23

### What Was Built

- Key-storage reconciliation: integration API keys (Exa/Brave/Firecrawl) confined to 0600 `~/.oto` keyfiles or env vars; boolean-only tracked config enforced in both CJS and SDK write paths with self-healing legacy migration, transactional secret set/clear, and a no-plaintext-in-tracked-files guard.
- Consent-gated, idempotent, fingerprint-owned Exa MCP registration across Claude Code, Codex, and Gemini via oto's adapters, with drift-safe uninstall and a shipped launcher pinning `exa-mcp-server@3.2.1` to exactly three tools (ADR-16).
- One runtime-neutral search-tools reference (Exa → Brave → WebSearch fallback, never-retry-on-429) consumed by five agents, with deprecated-name guards checked against transformed Codex/Gemini output.
- Hardening: keyless-fallback regression floor, live tools-restricted-subagent e2e (claude-code#13898 class), runtime-matrix Exa rows, public setup docs, and per-upstream sync-conflict namespacing with provenance-safe deletion acceptance.

### What Worked

- The strict three-phase dependency chain (keys → registration → guidance) held: each phase consumed exactly what the previous one made real (`detectKeySource`, then live tools), so no phase shipped guidance or registration ahead of its substrate.
- Recording the transport decision as an ADR (ADR-16, launcher-stdio) before any adapter code landed prevented the registration phase from relitigating transport per runtime.
- Adapter round-trip tests as hard gates (byte-identical Codex TOML, additive `.claude.json`, Gemini shape) caught corruption classes before they touched real user config; refusal-over-overwrite for user-owned/drifted entries proved the right default everywhere.
- Bounded convergence contracts (Phase 14's 19-plan gap-closure waves, Phase 16's dispositions-authorized WR-03 fix) kept deep review cycles from becoming open-ended — every finding got an explicit disposition instead of a silent drop.

### What Was Inefficient

- Phase 14 grew from 4 planned plans to 19 through five gap-closure waves — the secret-handling surface (two write paths × migration × transactions × locking) was under-scoped at planning time; the review machinery found real defects, but plan-count churn was the cost.
- The full SDK suite could not be brought green without the `.planning` → `.oto` fixture migration (WR-02), forcing a developer-approved amended baseline at close — deferred debt that any future full-suite gate will trip over.
- The milestone closed without a `/oto-audit-milestone` run (developer-accepted); phase-level verification substituted, but this is the third consecutive close without an independent cross-phase audit.
- Ported closeout tooling still leaks GSD-era identifiers: the v0.5.0 requirements archive header cited `.planning/REQUIREMENTS.md` and had to be corrected by hand — the same bug class the v0.4.0 retro flagged (init.cjs `.planning/` leak, `gsd_state_version` marker), still unfixed.

### Patterns Established

- **ADR-before-adapter:** cross-runtime integration decisions (transport, auth, tool surface) get an ADR before per-runtime code lands.
- **Refuse, never overwrite:** runtime config mutation requires fingerprint ownership; user-owned, drifted, or unparseable content is refused and reported, in every adapter.
- **Usable-key detection over file existence:** all availability gates go through `detectKeySource`; empty/dangling keyfiles enable nothing.
- **Verify transformed output, not source:** runtime-parity claims (tool names, namespaces) are checked against actual Codex/Gemini transforms.
- **Bounded convergence contract:** deep review cycles close through explicit per-finding dispositions with a developer-approved terminal gate, not through unbounded re-review.

### Key Lessons

1. Security-surface phases need a planning multiplier: dual write paths, migration, and concurrency each multiply the review surface — Phase 14's 4→19 plan growth was predictable in hindsight and should inform scoping of any future secrets/state-integrity phase.
2. Deferred fixture debt compounds at gates: WR-02 was cheap to defer per-phase but forced an amended baseline at milestone close; schedule root-migration debt before the milestone that needs its suite green.
3. The GSD-era identifier leak class keeps resurfacing at every close (v0.4.0: state marker; v0.5.0: archive header). The `/oto-quick` cleanup batch (init.cjs, defaults path, drift helper, archive header emitter) should be done early next cycle, not re-deferred.
4. Consent UX consolidates well: resolving all install targets before one aggregated prompt (one decision map per install command) avoided the N-prompts-per-runtime trap.

### Cost Observations

- Most plans ran 3–14 min; the outliers were review-driven (Phase 15 P10 at 13h31m wall-clock spanned a paused live checkpoint). The dominant spend was gap-closure convergence in Phase 14, not first-pass implementation.
- Live e2e checkpoints (keyed + keyless legs, real Claude registration round-trip) were the highest-value manual minutes — consistent with every prior retro's "real dogfood over smoke files" finding.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.1.0 | 10 | Moved from architecture/rebrand discovery to a tagged installable release. |
| v0.2.0 | 2 | Tight post-release command additions (`/oto-migrate`, `/oto-log`) with per-runtime parity. |
| v0.3.0 | 3 | Surgical ADR-07 partial reversal — restored three agents and de-deferred two commands without re-inflating the agent footprint. |
| v0.4.0 | 3 | Shipped the `oto-sdk` query CLI and dogfooded the repo onto `.oto/` — closed the two leakiest deferred items the v0.3.0 retro named. |
| v0.5.0 | 3 | First third-party service integration (Exa MCP) shipped end-to-end: secrets hygiene, per-runtime registration adapters, shared agent guidance — governed by ADR-before-adapter and bounded convergence contracts. |

### Cumulative Quality

| Milestone | Tests | Release Gate |
|-----------|-------|--------------|
| v0.1.0 | `npm test` passed: 418 pass, 1 expected skip, 0 fail | GitHub Release plus clean install UAT |
| v0.2.0 | `npm test` passed: 533 pass, 1 expected skip, 0 fail | Milestone audit `passed`, threats_open 0 across phases |
| v0.3.0 | `npm test` passed: 612 pass, 1 expected skip, 0 fail | Per-phase VERIFICATION + SECURITY + REVIEW clean; per-runtime parity smoke green |
| v0.4.0 | `npm test` passed: 627 pass, 1 expected skip, 0 fail | Per-phase VERIFICATION + SECURITY + REVIEW clean (Phase 12 backfilled at close); clean-install `oto-sdk` smoke + cross-binary parity green |
| v0.5.0 | `npm test` passed: 964 pass, 0 fail, 3 skipped (final Phase 16 gate) | Per-phase bounded verification cycles; SDK amended-baseline gate NO NEW FAILURES; live keyed + keyless e2e passed; no separate milestone audit (developer-accepted); WR-02 fixture debt deferred |

### Top Lessons

1. Real dogfood is a required release gate for this project — and dogfooding the framework's own state location is itself the best leak detector for ported tooling.
2. Archive and state files need a final sanity pass after helper-driven closeout; the closeout CLI still emits GSD-era markers and mis-parses accomplishments.
3. ADR reversal is cheap when the original ADR named the reactivation criterion — keep that pattern.
4. Engine blind-spot regression-guard tests (ABSENCE assertions) outlast individual fixups.
5. Per-phase verification/security is the gate, not plan completion — backfill it before archiving rather than waiving it, and enforce it before a phase is marked done.
6. Runtime-config mutation earns trust through refusal: fingerprint ownership, additive merges, and refuse-on-drift made three different config formats safely writable — reuse this adapter discipline for any future integration.
7. Scope security-surface phases with a multiplier (write paths × migration × concurrency): Phase 14's 4→19 plan growth is the calibration point.
