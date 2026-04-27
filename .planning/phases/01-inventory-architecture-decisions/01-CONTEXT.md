# Phase 1: Inventory & Architecture Decisions - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock every architectural decision and produce the rebrand-map specification before any code is touched. Pure documentation/decision phase — no implementation.

Deliverables (from ROADMAP.md success criteria):
- `decisions/` directory: one ADR per architectural choice (state-root, env-var prefix, skill-vs-command routing, SessionStart consolidation, agent-collision resolution, internal skill namespace, decision-format, rename-map schema, SDK-deferred)
- `decisions/agent-audit.md` — all 33 GSD agents with keep/drop/merge verdict + rationale
- `decisions/file-inventory.json` (machine-readable, single source of truth) + `decisions/file-inventory.md` (generated index)
- `rename-map.json` at repo root with rule-typed before/after entries
- `LICENSE` (oto's added work, MIT) and `THIRD-PARTY-LICENSES.md` (verbatim GSD + Superpowers MIT)

Out of scope: rebrand engine implementation (Phase 2), installer changes (Phase 3), workflow ports (Phase 4+).

</domain>

<decisions>
## Implementation Decisions

User delegated all gray-area choices to Claude ("you decide on all of these gray areas"). Decisions below are grounded in research/PROJECT.md/PITFALLS.md. Planner should treat them as locked unless explicitly revisited.

### State Directory & Path Renaming (ARCH-01, Pitfall 3, Pitfall 9)
- **D-01:** Canonical state root is `.oto/` (replaces GSD's `.planning/`). Single root subsumes both upstreams' state notions; Superpowers' parallel `docs/superpowers/specs/` is dropped.
- **D-02:** `.planning/` → `.oto/` is a `path` rule, not a bare-word rule. Match only path-shaped occurrences (`\.planning/`, `^\.planning$`, quoted variants). Bare word "planning" is left untouched.

### Identifier & Env-Var Renaming Policy (Pitfall 1: "choose once and stick")
- **D-03:** Full rebrand depth — `GSD_*` env vars rename to `OTO_*` in lockstep with `/gsd-*` → `/oto-*` and identifier renames. Rationale: PROJECT.md key decision is "full rebrand depth"; partial preservation would leak upstream identity through env vars (`--help`, error messages, hook injections), undermining the unified `/oto-*` surface. The rebrand engine handles env-var renaming as one `identifier` rule with `\b` boundaries — same machinery, no extra cost.
- **D-04:** Specific env-var renames: `GSD_VERSION` → `OTO_VERSION`, `GSD_PORTABLE_HOOKS` → `OTO_PORTABLE_HOOKS`, `GSD_RUNTIME` → `OTO_RUNTIME`, `GSD_AGENTS_DIR` → `OTO_AGENTS_DIR`, `GSD_TOOLS_PATH` → `OTO_TOOLS_PATH`, plus any others surfaced by inventory grep. Hook version token `{{GSD_VERSION}}` → `{{OTO_VERSION}}` (Pitfall 20). Runtime-detection env vars owned by Claude/Codex/Gemini themselves (e.g., `CLAUDE_PLUGIN_ROOT`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`) are upstream-environment names, NOT renamed — they go on the do-not-rename allowlist.

### Skill-vs-Command Routing (ARCH-02)
- **D-05:** `/oto-<cmd>` is the user-typed slash command surface (workflows). `oto:<skill-name>` is reserved for `Skill()` calls inside agents/orchestrator. No mixing — confirms GSD #2697 fix.
- **D-06:** When workflows and skills overlap conceptually, the workflow wins for in-progress work. `using-oto` bootstrap defers to `.oto/STATE.md`: if a phase is active, do not auto-invoke skills outside the workflow's allowlist. Outside an active workflow, skills auto-fire normally. Concrete overlap table in `decisions/skill-vs-command.md`: TDD-skill ↔ executor-agent, debugging-skill ↔ /oto-debug, verification-skill ↔ verifier-agent, dispatching-parallel-agents-skill ↔ executor wave logic, using-git-worktrees-skill ↔ /oto-new-workspace.

### Internal Skill Namespace (ARCH-05)
- **D-07:** Internal namespace is `oto:<skill-name>` (colon separator). Drives `Skill()` invocations from agents and the SessionStart bootstrap. Mirrors Superpowers' `superpowers:<skill>` shape, just rebranded.

### SessionStart Hook Consolidation (ARCH-03, Pitfall 8)
- **D-08:** Single SessionStart entrypoint: oto consolidates GSD's `gsd-session-state` and Superpowers' `session-start` into one hook (`oto-session-start`) that emits exactly one identity block per session. Two-hook approach would cause duplicate identity primers; Claude Code does not deduplicate `additional_context` + `hookSpecificOutput.additionalContext`.
- **D-09:** SessionStart-output snapshot fixture is the regression baseline (locked in Phase 5/10 per ROADMAP, but the *contract* — exactly one identity block, no upstream-identity leakage — is decided here in Phase 1).

### Agent Collision Resolution (ARCH-04, AGT-02, Pitfall 21)
- **D-10:** Drop Superpowers' `code-reviewer` example agent. Keep `gsd-code-reviewer` (rebranded to `oto-code-reviewer`). Rationale: GSD's version is integrated with the phase machine; Superpowers' is labeled "example only" in upstream.
- **D-11:** Any other collisions surfaced during inventory get one canonical version, the other dropped. Decision logged in `decisions/agent-audit.md`.

### Agent Trim Depth (AGT-01)
- **D-12:** Moderate trim — target ~23 retained agents from GSD's 33. Drop policy:
  - **Drop AI/eval-specific** (deferred per research SUMMARY.md): `gsd-ai-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-framework-selector`
  - **Drop redundant doc agents**: `gsd-doc-classifier`, `gsd-doc-synthesizer` (consolidate into `oto-doc-writer` + `oto-doc-verifier`)
  - **Drop niche/v2 agents**: `gsd-pattern-mapper`, `gsd-intel-updater` (`/oto-intel` is v2 NICH-V2-02), `gsd-user-profiler` (NICH-V2-03), `gsd-debug-session-manager` (consolidate into `oto-debugger`)
  - **Keep phase spine** (16): `oto-planner`, `oto-executor`, `oto-verifier`, `oto-debugger`, `oto-project-researcher`, `oto-phase-researcher`, `oto-roadmapper`, `oto-research-synthesizer`, `oto-plan-checker`, `oto-code-reviewer`, `oto-code-fixer`, `oto-codebase-mapper`, `oto-doc-writer`, `oto-doc-verifier`, `oto-integration-checker`, `oto-nyquist-auditor`
  - **Keep audits** (2): `oto-security-auditor`, `oto-assumptions-analyzer`
  - **Keep researchers** (2): `oto-advisor-researcher`, `oto-domain-researcher`
  - **Keep UI subset** (3, since UI hint = yes for Phase 3+): `oto-ui-researcher`, `oto-ui-checker`, `oto-ui-auditor`
  - Final keep count: 23 agents. Concrete verdict + rationale per agent recorded in `decisions/agent-audit.md`.

### File Inventory Format (ARCH-06)
- **D-13:** Dual format — `decisions/file-inventory.json` is the single source of truth (machine-readable, consumed by Phase 2 rebrand engine and Phase 9 sync pipeline) + `decisions/file-inventory.md` is a generated human index. Schema per entry: `{path, upstream: "gsd"|"superpowers", verdict: "keep"|"drop"|"merge", reason, target_path?, deprecation_status?}`. Markdown view is grouped by directory tree.

### Decision File Format (DOC-05)
- **D-14:** Lightweight ADR format per file in `decisions/`:
  ```
  # ADR-NN: <Title>
  Status: Accepted | Deferred | Superseded by ADR-MM
  Date: YYYY-MM-DD
  Context: <why this decision is needed, what's at stake>
  Decision: <the chosen option, stated as a fact>
  Rationale: <why this option over alternatives>
  Consequences: <what this commits us to, what costs we accept>
  ```
  Numbered sequentially (`ADR-01-state-root.md`, `ADR-02-env-var-prefix.md`, ...). Deferred ideas (e.g., SDK v2) get their own ADR with Status: Deferred.

### Rename Map Schema (REB-02)
- **D-15:** `rename-map.json` at repo root, rule-typed (Pitfall 1):
  ```
  {
    "version": "1",
    "rules": {
      "identifier": [{ "from": "...", "to": "...", "boundary": "word", "case_variants": ["upper","lower","title"] }],
      "path":       [{ "from": "...", "to": "...", "match": "segment"|"prefix" }],
      "command":    [{ "from": "/gsd-...", "to": "/oto-..." }],
      "skill_ns":   [{ "from": "superpowers:", "to": "oto:" }],
      "package":    [{ "from": "...", "to": "...", "fields": ["name","bin"] }],
      "url":        [{ "from": "...", "to": "...", "preserve_in_attribution": true }],
      "env_var":    [{ "from": "GSD_*", "to": "OTO_*" }]
    },
    "do_not_rename": [
      "LICENSE", "LICENSE.md", "THIRD-PARTY-LICENSES.md",
      "foundation-frameworks/**",
      "Lex Christopherson", "Jesse Vincent",
      "github.com/gsd-build/get-shit-done", "github.com/obra/superpowers",
      "CLAUDE_PLUGIN_ROOT", "CLAUDE_CONFIG_DIR", "CODEX_HOME", "GEMINI_CONFIG_DIR"
    ],
    "deprecated_drop": ["/* explicit list from inventory */"]
  }
  ```
  Schema documented in its own ADR. Phase 2 builds the engine + a JSON-Schema validator for this file.

### GitHub Distribution & Bin Names
- **D-16:** GitHub owner is `julianisaac` (inferred from user email `me@julianisaac.com`). Repo name `oto-hybrid-framework` (locked in PROJECT.md). Install instruction: `npm install -g github:julianisaac/oto-hybrid-framework#vX.Y.Z`. Treat as provisional — if user's actual GitHub username differs, update URL rebrand rules before Phase 2 closes.
- **D-17:** Bin command for v1: `oto` only. No `oto-sdk` bin (SDK is deferred — see D-18). Pitfall 16 satisfied: distinct from GSD's `get-shit-done-cc` / `gsd-sdk`, no PATH collision risk.

### SDK Strategy (Pitfall 5, Pitfall 22)
- **D-18:** Drop the `sdk/` subpackage from the v1 fork. Fork GSD's pre-existing CJS path (`get-shit-done/bin/gsd-tools.cjs`) as `oto/bin/lib/oto-tools.cjs`. Rationale: Pitfall 5 explicitly recommends this; eliminates the `prepare`-build-failure surface; matches CLAUDE.md tech-stack guidance ("isolate TS to optional `sdk/` if/when needed"); zero TypeScript at top level for v1.
- **D-19:** SDK is a v2 concern (SDK-01..03 in REQUIREMENTS.md). If/when ported, follow GSD's pattern: isolated subpackage with own `package.json`, `tsconfig.json`, ESM, Vitest. Logged as `decisions/ADR-NN-sdk-deferred.md` with Status: Deferred.

### License & Attribution (FND-06, Pitfall 6)
- **D-20:** `LICENSE` at repo root: MIT for oto's added work, `Copyright (c) 2026 Julian Isaac`.
- **D-21:** `THIRD-PARTY-LICENSES.md` at repo root: contains both upstream MIT licenses verbatim, with `Copyright (c) 2025 Lex Christopherson` (GSD) and `Copyright (c) 2025 Jesse Vincent` (Superpowers) preserved exactly. Both files added to `do_not_rename` allowlist.
- **D-22:** Inline upstream copyright comments in any ported source file: preserve unmodified. Engine treats `Copyright (c) ... <name>` as do-not-touch when the name matches the allowlist.

### Inventory Scope (Pitfall 13, 18, 19)
- **D-23:** File inventory covers every file under `foundation-frameworks/get-shit-done-main/` and `foundation-frameworks/superpowers-main/`. Translated READMEs (`README.{ja-JP,ko-KR,pt-BR,zh-CN}.md`) marked `drop` (personal-use, English only). OpenCode artifacts (`.opencode/`, `.opencode-plugin/`) marked `drop`. Cursor/Windsurf/etc. plugin manifests marked `drop`. Upstream-deprecated surfaces (per CHANGELOG inspection) marked accordingly with `deprecation_status` field populated.

### Claude's Discretion
The user said "you decide on all of these gray areas." Decisions D-03, D-12, D-13, D-14, D-15, D-16, D-17, D-18 reflect Claude's judgment grounded in research, PITFALLS.md, and PROJECT.md. The user retains the right to override any of these during planning if a specific choice surprises them — but the planner agent should treat these as locked unless explicitly revisited.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project intent and scope
- `.planning/PROJECT.md` — Vision, constraints, key decisions, out-of-scope list, personal-use cost ceiling
- `.planning/REQUIREMENTS.md` — All 100 v1 requirements (Phase 1 maps to ARCH-01..06, AGT-01, REB-02, DOC-05, FND-06)
- `.planning/STATE.md` — Current project position, blockers, accumulated decisions
- `CLAUDE.md` — Tech-stack prescription (Node 22+, CJS, no top-level TS, no top-level build, `node:test`)
- `.planning/ROADMAP.md` §"Phase 1: Inventory & Architecture Decisions" — Concrete success criteria

### Research artifacts (HIGH confidence, all dated 2026-04-27)
- `.planning/research/SUMMARY.md` — Executive summary, recommended stack, expected feature counts, build-order implications
- `.planning/research/ARCHITECTURE.md` — Option A justification, component boundaries, data flow, build-order implications
- `.planning/research/PITFALLS.md` — 23 pitfalls with phase-mapping. Phase 1 must address Pitfalls 1, 2, 3, 6, 8, 9, 10, 13, 18, 19, 21, 22, 23 (per §Pitfall-to-Phase Mapping)
- `.planning/research/STACK.md` — Tech-stack rationale (read alongside CLAUDE.md)
- `.planning/research/FEATURES.md` — Feature inventory of both upstreams (input to file-inventory)

### Upstream sources (preserved, do-not-rebrand — read for inventory only)
- `foundation-frameworks/get-shit-done-main/` — GSD v1.38.5 source. Especially:
  - `package.json` — bin names, engines, scripts (esp. `prepublishOnly` vs `prepare` per Pitfall 5)
  - `bin/install.js` — installer source (Phase 3 fork target)
  - `agents/` — 33 agents to audit per AGT-01
  - `get-shit-done/workflows/` — 88 workflow files for inventory
  - `get-shit-done/bin/gsd-tools.cjs` — forked as `oto-tools.cjs` per D-18
  - `LICENSE` — `Copyright (c) 2025 Lex Christopherson` to preserve
  - `CHANGELOG.md` — deprecation history (Pitfall 13 input)
- `foundation-frameworks/superpowers-main/` — Superpowers v5.0.7 source. Especially:
  - `skills/` — 14 skills (7 keep, 7 drop per research)
  - `hooks/session-start` — input to D-08 SessionStart consolidation; literal-string scan per Pitfall 15
  - `agents/code-reviewer.md` — confirmed-drop per D-10
  - `LICENSE` — `Copyright (c) 2025 Jesse Vincent` to preserve
  - `RELEASE-NOTES.md` — deprecation history

### Pitfall coverage map (Phase 1 blocks)
- Pitfall 1 (substring collisions) — D-15 rule-typed schema
- Pitfall 2 (internal IDs) — D-15 + agent-audit.md inventory
- Pitfall 3 (`.planning/` path drift) — D-01, D-02
- Pitfall 6 (license loss) — D-20, D-21, D-22
- Pitfall 8 (hook ordering) — D-08, D-09
- Pitfall 9 (state systems leak) — D-01
- Pitfall 10 (skill auto-load conflict) — D-05, D-06
- Pitfall 13 (deprecated upstream features) — D-23
- Pitfall 18, 19 (translated READMEs, OpenCode) — D-23
- Pitfall 21 (code-reviewer collision) — D-10
- Pitfall 22 (CJS-vs-SDK migration) — D-18
- Pitfall 23 (brainstorm-server vendoring) — N/A (`brainstorming` skill dropped per research)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **GSD's installer (`bin/install.js`, ~3000 LOC)**: forked + trimmed in Phase 3. Phase 1 inventory tags 11 unwanted runtime branches as `drop`.
- **GSD's `get-shit-done/bin/gsd-tools.cjs`**: forked as `oto/bin/lib/oto-tools.cjs` per D-18. Inventory tags as `merge`.
- **GSD's hooks fleet (11 hooks)**: input to Phase 5 audit. Phase 1 inventory tags each as keep/drop/merge.
- **Superpowers' `hooks/session-start`**: merged into consolidated `oto-session-start` per D-08.

### Established Patterns (carry forward)
- **Markdown-with-frontmatter as the unit** for commands/agents/skills. Same conventions across both upstreams.
- **`@file` includes** for shared boilerplate (per GSD's `references/mandatory-initial-read.md`). Reduces context bloat.
- **`# gsd-hook-version: {{GSD_VERSION}}`** token-substitution pattern. Adopted as `# oto-hook-version: {{OTO_VERSION}}` per D-04.
- **`Task(subagent_type=...)` strict typed names**. Carry forward; agent-audit.md is the registry.

### Integration Points (downstream phase consumption)
- Phase 1 produces `rename-map.json` → consumed by Phase 2 rebrand engine (`scripts/rebrand.cjs`)
- Phase 1 produces `file-inventory.json` → consumed by Phase 4 bulk port (drives keep/drop/merge per file)
- Phase 1 produces `decisions/agent-audit.md` → consumed by Phase 4 (which agents to port) and Phase 8 (Codex sandbox map per AGT-04)
- `rename-map.json` schema (D-15) → also consumed by Phase 9 upstream sync pipeline

</code_context>

<specifics>
## Specific Ideas

- Decision file naming: `ADR-NN-<kebab-slug>.md` for ordering and grep-ability.
- The `rename-map.json` schema should be JSON-Schema-validated in Phase 2 (CI check). Phase 1 ships the schema design; Phase 2 builds the validator.
- Inventory verdicts (`keep`/`drop`/`merge`) are mutually exclusive. `merge` means: take from upstream, apply rebrand, but the resulting file is NOT a 1:1 port — semantics changed (e.g., `gsd-tools.cjs` → `oto-tools.cjs` minus deprecated CJS commands GSD itself dropped).
- Per Pitfall 11 ("personal-use rigor inflation"), Phase 1 should NOT specify CI checks, test fixtures, or coverage manifests. Those land in Phase 10. The decision documents themselves are the contract.
- Phase 1 inventory should re-validate against `foundation-frameworks/` versions in repo (GSD v1.38.5, Superpowers v5.0.7) — do not pull fresh upstream during this phase. Re-validation against newer upstream happens at Phase 2 start per research SUMMARY.md confidence note.

</specifics>

<deferred>
## Deferred Ideas

- **`oto-sdk` programmatic API** — v2 (SDK-01..03 in REQUIREMENTS.md). ADR with Status: Deferred captures the choice. Reconsider if/when a programmatic surface becomes load-bearing.
- **Three-way merge in upstream sync** — v2 per research. v1 sync = rename + conflict surfacing only.
- **Codex/Gemini parity hardening** — Phase 8, gated on MR-01 (Claude daily-use stable at end of Phase 4).
- **Windows support** — Out of scope (REQUIREMENTS.md). Inventory tags Windows-only files (e.g., `run-hook.cmd`) as `drop`.
- **GitHub owner verification** — D-16 assumes `julianisaac`. If actual GitHub username differs, update before Phase 2 closes (URL rebrand rules depend on it).

### Reviewed Todos (not folded)
None — todo cross-reference returned 0 matches.

</deferred>

---

*Phase: 01-inventory-architecture-decisions*
*Context gathered: 2026-04-27*
