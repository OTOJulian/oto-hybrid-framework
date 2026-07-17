# Phase 16: Agent Guidance + Hardening - Research

**Researched:** 2026-07-17
**Domain:** oto shipped-content engineering (agent/reference markdown), runtime transforms, generated matrix, node:test guards, live-runtime e2e verification
**Confidence:** HIGH (codebase evidence is direct; one live-runtime behavior conflict flagged as OPEN and resolved by HARD-04's own empirical check)

## Summary

Phase 16 is a consolidation-and-verification phase, not a feature phase. The Exa tools became real at runtime in Phase 15 (launcher-stdio, pinned `exa-mcp-server@3.2.1`, exactly 3 tools). What remains: (1) extract ONE runtime-neutral search-guidance reference and point five agents at it — the three researchers currently carry three mutually drifted copies (verified: `oto-phase-researcher` says "init context", `oto-project-researcher` says "orchestrator context", `oto-ui-researcher` uses a different priority ordering entirely), and `oto-debugger`/`oto-advisor-researcher` have no Exa access at all; (2) prove the integration to oto's shipping standard via grep-guards over TRANSFORMED Codex/Gemini output, a fallback regression floor, a live subagent e2e check, an Exa row in the generated runtime matrix, docs, and `oto sync --dry-run` hygiene.

The critical structural fact discovered: `bin/lib/install.cjs` `TRANSFORM_KEY` transforms only `commands/agents/skills/hooks` — **references are copied byte-identical to every runtime root** (enforced by `scripts/check-runtime-sync.cjs`). Therefore the new shared reference MUST be written runtime-neutral from day one ("the Exa search tool (`web_search_exa`), if available") — it cannot rely on install-time rewriting of `mcp__exa__*` Claude-namespace names. Agent BODIES do get path transforms (`~/.claude/` → `~/.codex/`/`~/.gemini/`), so the include pointer `@~/.claude/oto/references/search-tools.md` resolves correctly per runtime. This is the mechanism that kills guidance drift: one file, included by pointer, no per-agent prose.

Two deferred review items are contractually owned by this phase (STATE.md Pending Todos): **WR-04** (settings workflow persists comma-separated `agent_skills` as one quoted string; must parse/validate to a JSON array + two-skill e2e injection test) and **FRESH-CR-03** (effective root-to-workstream secret-status flags + root-layer legacy migration). Plans that omit these will fail verification against STATE.md.

**Primary recommendation:** Create `oto/references/search-tools.md` (new file → zero upstream-sync conflict surface), rewrite the five agents' search sections to a one-line include, then build node:test guards that run the actual `codex-transform.cjs`/`gemini-transform.cjs` functions over the five shipped agents and grep the OUTPUT for deprecated Exa tool names and Claude-only namespacing. Close with a Phase-15-P10-style human-verify checkpoint for the live subagent e2e (HARD-04) and an `oto sync --dry-run` milestone-close check (HARD-05).

## Project Constraints (from CLAUDE.md)

- **OTO Workflow Enforcement:** all edits flow through `/oto-execute-phase` (this phase) — no direct edits outside OTO workflows.
- **Runtime Sync Guardrail (load-bearing for this phase):** any change to `oto/agents/`, `oto/workflows/`, or `oto/references/` must be synced to every installed runtime root (`~/.claude`, `~/.codex`; `~/.gemini` currently has NO oto install — skip with notice, per quick-task precedent "gemini: no install, skipped") and diff-verified **in the same task** via `node scripts/check-runtime-sync.cjs`. Codex agent sync means both `.md` and generated `.toml` (precedent: quick tasks 260714-nzr, 260716-qbp).
- **Tech stack:** Node >= 22.0.0, CJS `.cjs` for tooling, no TypeScript at top level, no bundlers, no new dependencies. Tests via built-in `node:test` (`npm test` → `node --test --test-concurrency=4 tests/*.test.cjs`).
- **SDK exception:** `sdk/` is ESM TypeScript with its own build; any SDK source change (FRESH-CR-03 likely touches `sdk/src`) requires a `sdk/dist` rebuild in the same plan (Phase 14/15 precedent: single rebuild per plan-wave).
- **Sync hygiene (v0.5.0 cross-cutting constraint, STATE.md):** new logic in oto-only files where possible; shared-file diffs small, block-shaped, and commented; `oto sync --dry-run` verified at milestone close (that IS HARD-05).
- **Licensing:** ported/edited GSD-derived files keep attribution intact.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUID-01 | Shared runtime-neutral search-tools reference with Exa → Brave → WebSearch fallback ladder + never-retry-on-429 rule | Reference-install mechanics verified (byte-identical copy, no transform → content must be runtime-neutral); ladder + 429 rule text prescribed by milestone research (.oto/research/PITFALLS.md Pitfall 7/9, SUMMARY.md #78/79); include-by-pointer pattern verified in all 5 agents (`@~/.claude/oto/references/…`) |
| GUID-02 | Three researchers consume the shared reference; drift removed | Exact drifted sections located: `oto-phase-researcher.md:150-189`, `oto-project-researcher.md:126-165`, `oto-ui-researcher.md:113-119` — replace with include + delete divergent prose |
| GUID-03 | `oto-debugger` + `oto-advisor-researcher` gain `mcp__exa__*` frontmatter + shared-reference guidance | Current frontmatter verified: debugger has `WebSearch` only; advisor has `WebSearch, WebFetch, mcp__context7__*`. Frontmatter syntax options analyzed (wildcard vs exact 3-tool enumeration — see Open Question 1) |
| GUID-04 | No deprecated Exa tool names in any shipped agent/reference, verified against transformed output | Deprecated-name list VERIFIED against the actual 3.2.1 bundle in Phase 15 research: `crawling_exa`, `get_code_context_exa`, `deep_researcher_start`, `deep_researcher_check`, `company_research_exa`, `linkedin_search_exa`, `deep_search_exa`, `people_search_exa`. Transform functions to run in tests identified (`convertClaudeAgentToCodexAgent`, `generateCodexAgentToml`, `convertClaudeToGeminiAgent`) |
| GUID-05 | Codex/Gemini transformed agent output verified for correct tool naming | Naming facts verified: Gemini strips `mcp__*` from frontmatter (`gemini-transform.cjs:18`) and now uses `mcp_{server}_{tool}` FQNs at runtime; Codex passes `tools:` verbatim into `<codex_agent_role>` prose and model-visible names are `mcp__{server}__{tool}` (with an in-flux non-prefixed mode). Runtime-neutral body prose sidesteps all of it; test greps transformed output |
| HARD-01 | No key/server → research flows complete with zero user-facing errors via Brave/WebSearch fallback | Coherence gaps located: `init.cjs:355-366` (`cmdInitNewProject`) uses bare env/`existsSync` instead of `detectKeySource` (violates Phase 15 decision); SDK `websearch.ts` Brave rung reads only `BRAVE_API_KEY` env, never the Phase-14 keyfile. Both are concrete fix sites; graceful-degradation contract (`{available:false}`) already exists |
| HARD-03 | Generated runtime matrix gains Exa MCP row per runtime; docs with qualitative rate-limit phrasing | Matrix pipeline verified: `bin/lib/runtime-matrix.cjs` → `scripts/render-runtime-matrix.cjs` → `decisions/runtime-tool-matrix.md`, with a byte-equality regen-diff test (`tests/phase-08-runtime-matrix-render.test.cjs` D-05) that forces regeneration in the same task. Qualitative phrasing justified: exa.ai rate-limits page publishes per-endpoint QPS but NO free-tier quota numbers (verified 2026-07-17) |
| HARD-04 | E2E check proves `mcp__exa__*` reaches a tools-restricted subagent (claude-code#13898 class) | #13898 is CLOSED (was: custom subagents + project-scope `.mcp.json`; user-scope `~/.claude.json` — oto's scope — worked). NEW conflicting evidence found: #53865 (closed not-planned, Apr 2026) says `mcp__<server>__*` wildcards were UNRECOGNIZED in subagent `tools:`, while current official docs (fetched 2026-07-17) say server-level patterns ARE accepted. Installed Claude Code 2.1.212. Empirical checkpoint is the only resolution — Phase 15 P10 human-verify checkpoint is the proven shape |
| HARD-05 | `oto sync --dry-run` conflict-surface check passes at milestone close | Sync pipeline verified (`bin/lib/sync-cli.cjs`, docs/upstream-sync.md): `oto sync --upstream all --to latest --dry-run`. New reference file = zero conflict surface (upstream doesn't have it); researcher/debugger agent edits ARE GSD-shared — keep block-shaped and commented |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Search guidance content (ladder, 429 rule) | Shipped reference (`oto/references/search-tools.md`) | — | References install byte-identical to all runtimes; single source kills drift |
| Guidance consumption | Agent bodies (`oto/agents/*.md`) | Install-time transforms | Agents hold only a one-line include; path rewritten per runtime |
| Exa frontmatter access (debugger/advisor) | Agent frontmatter | Codex `.toml` generation / Gemini frontmatter filter | Claude enforces `tools:`; Codex `.toml` has no tool restriction (sandbox only); Gemini strips `mcp__*` from frontmatter and auto-discovers MCP |
| Deprecated-name + naming verification | `tests/16-*.test.cjs` (node:test) | Transform modules under test | Run real transforms in-process; grep OUTPUT, not source |
| Fallback availability truth | `oto/bin/lib/init.cjs` + `config.cjs` (CJS), `sdk/src/query/init*.ts` (SDK) | `secrets.cjs` `detectKeySource` | Agents trust init-context booleans; booleans must reflect usable keys |
| Runtime matrix Exa row | `bin/lib/runtime-matrix.cjs` | `scripts/render-runtime-matrix.cjs`, regen-diff test | Matrix is generated; hand-editing `decisions/runtime-tool-matrix.md` breaks D-05 byte-equality test |
| Setup docs | `README.md` + `docs/` | — | README has Install/Supported runtimes/Documentation sections; docs/ holds deep guides |
| Live subagent e2e | Human-verify checkpoint in a plan | Installed Claude Code 2.1.212 | Requires real key + live session; Phase 15 P10 precedent |
| Sync hygiene | `oto sync --dry-run` (bin/lib/sync-cli.cjs) | — | Milestone-close verification step |
| agent_skills array fix (WR-04) | `oto/workflows/settings-integrations.md` write path | `init.cjs buildAgentSkillsBlock` consumer + e2e test | Consumer already normalizes string→array (`init.cjs:1617`) but a comma-joined single string is one nonexistent skill path; fix the write path, test end-to-end |
| Secret-status inheritance (FRESH-CR-03) | `oto/bin/lib/secrets.cjs`/`config.cjs` + SDK mirrors | sdk/dist rebuild | Root-to-workstream effective flags + root-layer legacy migration |

## Standard Stack

### Core (no new dependencies — everything already exists)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `node:test` | Node 22.17.1 built-in [VERIFIED: local `node --version`] | All new guards/tests | Project convention; `npm test` = `node --test --test-concurrency=4 tests/*.test.cjs` [VERIFIED: package.json] |
| `bin/lib/codex-transform.cjs` | in-repo | `convertClaudeAgentToCodexAgent`, `generateCodexAgentToml` — run in tests to produce Codex output for GUID-04/05 greps | The actual shipped transform; testing anything else verifies nothing [VERIFIED: codebase] |
| `bin/lib/gemini-transform.cjs` | in-repo | `convertClaudeToGeminiAgent`, `convertGeminiToolName` (returns `null` for `mcp__*` — frontmatter filter) | Same [VERIFIED: gemini-transform.cjs:16-22] |
| `bin/lib/runtime-matrix.cjs` + `scripts/render-runtime-matrix.cjs` | in-repo | HARD-03 Exa row; regenerates `decisions/runtime-tool-matrix.md` | Byte-equality regen-diff test already enforces matrix freshness [VERIFIED: tests/phase-08-runtime-matrix-render.test.cjs] |
| `scripts/check-runtime-sync.cjs` | in-repo | Post-edit drift guard for `oto/workflows` + `oto/references` (byte-identical) across `~/.claude`, `~/.codex` | CLAUDE.md Runtime Sync Guardrail; CI-safe (skips absent roots) [VERIFIED: script header] |
| `bin/lib/sync-cli.cjs` (`oto sync`) | in-repo | HARD-05 dry-run conflict-surface check | Documented pipeline in docs/upstream-sync.md [VERIFIED: codebase] |
| `oto/bin/lib/secrets.cjs` `detectKeySource` | in-repo | Canonical key-usability detection (Phase 15 D-15) | STATE decision: "All key availability gates use detectKeySource rather than bare filesystem existence" [VERIFIED: STATE.md, config.cjs:90-92] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `oto/references/search-tools.md` | Editing guidance in-place per agent | In-place is the drift-generating status quo; roadmap explicitly orders consolidation FIRST |
| node:test greps over transform output | Grep over installed `~/.codex` files | Installed files depend on the local machine's install state; in-process transforms are hermetic and CI-safe |
| Human-verify checkpoint for HARD-04 | Fully automated `claude -p` headless probe | Automation needs a real key + network + live CLI in CI (banned from install path per Phase 15); checkpoint is the Phase 15 P10 proven shape. A scripted probe run BY the human inside the checkpoint is the best hybrid |

**Installation:** none — zero new dependencies.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌──────────────────────────────────────────────┐
                     │  oto/references/search-tools.md  (NEW, oto-  │
                     │  only file; runtime-neutral prose)           │
                     │  • Exa → Brave → WebSearch fallback ladder   │
                     │  • never-retry-on-429 rule                   │
                     │  • availability gate: exa_search boolean     │
                     └───────┬──────────────────────────────────────┘
                             │ included by pointer:
                             │ @~/.claude/oto/references/search-tools.md
      ┌──────────┬───────────┼────────────┬─────────────┐
      ▼          ▼           ▼            ▼             ▼
 phase-      project-     ui-         debugger      advisor-
 researcher  researcher   researcher  (+frontmatter) researcher
      │          │           │            │         (+frontmatter)
      └──────────┴───────────┴────────────┴─────────────┘
                             │ install (bin/lib/install.cjs)
        ┌────────────────────┼─────────────────────────┐
        ▼                    ▼                         ▼
  ~/.claude/agents      ~/.codex (agent .md +      ~/.gemini (no
  (transformAgent:      generated .toml; body      install on this
  body path rewrite)    ~/.claude→~/.codex)        machine — skipped)
        │                    │
        │   references/ copied BYTE-IDENTICAL (no transform)
        ▼                    ▼
  scripts/check-runtime-sync.cjs  (drift guard, same task)

  tests/16-*.test.cjs ──runs──▶ codex-transform / gemini-transform
        │                        on the 5 shipped agents + reference
        └─ greps OUTPUT for deprecated names + Claude-only namespacing

  bin/lib/runtime-matrix.cjs ──▶ scripts/render-runtime-matrix.cjs
        └──▶ decisions/runtime-tool-matrix.md (+ regen-diff test)

  Live session (checkpoint): Task(restricted subagent) ──▶ mcp__exa__* ─▶ exa server
```

### Recommended File Touch Map

```
oto/references/search-tools.md        # NEW — the shared reference (oto-only, zero sync conflict)
oto/agents/oto-phase-researcher.md    # REPLACE lines ~150-189 (Brave/Exa/Firecrawl sections) with include
oto/agents/oto-project-researcher.md  # REPLACE lines ~126-165 with include
oto/agents/oto-ui-researcher.md       # REPLACE lines ~113-119 ordering block with include
oto/agents/oto-debugger.md            # frontmatter + include (GUID-03)
oto/agents/oto-advisor-researcher.md  # frontmatter + include (GUID-03)
bin/lib/runtime-matrix.cjs            # Exa MCP row/section (HARD-03)
decisions/runtime-tool-matrix.md      # REGENERATED (never hand-edited)
oto/bin/lib/init.cjs                  # detectKeySource alignment (HARD-01); agent_skills e2e touch (WR-04)
sdk/src/query/init-complex.ts (+dist) # SDK mirror of the same alignment (HARD-01)
sdk/src/query/websearch.ts (+dist)    # Brave keyfile fallback rung (HARD-01, planner's call)
oto/workflows/settings-integrations.md# WR-04 JSON-array persistence
oto/bin/lib/secrets.cjs / config.cjs  # FRESH-CR-03 (+ SDK mirrors)
README.md + docs/                     # HARD-03 setup docs
tests/16-*.test.cjs                   # guards for GUID-01/02/03/04/05, HARD-01, WR-04
```

### Pattern 1: Shared reference consumed by pointer (GUID-01/02)

**What:** One runtime-neutral reference file; each agent carries exactly one include line where its drifted section used to be.
**When to use:** This is the established oto pattern — all five agents already include `@~/.claude/oto/references/mandatory-initial-read.md` etc. [VERIFIED: grep across agents]
**Critical constraint:** references install byte-identical (`install.cjs` `TRANSFORM_KEY` covers only commands/agents/skills/hooks; `check-runtime-sync.cjs` enforces byte-equality for `oto/references`). The reference body must therefore:
- Name Exa tools by their SERVER tool names (`web_search_exa`, `web_fetch_exa`, `web_search_advanced_exa`) with runtime-neutral framing ("the Exa search tool, if available"), NOT `mcp__exa__*` Claude namespace.
- Express the availability gate as "check `exa_search` from your provided context" (one canonical phrasing — this ends the init-vs-orchestrator wording drift).
- State the ladder: Exa (semantic queries) → Brave (`oto-sdk query websearch`, if `brave_search` true) → built-in WebSearch (always present).
- State the 429 rule verbatim-strength: "On any Exa rate-limit/429 error, switch to Brave/WebSearch for the remainder of the session. Never retry Exa after a rate-limit error." [Source: .oto/research/PITFALLS.md Pitfall 9 — prescribed by milestone research]
- Include the tool-not-found rule: "If an Exa tool call fails with tool-not-found, fall back immediately — never retry" [Source: .oto/research/SUMMARY.md #74].

### Pattern 2: Grep-guard over transform OUTPUT, not source (GUID-04/05)

**What:** A `node:test` file that loads the five shipped agent sources + the reference, runs them through the real transforms, and asserts on the output strings.
**Example skeleton (models tests/phase-08-codex-transform.test.cjs):**

```js
// tests/16-transformed-tool-names.test.cjs
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { convertClaudeAgentToCodexAgent, generateCodexAgentToml } = require('../bin/lib/codex-transform.cjs');
const { convertClaudeToGeminiAgent } = require('../bin/lib/gemini-transform.cjs');

// VERIFIED against the exa-mcp-server@3.2.1 bundle (15-RESEARCH.md):
const DEPRECATED = [
  'crawling_exa', 'get_code_context_exa', 'deep_researcher_start',
  'deep_researcher_check', 'company_research_exa', 'linkedin_search_exa',
  'deep_search_exa', 'people_search_exa',
];
const AGENTS = ['oto-phase-researcher', 'oto-project-researcher',
  'oto-ui-researcher', 'oto-debugger', 'oto-advisor-researcher'];

for (const name of AGENTS) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'oto', 'agents', `${name}.md`), 'utf8');
  for (const [label, out] of [
    ['source', src],
    ['codex-md', convertClaudeAgentToCodexAgent(src)],
    ['codex-toml', generateCodexAgentToml(name, src)],
    ['gemini-md', convertClaudeToGeminiAgent(src)],
  ]) {
    test(`GUID-04 ${name} ${label}: no deprecated Exa tool names`, () => {
      for (const bad of DEPRECATED) assert.ok(!out.includes(bad), `${bad} found in ${label}`);
    });
  }
}
// GUID-05 addition: assert gemini-md frontmatter contains no mcp__ entries
// (convertGeminiToolName filters them) and body prose contains no
// mcp__exa__ tokens outside runtime-conditional framing.
```

**Also cover the reference:** since references ship untransformed, the same test greps `oto/references/search-tools.md` (and optionally all of `oto/references/`) for the deprecated list.

### Pattern 3: Matrix extension with forced regeneration (HARD-03)

**What:** Add the Exa MCP row(s) in `bin/lib/runtime-matrix.cjs` — cleanest as a new section or rows in the capability table, e.g. an "MCP servers" table: `exa | ~/.claude.json (user scope, oto-fingerprinted) | config.toml [mcp_servers.exa] OTO-marker block | settings.json mcpServers.exa (stdio)` — then run `node scripts/render-runtime-matrix.cjs` in the same task.
**Why the same task:** `tests/phase-08-runtime-matrix-render.test.cjs` D-05 asserts the in-memory render byte-equals the committed `decisions/runtime-tool-matrix.md`; editing the generator without regenerating fails `npm test`. This is a free hard gate — use it.

### Pattern 4: Availability-gate coherence (HARD-01)

**What:** Make every surface that tells agents "Exa is available" flow through `detectKeySource`.
**Verified defect sites:**
- `oto/bin/lib/init.cjs:355-366` (`cmdInitNewProject`): `hasExaSearch = !!(process.env.EXA_API_KEY || fs.existsSync(exaKeyFile))` — bare existence; an empty/dangling keyfile yields `exa_search_available: true`, an agent then calls a dead tool. Same pattern for brave/firecrawl. Contrast with the correct `config.cjs:90-92` (`detectKeySource('exa').source !== null`).
- SDK mirror `sdk/src/query/init-complex.ts:187` (`exa_search_available`) — verify and align the same way; SDK has its own `secrets.ts` (Phase 14).
- `sdk/src/query/websearch.ts:26-30`: Brave rung reads only `BRAVE_API_KEY` env and returns `{available:false}` if unset — it never reads `~/.oto/brave_api_key`. A keyfile-only Brave user silently loses the middle rung. Graceful (no user-facing error — the floor holds) but incoherent with Phase 14's keyfile story. Small fix: resolve the key via the SDK secrets helper before falling back to `available:false`.
**The floor itself:** with all booleans false, the shared reference's ladder terminates at built-in WebSearch (Claude) / `google_web_search` (Gemini) — always present. "Zero user-facing errors" = agents never attempt a tool their context says is unavailable + every SDK rung degrades to structured `{available:false}` rather than throwing.

### Anti-Patterns to Avoid

- **Hand-editing `decisions/runtime-tool-matrix.md`:** it's generated; the regen-diff test will fail. Edit the generator, re-render.
- **Putting `mcp__exa__*` prose in the shared reference:** references ship untransformed to Codex/Gemini; Claude-namespace names are wrong in 2 of 3 runtimes. Use server tool names + "if available" framing.
- **Copy-pasting guidance into debugger/advisor:** that's how the drift happened. Include by pointer only.
- **Hard-coding rate-limit numbers in docs:** exa.ai publishes per-endpoint QPS but no free-tier quota on its rate-limits page [VERIFIED: fetched 2026-07-17]; the milestone's "~1,000 req/mo" is MEDIUM-confidence context. Roadmap explicitly requires qualitative phrasing.
- **Grepping only source for deprecated names:** GUID-04 explicitly requires transformed-output verification; the Codex `<codex_agent_role>` header and TOML instructions carry the `tools:` line verbatim.
- **Editing shared GSD files expansively:** researcher agents + `init.cjs`/`config.cjs`/`secrets.cjs`/`settings-integrations.md` are upstream-shared; every line is future sync-conflict surface. Block-shaped, commented diffs (`// oto: …`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Codex/Gemini output generation for tests | A mock transform or regex approximation | `require('../bin/lib/codex-transform.cjs')` / `gemini-transform.cjs` directly | The real functions ARE the shipped pipeline; approximations verify nothing (this is how phase-08 tests already work) |
| Runtime drift detection | New diff script | `scripts/check-runtime-sync.cjs` | Exists, tested (`tests/check-runtime-sync.test.cjs`), CLAUDE.md-mandated |
| Key detection | env/existsSync checks | `detectKeySource` (CJS) / SDK secrets helper | Phase 15 locked decision; handles empty/whitespace/symlink/dangling keyfiles |
| Conflict-surface check | Manual diff vs upstream | `oto sync --upstream all --to latest --dry-run` | Full pull→rebrand→three-way-merge pipeline already built (Phase 9) |
| Matrix rendering | Hand-written markdown table | `renderMatrix()` + `scripts/render-runtime-matrix.cjs` | Byte-equality test guards it |

## Runtime State Inventory

This phase edits shipped content and installed-runtime copies — runtime state matters:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases/keys change; keyfiles untouched | None — verified by phase scope (guidance/tests/docs only; FRESH-CR-03 changes status *reporting*, not stored keys) |
| Live service config | Installed runtime roots `~/.claude` and `~/.codex` hold copies of all 5 agents (+ Codex `.toml`) and the references tree; `~/.gemini` has NO oto install [VERIFIED: ls of all three roots] | Re-sync every touched agent/reference to both roots in the same task; run `node scripts/check-runtime-sync.cjs`; note "gemini: no install, skipped" |
| OS-registered state | None | None — verified (no scheduler/pm2/launchd involvement) |
| Secrets/env vars | `EXA_API_KEY` / `~/.oto/exa_api_key` — read-only for the HARD-04 checkpoint; never written by this phase | None; checkpoint shell needs a key present (15-USER-SETUP.md confirms one was configured for Phase 15's checkpoint) |
| Build artifacts | `sdk/dist/` — stale after any `sdk/src` edit (HARD-01 SDK mirror, FRESH-CR-03, websearch keyfile fix) | Single `sdk/dist` rebuild per plan-wave (Phase 14-19/15-12 precedent); this repo's `.oto/config.json` `exa_search: true` is live state the HARD-01 tests must not corrupt (use tmp fixtures) |

## Common Pitfalls

### Pitfall 1: Writing Claude-namespace tool names into the untransformed reference
**What goes wrong:** `mcp__exa__web_search_exa` in `search-tools.md` ships verbatim to Codex/Gemini; Gemini's actual runtime name is now `mcp_exa_web_search_exa` (FQN format) and Codex's is `mcp__exa__web_search_exa` today but has an in-flux non-prefixed mode. The model errors or hallucinates.
**How to avoid:** Reference uses server tool names + "if available" framing. If a Claude-specific note is unavoidable, mark it explicitly ("in Claude Code these appear as `mcp__exa__…`").
**Warning signs:** GUID-04/05 test greps find `mcp__exa__` in reference or in Gemini-transformed body prose.

### Pitfall 2: Consolidation ordered after extension
**What goes wrong:** Adding guidance to debugger/advisor before the shared reference exists creates a 4th and 5th drifted copy.
**How to avoid:** Roadmap note is explicit: consolidate FIRST (GUID-01→02), then extend (GUID-03). Plan-wave ordering must reflect this.

### Pitfall 3: Subagent frontmatter wildcard ambiguity (`mcp__exa__*`)
**What goes wrong:** Issue #53865 (Apr 2026, closed not-planned, tested on v2.1.119) reported `mcp__<server>__*` and `mcp__<server>` UNRECOGNIZED in subagent `tools:` — MCP tools silently unavailable. Current official docs (fetched 2026-07-17) state both patterns ARE accepted. Installed version is 2.1.212. Sources conflict.
**How to avoid:** Two defenses: (a) the pinned surface is exactly 3 tools, so exact enumeration (`mcp__exa__web_search_exa, mcp__exa__web_fetch_exa, mcp__exa__web_search_advanced_exa`) is cheap and immune to the wildcard question — planner may choose it for the new debugger/advisor frontmatter; (b) HARD-04's checkpoint empirically resolves it on the installed version either way. Also relevant: since Claude Code v2.1.208, a `tools:` list resolving to ZERO tools errors at launch — but a list where only the mcp entries fail resolves silently to the rest, so the checkpoint must have the subagent enumerate its actual tools.
**Warning signs:** `/agents` dialog shows `⚠ Unrecognized`; subagent "completes" research without ever calling an Exa tool while a key is present.

### Pitfall 4: 429 retry loops and Exa-as-default
**What goes wrong:** Free-tier exhaustion mid-research; the model's default is to retry the failing tool, burning turns; parallel researchers (3-4 per research phase) multiply the burn. In-the-wild: key configured but not attached → silent unauthenticated tier → mysterious 429s.
**How to avoid:** The reference's two rules: Exa is the semantic-query tier (not every lookup); one 429 → switch provider for the session, never retry Exa. [Source: .oto/research/PITFALLS.md Pitfall 9]

### Pitfall 5: Runtime-sync omission on agent edits
**What goes wrong:** Five agents edited in-repo but `~/.claude`/`~/.codex` copies stale → live sessions run old guidance; Codex additionally needs regenerated `.toml`.
**How to avoid:** Every plan touching `oto/agents|references|workflows` ends with sync + `node scripts/check-runtime-sync.cjs` in the SAME task (CLAUDE.md rule). Note: installed agent .md files are transformed copies — the script deliberately checks agents' presence, not bytes; references/workflows are byte-checked.

### Pitfall 6: Sync conflict surface from shared-file edits
**What goes wrong:** Researcher agents, `init.cjs`, `settings-integrations.md` are GSD-upstream files; large diffs become permanent same-line conflicts, and `git merge-file` can mis-merge semantically ("clean" but wrong).
**How to avoid:** New logic in new files (`search-tools.md`, `tests/16-*`); shared-file edits as small commented blocks; HARD-05's `oto sync --dry-run` at milestone close measures the surface actually created.

### Pitfall 7: HARD-01 tests polluting live state
**What goes wrong:** This repo's own `.oto/config.json` has `exa_search: true` and the developer's `~/.oto/exa_api_key` exists; tests that read real HOME flip behavior by machine.
**How to avoid:** Follow Phase 14/15 test convention: tmpdir fixtures + `OTO_KEYFILE_DIR`/env overrides (launcher and secrets already support `OTO_KEYFILE_DIR` [VERIFIED: oto-exa-mcp.js:19]).

## Code Examples

### Shared reference include (in each agent, replacing the drifted section)

```markdown
## Search Tools

@~/.claude/oto/references/search-tools.md
```
(Installer rewrites the path per runtime in agent bodies: `~/.codex/…` for Codex [VERIFIED: codex-transform.cjs:42], `~/.gemini/…` for Gemini [VERIFIED: gemini-transform.cjs:26].)

### Debugger/advisor frontmatter (GUID-03 — wildcard form; see Open Question 1 for exact-enumeration alternative)

```yaml
# oto-debugger.md
tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, mcp__exa__*
# oto-advisor-researcher.md
tools: Read, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*, mcp__exa__*
```

### HARD-01 fix site (init.cjs:366, apply to all three integrations)

```js
// oto: HARD-01 — availability must use detectKeySource (Phase 15 D-15), not bare existence
const { detectKeySource } = require('./secrets.cjs');
const hasExaSearch = detectKeySource('exa').source !== null;
```

### HARD-04 checkpoint probe (run by the human inside the live session)

```
Task(subagent_type="oto-debugger" [tools-restricted agent], prompt:
  "1. List every tool name you can currently call.
   2. Call the Exa web search tool once with query 'node lts release'.
   3. Report the tool name you used and whether the call returned results.")
PASS = mcp__exa__ tools present in the enumeration AND one real call returns results.
Also run once with the key removed from the environment to witness the fallback floor (HARD-01 live leg).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gemini CLI: MCP tools exposed by bare name, `serverName__toolName` only on conflict | Unconditional FQN `mcp_{serverName}_{toolName}` (e.g. `mcp_exa_web_search_exa`); server names must avoid underscores (`exa` is safe) | gemini-cli PR #21425/#21664 (docs standardized) | Milestone research's "Gemini exposes bare names" is now stale; reinforces runtime-neutral phrasing — never hard-code per-runtime names in shared prose [VERIFIED: gemini-cli docs + source `mcp-tool.ts`] |
| Codex: assumed "its own naming" (unspecified) | Model-visible qualified names use `__` delimiter → `mcp__exa__web_search_exa`; a `non_prefixed_mcp_tool_names` mode is in active flux (issue #21576, May 2026); `enabled_tools`/`disabled_tools` per-server allow/deny lists exist in `config.toml` | codex-rs `mcp_connection_manager.rs` / `codex-mcp/tools.rs` | Codex naming coincidentally matches Claude's today but is NOT guaranteed; GUID-05's "verify empirically against transformed output" stands [VERIFIED: codex source; MEDIUM on stability] |
| claude-code#13898: custom subagents couldn't reach project-scope `.mcp.json` servers | CLOSED; user-scope (`~/.claude.json` — oto's registration scope) worked even then | — | HARD-04 guards the regression CLASS, not the specific closed bug [VERIFIED: GitHub issue] |
| Subagent `tools:` accepted exact names only (#53865, v2.1.119) | Docs now state `mcp__<server>` / `mcp__<server>__*` accepted in `tools:`/`disallowedTools`; zero-resolving tools lists error at launch since v2.1.208 | Docs current as of 2026-07-17; installed CLI 2.1.212 | CONFLICTING with closed-not-planned issue — empirical resolution via HARD-04 [CITED: code.claude.com/docs/en/sub-agents] |
| Exa deprecated tools active | `crawling_exa`, `get_code_context_exa`, `deep_researcher_*`, `company_research_exa`, `linkedin_search_exa`, `deep_search_exa`, `people_search_exa` marked deprecated (`enabled:false`) in tool metadata; 3.2.1 still npm `latest` (published 2026-04-23, re-verified during Phase 15 on 2026-07-13) | ≤ 3.2.1 | This is the GUID-04 grep list [VERIFIED: 15-RESEARCH.md bundle inspection] |
| Exa rate-limit docs | Publishes per-endpoint QPS (search 10 QPS, contents 100 QPS, answer 10 QPS); NO free-tier monthly quota published | verified 2026-07-17 | Justifies HARD-03's qualitative phrasing requirement [CITED: exa.ai/docs/reference/rate-limits] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Codex model-visible MCP naming (`mcp__exa__*`) remains prefixed by default in codex-cli 0.144.4 (non-prefixed mode not default) | State of the Art | Codex prose mentioning `mcp__exa__…` (only permissible inside runtime-conditional framing) could go stale; runtime-neutral reference makes exposure near-zero. GUID-05's empirical check covers it |
| A2 | `~/.gemini` remains without an oto install through this phase (sync tasks skip it with a notice) | Runtime State Inventory | If the user installs Gemini mid-phase, sync tasks must include it; `check-runtime-sync.cjs` auto-detects, so drift would be caught |
| A3 | SDK `init-complex.ts:187` mirrors the CJS bare-existsSync availability pattern (grep-located, not read line-by-line) | Pattern 4 | If already fixed, the SDK half of the HARD-01 alignment is a no-op — verify at planning/execution time with a 5-line read |

## Open Questions (RESOLVED)

All three questions were resolved during planning; adopting plans noted per question.

1. **Wildcard `mcp__exa__*` vs exact 3-tool enumeration in subagent frontmatter** — RESOLVED: wildcard form adopted in 16-05 Task 1 (consistency with the three researchers); empirical confirmation + exact-enumeration contingency in 16-06 Tasks 2-3
   - What we know: docs (current) say wildcards work; issue #53865 (v2.1.119) said they didn't and was closed not-planned; installed CLI is 2.1.212; three researchers already ship the wildcard form and Phase 15's checkpoint saw Exa tools work in a live session (but that checkpoint exercised registration, not a tools-restricted subagent).
   - What's unclear: wildcard behavior on 2.1.212 specifically, inside a `tools:`-restricted subagent.
   - Recommendation: keep wildcard form for consistency with the three researchers UNLESS the HARD-04 checkpoint fails it — in which case switch all five to exact enumeration (3 names, pinned surface, trivially cheap). Sequence HARD-04 early enough that the outcome can adjust GUID-03 frontmatter within the phase.

2. **HARD-05 timing: "milestone close" vs "phase close"** — RESOLVED: phase close == milestone close; dry-run is 16-06 Task 3's verification step with recorded results and dispositioned new conflicts
   - What we know: HARD-05 says "at milestone close"; Phase 16 is the last v0.5.0 phase, so phase close ≈ milestone close.
   - Recommendation: make `oto sync --upstream all --to latest --dry-run` (requires network + upstream fetch) the final plan's verification step, with results recorded; treat NEW conflicts in files this milestone touched as findings to disposition, not auto-failures (pre-existing conflict baseline may exist).

3. **Where the "docs" for HARD-03 live** — RESOLVED: new `docs/search-integrations.md` + README Documentation-section link, per 16-04 Task 2
   - What we know: README has Install / Supported runtimes / Documentation sections; `docs/` holds deep guides (rebrand-engine.md, upstream-sync.md); 15-USER-SETUP.md is a phase artifact, not user docs.
   - Recommendation: short README subsection (setup: key via `/oto-settings-integrations`, consent-gated registration, qualitative rate-limit caveat, fallback behavior) + link into a `docs/search-integrations.md` if length demands; planner's discretion on split.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests, transforms, matrix render | ✓ | 22.17.1 | — |
| npm | `npm test` | ✓ | 10.9.2 | — |
| Claude Code CLI | HARD-04 live checkpoint | ✓ | 2.1.212 | — (checkpoint is Claude-specific by design) |
| Codex CLI | optional GUID-05 spot-check | ✓ | 0.144.4 | in-process transform tests suffice |
| Gemini CLI | optional spot-check | ✓ (CLI) / ✗ (no `~/.gemini` oto install) | 0.26.0 | transform tests + skip-notice per sync precedent |
| `~/.claude` + `~/.codex` oto installs | runtime sync guardrail | ✓ | — | — |
| Exa API key | HARD-04 checkpoint only | ✓ (was configured for Phase 15 P10 checkpoint; re-confirm at checkpoint time) | — | checkpoint blocks until human provides |
| Network + upstream GitHub | HARD-05 `oto sync --dry-run` | assumed ✓ | — | none — flag if offline |
| `BRAVE_API_KEY` | NOT required (fallback rung degrades gracefully) | ✗ (`brave_search: false` in repo config) | — | built-in WebSearch rung |

**Missing dependencies with no fallback:** none blocking.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22.17.1 built-in) |
| Config file | none — glob convention `tests/*.test.cjs` |
| Quick run command | `node --test tests/16-*.test.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUID-01 | `search-tools.md` exists; contains ladder (Exa→Brave→WebSearch), 429 never-retry rule, no `mcp__` Claude-namespace prose | structural | `node --test tests/16-search-reference.test.cjs` | ❌ Wave 0 |
| GUID-02 | 3 researchers contain the include line; drifted sections (Brave/Exa/Firecrawl blocks) removed | structural | same file | ❌ Wave 0 |
| GUID-03 | debugger + advisor frontmatter contains Exa entries + include line | structural | same file | ❌ Wave 0 |
| GUID-04 | No deprecated name in source AND codex-md AND codex-toml AND gemini-md output of all 5 agents + all references | unit (runs real transforms) | `node --test tests/16-transformed-tool-names.test.cjs` | ❌ Wave 0 |
| GUID-05 | Gemini frontmatter output has zero `mcp__` entries; body prose has no unframed Claude-namespace names; Codex role-header `tools:` matches source | unit | same file | ❌ Wave 0 |
| HARD-01 | `detectKeySource`-aligned availability in CJS `cmdInitNewProject` + SDK mirror (empty/dangling keyfile → false); `websearch` degrades to `{available:false}` | unit (tmpdir fixtures) | `node --test tests/16-availability-coherence.test.cjs` (+ SDK vitest if `sdk/src` touched) | ❌ Wave 0 |
| WR-04 pre-task | `agent_skills` persisted as JSON array; two-skill injection produces two `@…/SKILL.md` lines from `buildAgentSkillsBlock` | unit + contract | `node --test tests/16-agent-skills-array.test.cjs` | ❌ Wave 0 |
| FRESH-CR-03 pre-task | Root-true/root-legacy inheritance visible in workstream secret-status; root plaintext migrated | unit | extend `tests/14-*`-style fixtures in `tests/16-secret-status-inheritance.test.cjs` | ❌ Wave 0 |
| HARD-03 | Matrix has Exa row per runtime; committed file byte-equals render | unit (existing) | `node --test tests/phase-08-runtime-matrix-render.test.cjs` | ✅ (extends automatically via regen-diff) |
| HARD-04 | `mcp__exa__*` reaches a tools-restricted subagent; live call succeeds; keyless run falls back cleanly | manual-only | checkpoint:human-verify — needs live session + real key (live CLIs banned from automated install path per 15-VALIDATION.md) | n/a |
| HARD-05 | `oto sync --dry-run` conflict surface reviewed at close | manual/scripted | `oto sync --upstream all --to latest --dry-run` (network) | n/a |
| Sync guardrail | Repo↔installed-root byte-identity for references/workflows | unit (existing) | `node scripts/check-runtime-sync.cjs` | ✅ |

### Sampling Rate
- **Per task commit:** `node --test tests/16-*.test.cjs` plus `node scripts/check-runtime-sync.cjs` on any agent/reference/workflow-touching task
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green + HARD-04 checkpoint approved + HARD-05 dry-run recorded, before `/oto-verify-work`

### Wave 0 Gaps
- [ ] `tests/16-search-reference.test.cjs` — GUID-01/02/03 structural guards
- [ ] `tests/16-transformed-tool-names.test.cjs` — GUID-04/05 transform-output greps
- [ ] `tests/16-availability-coherence.test.cjs` — HARD-01 fixtures
- [ ] `tests/16-agent-skills-array.test.cjs` — WR-04 e2e
- [ ] `tests/16-secret-status-inheritance.test.cjs` — FRESH-CR-03
- Framework install: none needed

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | key handling unchanged (Phase 14/15 surface) |
| V3 Session Management | no | — |
| V4 Access Control | yes (narrow) | Subagent `tools:` allowlists are the access-control surface HARD-04 verifies; Codex sandbox modes unchanged |
| V5 Input Validation | yes | WR-04: parse/trim each comma-separated skill name, validate against existing `^[a-zA-Z0-9_-]+$` slug rule + `validatePath` containment already in `buildAgentSkillsBlock` (init.cjs:1646-1660) before persisting the JSON array |
| V6 Cryptography | no | — |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Key material leaking into docs/tests/checkpoint transcripts | Information Disclosure | Reuse Phase 14 no-plaintext guard discipline (`tests/14-no-plaintext-guard.test.cjs` scans tracked `.oto` files); checkpoint instructions never echo the key; docs reference keyfile path, never a value |
| Skill-injection via `agent_skills` values (WR-04) | Elevation of Privilege | Slug regex + `validatePath` symlink-escape guard already in consumer; write path must enforce the same before persisting |
| Mis-merge of shared files during future sync silently reverting guards | Tampering | Block-shaped commented diffs + HARD-05 dry-run baseline |

## Sources

### Primary (HIGH confidence)
- Codebase (this session): `bin/lib/install.cjs` (TRANSFORM_KEY — references untransformed), `bin/lib/codex-transform.cjs`, `bin/lib/gemini-transform.cjs:16-22`, `bin/lib/runtime-matrix.cjs`, `scripts/render-runtime-matrix.cjs`, `scripts/check-runtime-sync.cjs`, `bin/lib/sync-cli.cjs`, `oto/bin/lib/init.cjs:355-366,1594-1676`, `oto/bin/lib/config.cjs:90-92`, `sdk/src/query/websearch.ts`, `oto/hooks/oto-exa-mcp.js`, all five agent files, `tests/phase-08-*`, `package.json`
- `.oto/phases/15-exa-mcp-registration-all-three-runtimes/15-RESEARCH.md` — deprecated tool list + 3-tool pin verified against the actual 3.2.1 bundle; 15-USER-SETUP.md (key configured for checkpoint)
- `.oto/research/{SUMMARY,PITFALLS,STACK,FEATURES}.md` — milestone research prescribing the shared reference, ladder, 429 rule, transformed-output verification
- `.oto/STATE.md` Pending Todos — WR-04 + FRESH-CR-03 phase-16 pre-task ownership; `.oto/phases/14-key-storage-reconciliation/14-DISPOSITIONS.md`
- code.claude.com/docs/en/sub-agents + /tools-reference (fetched 2026-07-17) — MCP server-level patterns in `tools:`/`disallowedTools`; v2.1.208 zero-tool launch error; subagents inherit MCP tools by default
- google-gemini.github.io/gemini-cli docs + gemini-cli source `mcp-tool.ts`, PRs #21425/#21664 — `mcp_{server}_{tool}` FQN standard; underscore-in-server-name warning
- openai/codex source `mcp_connection_manager.rs` (`MCP_TOOL_NAME_DELIMITER = "__"`, `mcp__{server}__{tool}`), `codex-mcp/tools.rs`; developers.openai.com/codex/mcp (`enabled_tools`/`disabled_tools`)
- exa.ai/docs/reference/rate-limits (fetched 2026-07-17) — QPS only, no free-tier quota published

### Secondary (MEDIUM confidence)
- github.com/anthropics/claude-code#13898 (closed; scope-dependent subagent MCP access + hallucination failure mode)
- github.com/anthropics/claude-code#53865 (closed not-planned, Apr 2026; wildcard unrecognized on v2.1.119) — CONFLICTS with current docs; resolved empirically by HARD-04
- openai/codex issue #21576 (May 2026) — `non_prefixed_mcp_tool_names` naming-mode flux

### Tertiary (LOW confidence)
- Exa free-tier "~1,000 req/mo" / "~150 calls/day unauthenticated" figures (milestone-research context, unpublished by Exa) — use qualitatively only, per roadmap note

## Metadata

**Confidence breakdown:**
- Shared-reference mechanics + drift sites: HIGH — direct file reads, install pipeline verified
- Transform/test approach (GUID-04/05): HIGH — existing phase-08 tests are the exact model
- HARD-01 defect sites: HIGH (CJS init.cjs read directly; websearch.ts read directly) / MEDIUM (SDK mirror grep-located, A3)
- HARD-03 matrix + docs: HIGH — generator + regen-diff test read in full
- HARD-04 live behavior: MEDIUM — sources conflict by design of the requirement; checkpoint resolves
- Runtime MCP naming (Codex/Gemini): HIGH for current documented state, MEDIUM for stability (Codex mode flux)

**Research date:** 2026-07-17
**Valid until:** ~2026-08-16 for codebase facts; re-verify Claude Code subagent wildcard behavior and Exa rate-limit phrasing at execution time (both are cheap: one docs fetch + the checkpoint itself)
