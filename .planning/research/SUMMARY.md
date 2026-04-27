# Project Research Summary

**Project:** oto — hybrid AI-CLI framework (GSD + Superpowers under unified `/oto-*` surface)
**Domain:** Personal multi-runtime AI coding-CLI framework, distributed via public GitHub
**Researched:** 2026-04-27
**Confidence:** HIGH (every recommendation grounded in direct inspection of `foundation-frameworks/get-shit-done-main/` v1.38.5 and `foundation-frameworks/superpowers-main/` v5.0.7)

## Executive Summary

oto is best built as a **GSD fork** that absorbs a small, curated set of Superpowers skills as a first-class peer concept. The two upstreams are the same primitives at different abstraction levels — Markdown-with-frontmatter, fan-out subagents, multi-runtime distribution — but GSD is a *state machine with typed agents and a 3000-line installer*, while Superpowers is a *prompt library with a one-hook session-start bootstrap and per-runtime manifests*. They are complementary: GSD owns "structured work" (define → plan → execute → ship), Superpowers owns "ambient discipline" (TDD enforcement, debugging rigor, verification-before-completion). For a solo developer who already values GSD's spec-driven workflow, the right architecture is **GSD spine + 7 ported Superpowers skills as ambient amplifiers** (Option A), not a rewrite into skill-first form (Option B), and not a side-by-side install (Option C).

The recommended stack mirrors GSD: **Node.js >= 22.0.0, plain CommonJS `.cjs` for tooling, no top-level TypeScript, no build step at the top level, `node:test` for tests, GitHub Actions CI, distribution via `npm install -g github:owner/oto-hybrid-framework#vX.Y.Z` (no npm registry publish)**. This is precisely what GSD ships today, which is the only stack that survives the rebrand without rewriting both ecosystems. The hybrid's distinguishing infrastructure beyond pure GSD is two pieces of tooling: a **rule-typed rebrand engine** (`gsd→oto` is too dangerous as a global regex) and an **upstream-sync pipeline** with three-way merge plus deletion-surfacing (because GSD shipped 14 minor releases in 12 weeks and Superpowers shipped 7 in March 2026 alone).

The dominant project risk is not technical — it's **scope inflation**. The intersection of "production-grade" and "personal use" creates compounding rigor demands that can absorb the entire build budget without ever shipping a usable framework. The roadmap must ship a Claude-Code-only oto with manual sync **early**, then add Codex/Gemini parity and automation incrementally. Five other critical risks anchor the phase ordering: rebrand substring collisions, agent/skill ID corruption, `.planning/` path drift, GitHub-install missing pre-built artifacts (`prepublishOnly` doesn't run on git installs), and skill auto-load colliding with command-driven flow.

## Key Findings

### Recommended Stack

GSD's stack is the prescription verbatim. Both upstreams are Node-based; the GSD installer is 7,755 lines of CJS using `require()`/`__dirname`/`module.exports`; rewriting to ESM or TypeScript would multiply the rebrand surface for zero runtime benefit. The only "build step" is a syntax-validating hooks-copy script that runs in `prepare` (which IS run by `npm install -g github:...`, unlike `prepublishOnly`).

**Core technologies:**
- **Node.js >= 22.0.0** — engines field; CI matrix on 22 + 24 plus one macOS runner
- **CommonJS `.cjs`** for all tooling — matches GSD's 33-file `bin/lib/` layout
- **Plain JS, not TypeScript at the top level** — TS would force a build step in `prepare`. TS confined to optional `sdk/` if/when needed
- **No top-level build step** — ship raw `.cjs` / `.js` / `.md`
- **`node:test`** (built-in, zero-deps). Vitest only inside an optional `sdk/` subpackage. NOT Jest
- **GitHub Actions CI** — `test.yml` (matrix), `install-smoke.yml` (real `npm pack` + tarball install AND unpacked-dir install — the latter catches the mode-644 trap GSD hit in #2453), `release.yml` (tag → GitHub Release; no npm publish)
- **Distribution via `npm install -g github:owner/oto-hybrid-framework[#vX.Y.Z]`** — git tags are the version surface
- **`bin: { "oto": "bin/install.js" }`** — `oto install --claude/--codex/--gemini` writes runtime-specific artifacts to `~/.claude/`, `~/.codex/`, `~/.gemini/`
- **Copy, not symlink, at install time** — npm's volatile install path breaks symlinks; Windows symlinks need elevation

### Expected Features

**Headline numbers:**

| Framework | Commands | Subagents | Skills | Hooks |
|-----------|----------|-----------|--------|-------|
| GSD v1.38.5 | 89 slash commands | 33 typed agents | 0 (workflows are the unit) | 11 specialized hooks |
| Superpowers v5.0.7 | 3 (all deprecated stubs) | 1 (`code-reviewer`, example only) | 14 skills | 1 SessionStart hook |
| **oto target** | **~50–60 `/oto-*`** (after cuts) | **~20 `oto-*`** (audit + trim) | **7 ported skills** + project-local capacity | **~6–8 hooks** (consolidated SessionStart) |

The cut from 89 → ~55 commands drops marketplace/community/branding artifacts, 11 of 14 GSD runtimes, BETA features, GSD-2 migration, and overlapping/heavy commands.

**Must have (table stakes):**
- GSD spine (`/oto-new-project` → discuss → plan → execute → verify → ship) — core value of the framework
- Wave-based parallel execution with atomic commits — key GSD strength
- `.oto/` state directory — single canonical state root
- Multi-runtime install (Claude/Codex/Gemini) — explicit user requirement
- Statusline + context monitor + session-state hooks — daily-use UX
- `/oto-help`, `/oto-update`, `/oto-progress`, `/oto-next`, `/oto-health` — minimum navigational surface
- Three Superpowers skills as first-class: `test-driven-development`, `systematic-debugging`, `verification-before-completion` — the ambient discipline layer that justifies the hybrid
- Two skills as supporting: `dispatching-parallel-agents`, `using-git-worktrees`
- `writing-skills` as meta-methodology — lets oto evolve
- `using-oto` bootstrap skill — replaces `using-superpowers`, retuned to defer to in-progress workflows
- Automated rebrand engine + upstream-sync tool — required for upstream tracking

**Should have (competitive):**
- Spike & sketch with wrap-up — GSD differentiator
- Code review at two granularities (phase-level + task-level) — combines GSD's `gsd-code-reviewer` + Superpowers' inline review
- Two-stage review (spec compliance → code quality) folded into executor
- Workflow guards (`oto-validate-commit.sh`, `oto-prompt-guard.js`, `oto-read-injection-scanner.js`)
- Brownfield support (`/oto-map-codebase` + `/oto-scan`) — already-coded projects
- Roadmap manipulation (`/oto-add-phase`, `/oto-insert-phase`, `/oto-remove-phase`)
- Cross-AI peer review (`/oto-review`)

**Defer (v2+):**
- `oto-sdk` programmatic API — nice-to-have but not required for daily personal use
- AI-integration phase + eval-planner — heavy infrastructure
- Workstreams + workspaces — adds complexity; phases-only viable for solo
- `/oto-graphify`, `/oto-intel`, `/oto-profile-user`, `/oto-thread` — niche

**Definite exclusion:**
- `/gsd-join-discord`, GSD's marketing chrome — personal-use scope
- All non-Claude/Codex/Gemini runtime adapters (OpenCode, Kilo, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline, Copilot)
- Translated READMEs (4 languages)
- `/gsd-ultraplan-phase` (BETA), `/gsd-from-gsd2` (migration)
- Superpowers' contributor-facing CLAUDE.md content + `tests/` harness + `code-reviewer` example agent

### Architecture Approach

**Recommendation: Option A — GSD spine + Superpowers skills as a first-class peer.** Justified against all four user constraints (production-grade, multi-runtime, automated rebrand, personal use). Option B (skill-first rewrite) would force structural decomposition of 86 eval-tuned workflows and break the rebrand pipeline. Option C (side-by-side install) yields no synergy.

The **load-bearing decision**: workflows survive as a primitive distinct from skills. Workflows orchestrate; skills are ambient amplifiers. GSD's typed-agent registry remains the spine.

**Major components:**
1. **oto-installer** (`bin/install.js`, trimmed fork) — 3 runtime targets, hook compilation, agent sandbox config, manifest writing
2. **oto-orchestrator** (main session executing a workflow) — workflow execution, agent dispatch via `Task`, state mutation via oto-tools
3. **oto-agents** (~20 typed subagents after audit) — strict typed names, mandatory-initial-read contract, structured Markdown returns
4. **oto-skills** (7 ported + project-local capacity) — invoked via `Skill` tool; `using-oto` bootstrap loaded at SessionStart
5. **oto-tools** (`oto/bin/oto-tools.cjs`) — atomic state ops; eventual deprecation in favor of oto-sdk if v2 demands
6. **oto-hooks** — consolidated SessionStart bootstrap (replaces both upstreams' to avoid double-injection), plus statusline, context-monitor, prompt-guard, read-injection-scanner, validate-commit
7. **rebrand-pipeline** (`scripts/sync-upstream/`) — pulls upstreams, applies rule-typed rename map, surfaces conflicts in `.oto-sync-conflicts/`
8. **`.oto/` state directory** (per-project) — single canonical state root subsuming both upstreams' notions of state

**Key architectural rules:** One canonical state root (`.oto/`); per-runtime install layouts diverge with rewritten paths from a single source tree; `Skill` tool is universal dispatch *inside agents*, slash commands (`/oto-*`) remain user-typed surface, internal `oto:<skill>` namespace reserved for `Skill()` calls (per GSD #2697 fix); `using-oto` bootstrap *defers* to in-progress workflows ("if `.oto/STATE.md` shows an in-progress phase, do not auto-invoke skills outside the workflow's allowlist").

### Critical Pitfalls

1. **`gsd` substring collisions during automated rebrand** — `gsd` is 3 letters and appears inside ordinary words/URLs/CHANGELOG anchors. **Avoid by:** rule-typed rename engine (identifier rules with `\b` boundaries; path rules; command rules; URL rules with explicit upstream-URL preservation) plus do-not-rename allowlist. Dry-run with classified report. Reject on any unclassified match.

2. **Rebrand corrupts internal IDs the runtime expects** — agent `name:` frontmatter, `Task(subagent_type=...)` references, `superpowers:<skill>` namespace, Codex `CODEX_AGENT_SANDBOX` per-agent map, hardcoded literal strings in hooks. **Avoid by:** treat IDs as schema; `rename-map.json` with explicit before/after per ID; pre/post coverage manifests; round-trip assertion.

3. **GitHub-install missing pre-built artifacts** — `npm install -g github:owner/repo` runs `prepare` but NOT `prepublishOnly`. GSD shipped this exact bug in 1.38.2. **Avoid by:** put all build steps in `prepare`; OR commit built artifacts; OR (cleanest for v1) skip the SDK and fork GSD's pre-existing `gsd-tools.cjs` path. Clean-machine install smoke test in CI.

4. **Two state systems leak / `.planning/` path drift** — `.planning/` hardcoded across 90+ GSD files; Superpowers has parallel `docs/superpowers/specs/`. **Avoid by:** declare `.oto/` as single canonical state root in architecture-decision phase before any rebrand; centralize path resolution in one helper; treat `.planning` as path-shaped rename rule (NOT bare word "planning"); state-leak detection acceptance test.

5. **Skill auto-load conflicts with command-driven flow** — Superpowers tuned for high recall ("if 1% chance a skill applies, MUST read it"); GSD workflows are deterministic state machines. Superpowers v5.0.6 added `<SUBAGENT-STOP>` blocks for this exact problem. **Avoid by:** retune `using-oto` to defer to in-progress workflows (gate on `.oto/STATE.md`); maintain `skill-vs-command-routing.md` decision table; auto-trigger regression test.

6. **Personal-use rigor inflation (cross-cutting)** — "production-grade" + "personal use" pull opposite. Concrete inflation risks: multi-runtime parity tests before Claude rock-solid; upstream-sync three-way-merge UI before manual sync used in anger; snapshot tests for every workflow output. **Avoid by:** ship Claude-Code-only oto early; defer Codex/Gemini parity until Claude daily-use stable; cap upstream-sync v1 to rename application + conflict surfacing; cost-of-defect-per-incident lens at planning time; re-read PROJECT.md cost ceiling at every milestone close.

## Implications for Roadmap

The architecture and pitfalls research independently proposed phase orderings that converge cleanly. The reconciled sequence honors both (architecture's "installer must work before core port"; pitfalls' "architecture-decision must precede rebrand").

### Phase 1: Inventory & Architecture Decisions
**Rationale:** Three load-bearing decisions must be locked before any code: canonical state root name (`.oto/` recommended); skill-vs-command routing policy; which framework's session-start hook wins. Without these, the rebrand engine has no schema.
**Delivers:** Full file inventory (per-file: keep/drop/merge + reason); rename-map specification; architecture-decision log; deprecation list.
**Avoids:** Pitfalls 2, 3, 8, 9, 10, 13.

### Phase 2: Rebrand Engine + Distribution Skeleton
**Rationale:** The rename engine gates everything downstream. Rule-typed (not regex), dry-runnable, with do-not-touch allowlist (LICENSE files, env vars, `foundation-frameworks/`).
**Delivers:** `scripts/rebrand.cjs`; dry-run reporter; coverage manifest generator; `package.json` shape; install-smoke CI scaffolding.
**Uses:** Node 22, CJS, `node:test`, GitHub Actions.
**Avoids:** Pitfalls 1, 6, 12, 16.

### Phase 3: Installer Fork + Runtime Trim
**Rationale:** Fork `bin/install.js`, drop 11 unwanted runtimes (keep Claude/Codex/Gemini), apply rename engine to installer code itself. Validates the rebrand engine against real production code before scaling.
**Delivers:** Trimmed `bin/install.js`; per-runtime adapter modules; install-smoke passes for `--claude`.
**Implements:** oto-installer component.
**Avoids:** Pitfalls 7, 14, 17.

### Phase 4: Core Port (Workflows + Agents + Templates + Hooks)
**Rationale:** Bulk rebrand of `get-shit-done/`, `agents/`, `commands/gsd/`, `hooks/`, references, templates. After this, `/oto-help` works and `/oto-new-project` initializes a `.oto/` directory. Hooks consolidated to single SessionStart entrypoint with version tokens.
**Delivers:** Full rebranded `oto/` source tree; consolidated SessionStart hook; coverage manifest CI check; state-write integration test.
**Implements:** oto-orchestrator, oto-agents, oto-tools, oto-hooks.
**Avoids:** Pitfalls 2, 3, 8, 15.

### Phase 5: Skills Port (Superpowers Subset)
**Rationale:** Add `oto/skills/` with 7 selected skills + retuned `using-oto` bootstrap that defers to in-progress workflows. First phase delivering value beyond rebranded GSD.
**Delivers:** 7 ported skills; workflow-deferring `using-oto`; skill-vs-command-routing decision table.
**Implements:** oto-skills component.
**Avoids:** Pitfall 10.

### Phase 6: Cross-System Integration
**Rationale:** Synergy phase. Update `oto-executor` to invoke `tdd` and `verification-before-completion` skills before/after writing code. Resolve 15 conceptual overlaps from FEATURES inventory.
**Delivers:** Updated agent prompts invoking skills at canonical points; two-stage review folded into executor; resolved overlaps documented in `.oto-sync/decisions.md`.

### Phase 7: Upstream-Sync Pipeline
**Rationale:** v1 scope intentionally capped: rename application + conflict surfacing + deletion surfacing. Three-way merge UX defers to v2 if pain emerges.
**Delivers:** `scripts/sync-upstream/{pull-gsd,pull-spw,rebrand,merge}.cjs`; per-upstream `last-synced-commit.json` + `BREAKING-CHANGES.md`.
**Implements:** rebrand-pipeline component.
**Avoids:** Pitfall 4.

### Phase 8: Tests & CI Hardening
**Rationale:** Four test surfaces: rebrand-engine snapshot tests; install smoke matrix (Node 22 + 24, Linux + macOS, both tarball and unpacked-dir); per-runtime parity test; license-attribution CI check. Cost-of-defect lens; explicitly cuts low-value test ideas.
**Delivers:** Full CI matrix; coverage manifest CI check; license CI check; auto-trigger regression test; SessionStart-output snapshot fixture.
**Avoids:** Pitfalls 5, 6, 7, 11.

### Phase 9: Docs & Release
**Rationale:** README with explicit upstream attribution and tagged install instruction as default; `THIRD-PARTY-LICENSES.md` with both upstream LICENSE files verbatim. First tagged release (`v0.1.0`) gates this phase.
**Delivers:** Public-ready repo; v0.1.0 GitHub Release.

### Phase Ordering Rationale

- **Architecture decisions in Phase 1, not later.** Pitfalls 3, 8, 9, 10 require architectural commitments before any code.
- **Rebrand engine before rebrand application.** Phase 2 builds the engine and Phase 3 validates it on the smallest target (installer alone).
- **GSD spine before skills.** Skills layer onto a working orchestration substrate.
- **Skills installed (Phase 5) before cross-invocation (Phase 6).** Splitting yields ship-able milestones.
- **Sync pipeline after first stable release, not before.** Manual sync acceptable for the first one or two upstream pulls; tooling pays back at frequency.
- **Tests gradually, not upfront.** Tests bind to the surface being built.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1:** Architectural decisions need user input — multiple defensible options exist
- **Phase 7:** Three-way merge with rename rules is non-trivial. Worth focused research on `git merge-tree` and merge-driver patterns
- **Phase 8:** Mode-644 trap reproduction in CI requires careful setup. Short research pass on `npm install -g <unpacked>` lifecycle

**Phases with standard patterns (skip dedicated research):** Phase 2 (rebrand engine), Phase 3 (installer fork), Phase 4 (core port), Phase 5 (skills port), Phase 6 (cross-system integration), Phase 9 (docs/release).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct reproduction of GSD's actual `package.json`, install.js, lib/, scripts/, CI workflows |
| Features | HIGH | File-by-file inventory of 89 GSD commands, 33 agents, 14 skills, all hooks |
| Architecture | HIGH | Three options analyzed against four user constraints. Recommendation aligns with stated user preference |
| Pitfalls | HIGH | All 23 pitfalls grounded in CHANGELOG-documented bugs (with issue numbers) or direct source evidence |

**Overall confidence:** HIGH — but upper-bounded by upstream volatility. Phase 1 inventory should be re-validated against current `main` of both upstreams when Phase 2 starts.

### Gaps to Address

- **Phase 1 architectural decisions need user sign-off:** state root name; exact skill-vs-command routing rules; per-overlap canonical version
- **Open questions for requirements:**
  1. AI-integration phase + eval scaffolding: stay or drop?
  2. Workstreams + workspaces: keep, or trim to "phases only"?
  3. Spike + sketch: keep both, one, or neither?
  4. `oto-sdk` programmatic API: port faithfully, port narrowly, or skip?
  5. Skill auto-triggering vs explicit invocation: high-recall auto-trigger or explicit `/oto-*`?
  6. Overlapping debug/review/verification: one merged surface or both exposed separately?
  7. Windows support: drop, support, or document-as-best-effort?
- **Codex/Gemini behavior under conditions oto exercises:** Codex `spawn_agent` with `model: inherit`; Gemini's lack of subagent support requires inline-equivalent fallbacks. Flag during Phase 3 for empirical testing
- **Upstream sync philosophy vs reality:** v1 must be capped (rename + conflict surfacing); defer richer merging to v2

## Sources

### Primary (HIGH confidence)
- `foundation-frameworks/get-shit-done-main/` (GSD v1.38.5) — package.json, bin/install.js, get-shit-done/workflows/, agents/, commands/, hooks/, scripts/, CHANGELOG.md, LICENSE
- `foundation-frameworks/superpowers-main/` (Superpowers v5.0.7) — package.json, README.md, CLAUDE.md, AGENTS.md, GEMINI.md, skills/, hooks/session-start, .opencode/plugins/, RELEASE-NOTES.md, LICENSE

### Secondary (MEDIUM confidence)
- GSD upstream issue references (#2453, #2441, #2623, #2697, #1107, #1109, #1125, #1161) — bug history grounding pitfall recommendations
- Superpowers v5.0.x release notes — auto-load tuning evolution

---
*Research completed: 2026-04-27*
*Ready for roadmap: yes*
