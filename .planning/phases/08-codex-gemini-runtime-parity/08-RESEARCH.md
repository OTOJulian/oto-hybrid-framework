# Phase 8: Codex & Gemini Runtime Parity - Research

**Researched:** 2026-05-02
**Domain:** Multi-runtime parity (Claude / Codex / Gemini) — install-time agent + command transforms, hook surfaces, per-agent TOML emit, single source-of-truth instruction template, fixture goldens.
**Confidence:** HIGH (transform pipelines, all upstream functions, Gemini hooks, Gemini subagents); MEDIUM (Gemini parallel-tool-call behavior under v0.26.0); LOW (none — every load-bearing claim verified against upstream code or current docs).

## Summary

Phase 8 closes a known set of TODO markers in `runtime-codex.cjs` / `runtime-gemini.cjs` (currently identity transforms + no-op `mergeSettings`) by porting verbatim from upstream `bin/install.js`, with three structural additions:

1. **One single source-of-truth template** at `oto/templates/instruction-file.md` plus a `bin/lib/instruction-file.cjs` renderer that strips wrong-runtime fences and substitutes `{{tokens}}`. The three project-root files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) are generated, committed, and locked by a `node:test` regen-diff.
2. **A new orchestrator lifecycle hook** for Codex's per-agent `<configDir>/agents/<agent>.toml` emit — one file per retained agent, sandbox + model + reasoning_effort embedded. This is the single mechanic that makes `runtime-codex.cjs::agentSandboxes` actually visible to Codex (without it, Phase 4 AGT-04's data is invisible to the runtime).
3. **An auto-generated `decisions/runtime-tool-matrix.md`** rendered from a JS source-of-truth (`bin/lib/runtime-matrix.cjs`) that reads adapter descriptors + the Claude→Gemini tool map + capability registry, with a matrix-vs-code byte-equality test that fails the build if the matrix drifts from the code.

**Three load-bearing findings supersede earlier project assumptions:**
- **Gemini subagents are first-class** as of Gemini CLI v0.38.x (2026-04). The pre-Phase-8 file `oto/skills/using-oto/references/gemini-tools.md` line 17 ("No equivalent — Gemini CLI does not support subagents") is **stale** and Phase 8 must rewrite it. `Task(subagent_type='oto-foo', ...)` rewrites to a tool call where each agent's `name:` becomes a tool of the same name (Gemini's "subagent-as-tool" exposure). [VERIFIED: github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md]
- **Gemini supports parallel subagent invocation** in a single tool-use turn, removing the D-15 sequentialization branch. [VERIFIED: developers.googleblog.com/subagents-have-arrived-in-gemini-cli, infoq.com/news/2026/04/subagents-gemini-cli]
- **Gemini hooks are a near-superset of Claude's** (11 events including `SessionStart`, `SessionEnd`, `BeforeTool`, `AfterTool`, plus `BeforeAgent`/`AfterAgent`/`BeforeModel`/`AfterModel`/`BeforeToolSelection`/`PreCompress`/`Notification`). Event-name renames apply: Claude `PreToolUse` → Gemini `BeforeTool`; Claude `PostToolUse` → Gemini `AfterTool`. **No `statusLine` field in Gemini settings.json** — that hook drops on Gemini (acceptable per D-12: hooks-not-commands degrade observability, don't break execution). [VERIFIED: github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md, geminicli.com/docs/hooks/]

**Primary recommendation:** Port upstream `bin/install.js` lines 955–970, 1991–2059, 2168–2965, 3500–3603, 3942–3976 into four new `bin/lib/*.cjs` modules (`codex-toml.cjs`, `codex-transform.cjs`, `codex-profile.cjs`, `gemini-transform.cjs`); add `instruction-file.cjs` + `runtime-matrix.cjs`; wire one new "post-copy-files" lifecycle hook (`emitDerivedFiles`) into `bin/lib/install.cjs`; add 10 `phase-08-*.test.cjs` files per the Test Surface Summary in CONTEXT.md.

## User Constraints (from CONTEXT.md)

### Locked Decisions

D-01..D-18 from `08-CONTEXT.md` are all locked. Summary of constraints the planner must honor:

- **D-01:** SoT governs three project-root files (`CLAUDE.md`/`AGENTS.md`/`GEMINI.md`); the small marker block in `~/.<runtime>/<FILE>` injected by `renderInstructionBlock(ctx)` stays per-adapter.
- **D-02:** SoT artifact = `oto/templates/instruction-file.md` with HTML-comment runtime-tag fences (`<!-- runtime:codex -->...<!-- /runtime:codex -->`) and `{{token}}` substitution. Renderer at `bin/lib/instruction-file.cjs::render(runtimeName, ctx)`.
- **D-03:** Generated files committed to repo + `tests/phase-08-instruction-file-render.test.cjs` regen-diff check.
- **D-04:** Seed = current project-root `CLAUDE.md` (~100+ lines). Codex/Gemini sections added as runtime-tag fences only where divergence is real.
- **D-05:** `decisions/runtime-tool-matrix.md` auto-generated from `bin/lib/runtime-matrix.cjs` (adapter descriptors + `convertGeminiToolName` table + capability gap registry); rendered by `scripts/render-runtime-matrix.cjs`.
- **D-06:** Matrix dimensions = (1) tool name map, (2) frontmatter dialects, (3) capability gaps, (4) hook event names + sandbox modes.
- **D-07:** Lives in `decisions/` alongside ADRs.
- **D-08:** Per-runtime fixture trio = `oto-executor` (agent), `/oto-progress` (command), `oto:test-driven-development` (skill). Goldens at `tests/fixtures/runtime-parity/{codex,gemini,claude}/`. Plus a matrix-vs-code byte-equality test.
- **D-09:** Per-command runtime support matrix as a section inside `runtime-tool-matrix.md`. **Codex column 100% green for v0.1.0; Gemini column 100% green per D-12.**
- **D-10:** Full Codex parity port: `mergeSettings` for `~/.codex/config.toml`, `generateCodexAgentToml`, `model_overrides` from `~/.oto/defaults.json`, `RUNTIME_PROFILE_MAP` resolution, idempotent strip-and-rewrite. ~600–800 LOC, hand-rolled, zero deps.
- **D-11:** Codex `transformAgent` ports `convertClaudeAgentToCodexAgent` verbatim (upstream line 1991). `transformCommand`/`transformSkill` likely identity (planner confirms).
- **D-12:** **Daily-peer bar applies to Gemini.** No commands that don't work on Gemini. Roadmap "best-effort" framing superseded.
- **D-13:** Gemini transforms port verbatim into `bin/lib/gemini-transform.cjs`: `convertGeminiToolName`, `convertClaudeToGeminiAgent`, `convertClaudeToGeminiToml`.
- **D-14:** Gemini Task() rewrite inline at install-time. **Researcher-confirmed syntax below.**
- **D-15:** Parallel Task() dispatch on Gemini. **Researcher-confirmed: supported.**
- **D-16:** Gemini hooks. **Researcher-confirmed: full support modulo statusLine.**
- **D-17:** Spine smoke = `/oto-help`, `/oto-progress`, `/oto-new-project`, `/oto-discuss-phase`, `/oto-plan-phase`, `/oto-execute-phase`, `/oto-verify-work`, `/oto-pause-work`, `/oto-resume-work`. tmpdir + `t.after()` cleanup.
- **D-18:** `tests/phase-08-smoke-{codex,gemini,claude?}.integration.test.cjs`. Local-runnable; CI promotion is Phase 10.

### Claude's Discretion

- Exact filenames within `tests/phase-08-*` namespace.
- Whether to nest `bin/lib/codex-{toml,transform,profile}.cjs` under `bin/lib/codex/` vs flat.
- Capability-gap registry wording in `bin/lib/runtime-matrix.cjs`.
- Whether per-agent `.toml` carries `# managed by oto v{{OTO_VERSION}}` token-substituted comment.
- Whether to seed `~/.oto/defaults.json` at first install or leave absent.
- Spine smoke handling of interactive `AskUserQuestion`-equivalent input (suggested: pre-canned answer fixtures).

### Deferred Ideas (OUT OF SCOPE)

- Per-runtime stability gate equivalent to MR-01 for Codex/Gemini (Phase 8.x candidate).
- CI promotion of per-runtime smoke (Phase 10).
- Three-way merge UX (Phase 9).
- Cross-runtime workstream/workspace verification (during execute if user surfaces).
- `/oto-set-profile` extension to Gemini (`model_reasoning_effort` is Codex-specific).
- `mcp__*` re-enablement on Gemini (v0.2 enhancement).
- Gemini SessionStart-equivalent identity primer (researcher-confirmed: SessionStart fires on Gemini, no fallback needed).
- Per-agent `.toml` token comment header.
- `~/.oto/defaults.json` interactive setup wizard.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **MR-02** | `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` generated from a single SoT template + per-runtime transformations. | §"SoT Template Architecture" + §"Renderer + Regen-Diff Pattern" — covers template fences, renderer signature, committed-output regen-diff lock. |
| **MR-03** | Per-runtime instruction-file divergences documented + tested. | §"Runtime Divergences" + §"Auto-Generated Matrix" + §"Per-Runtime Fixture Goldens" — covers what diverges, how it's recorded, how it's tested. |
| **MR-04** | Smoke test per runtime: install → run a representative `/oto-*` command → state file written. | §"Spine Smoke Tests" + §"Validation Architecture" — covers tmpdir layout, runtime-binary skip behavior, state-file assertion. |

## Project Constraints (from CLAUDE.md)

- Node >= 22 (engines field), CommonJS top-level, `node:test` runner, **zero deps for tooling**.
- No top-level TypeScript. No bundlers. Ship raw `.cjs`/`.js`/`.md`.
- Hand-roll JSON / TOML — no `@iarna/toml` or similar (per CLAUDE.md "What NOT to Use" + Pitfall 11 "Rigor inflation").
- `bin/lib/*.cjs` factoring — independently `node:test`-able, plain function exports.
- Marker-bracketed merge regions for everything injected into runtime config.
- Generated artifacts committed to repo + regen-diff test (Phase 5 fixture pattern).
- Phase 8 is the LARGEST single-LOC phase (~600–800 LOC for D-10 alone, user-accepted upper bound).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >=22.0.0 | Runtime | Already locked; CI tests on 22+24 |
| `node:test` | builtin | Test runner for all `phase-08-*.test.cjs` | Already in use; zero deps; matches Phase 1–7 convention |
| `node:fs/promises` | builtin | All file I/O | Already in use in `install.cjs`/`copy-files.cjs` |
| `node:path` | builtin | Path manipulation | Already in use |
| `node:os` | builtin | `os.tmpdir()` for spine smoke tests | Phase 4 MR-01 / Phase 7 precedent |
| `node:child_process` | builtin | `spawnSync` to invoke `codex`/`gemini` binaries in spine smoke | Phase 5 hook tests + install-smoke precedent |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | Phase 8 adds **zero new dependencies**. | All transform/parse logic hand-rolled. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled TOML in `codex-toml.cjs` | `@iarna/toml` (3.0.0) | Adds dep + supply-chain surface; upstream `bin/install.js` lines 2168–2965 are themselves hand-rolled because TOML round-trip with comment/whitespace preservation is what the merge requires, and no library does that lossless-ly. **Rejected.** |
| Markdown-it / remark for the SoT template fence parsing | string scan (`indexOf` `<!-- runtime:X -->`) | Fence parsing is one regex per runtime; no need for an AST. **Rejected — overkill.** |
| Vitest snapshots for fixture goldens | Plain `assert.strictEqual(rendered, expected)` reading from `tests/fixtures/runtime-parity/...` | `node:test` already in use; "snapshots" via committed expected files match Phase 5 D-09 / D-15 / Phase 7 D-08 pattern. **Plain assert wins.** |

**Installation:** None — zero new dependencies.

**Version verification (current as of 2026-05-02):**
- Node 22.17.1 confirmed locally (`node --version`).
- Codex CLI 0.128.0 confirmed locally (`codex --version`). [VERIFIED: local probe]
- Gemini CLI 0.26.0 confirmed locally (`gemini --version`). [VERIFIED: local probe]
- Note: Gemini subagents shipped in v0.38.x per public release notes; **the locally-installed v0.26.0 is older than the subagents release**. Spine smoke tests for Gemini agent dispatch should `t.skip()` with a clear message when `gemini --version` is < 0.38.0, rather than fail. [VERIFIED: github.com/google-gemini/gemini-cli/discussions/25562]

## Architecture Patterns

### Recommended Project Structure (Phase 8 additions)

```
bin/lib/
├── codex-toml.cjs              # NEW — D-10: mergeHooksBlock, parseTomlBracketHeader, getTomlLineRecords, stripCodexHooksFeatureAssignments, idempotent strip-and-rewrite
├── codex-transform.cjs         # NEW — D-11: convertClaudeAgentToCodexAgent verbatim port
├── codex-profile.cjs           # NEW — D-10: resolveAgentModel(agentName, profile, overrides) → { model, reasoning_effort }
├── gemini-transform.cjs        # NEW — D-13/D-14: convertGeminiToolName, convertClaudeToGeminiAgent, convertClaudeToGeminiToml, rewriteTaskCalls
├── instruction-file.cjs        # NEW — D-02: render(runtimeName, ctx) — strips wrong-runtime fences, substitutes tokens
├── runtime-matrix.cjs          # NEW — D-05: descriptor reader + capability registry + matrix renderer
├── runtime-claude.cjs          # MODIFIED — no behavior change; tests expand to cover identity baseline
├── runtime-codex.cjs           # MODIFIED — transformAgent calls codex-transform; mergeSettings calls codex-toml; new emitDerivedFiles hook for per-agent .toml
├── runtime-gemini.cjs          # MODIFIED — transformAgent/Command calls gemini-transform; mergeSettings calls a small new gemini-settings.cjs (or inline in runtime-gemini.cjs); experimental.enableAgents = true
├── install.cjs                 # MODIFIED — adds emitDerivedFiles lifecycle hook between copy-files and marker-injection
└── copy-files.cjs              # NO CHANGE — existing copyTree covers everything; per-agent .toml emit is a new helper, not a copyTree extension

scripts/
├── render-instruction-files.cjs    # NEW — D-03: reads template, calls instruction-file.cjs::render thrice, writes CLAUDE.md/AGENTS.md/GEMINI.md
├── render-runtime-matrix.cjs       # NEW — D-05: reads adapters + tool map, calls runtime-matrix.cjs::render, writes decisions/runtime-tool-matrix.md
└── ... (existing)

oto/templates/
└── instruction-file.md          # NEW — D-04: SoT template, seed = current CLAUDE.md verbatim + runtime fences

decisions/
└── runtime-tool-matrix.md       # NEW — D-05/D-07: generated, committed

tests/
├── phase-08-instruction-file-render.test.cjs      # D-03 regen-diff
├── phase-08-runtime-matrix-render.test.cjs        # D-05/D-08 regen-diff + matrix-vs-code consistency
├── phase-08-codex-transform.test.cjs              # D-11 fixture goldens (agent + per-agent .toml)
├── phase-08-codex-toml.test.cjs                   # D-10 hook block merge round-trip + idempotent rewrite + uninstall removal
├── phase-08-codex-profile.test.cjs                # D-10 resolveAgentModel given .oto/config.json + ~/.oto/defaults.json fixtures
├── phase-08-gemini-transform.test.cjs             # D-13/D-14 fixture goldens (agent + command + Task() rewrite)
├── phase-08-gemini-toolmap.test.cjs               # D-13 convertGeminiToolName unit tests
├── phase-08-gemini-settings.test.cjs              # D-16 mergeSettings round-trip (BeforeTool/AfterTool event-name mapping, experimental.enableAgents = true)
├── phase-08-smoke-codex.integration.test.cjs      # D-17/D-18 — t.skip() if codex binary < 0.120 or absent
├── phase-08-smoke-gemini.integration.test.cjs     # D-17/D-18 — t.skip() if gemini binary < 0.38 or absent
└── phase-08-claude-identity.test.cjs              # Sanity: Claude transforms remain identity

tests/fixtures/runtime-parity/
├── claude/
│   ├── oto-executor.expected.md          # identity (sanity)
│   ├── oto-progress.expected.md          # identity
│   └── test-driven-development.expected.md
├── codex/
│   ├── oto-executor.expected.md          # convertClaudeAgentToCodexAgent output
│   ├── oto-executor.expected.toml        # generateCodexAgentToml output
│   ├── oto-progress.expected.md          # likely identity (commands native to Codex)
│   └── test-driven-development.expected.md
└── gemini/
    ├── oto-executor.expected.md          # convertClaudeToGeminiAgent output (YAML array tools, ${VAR}→$VAR escape, no color/skills)
    ├── oto-progress.expected.toml        # convertClaudeToGeminiToml output (description + prompt fields)
    └── test-driven-development.expected.md
```

### Pattern 1: SoT Template with Runtime Fences (D-02)

**What:** Single markdown file with HTML-comment fences delimiting per-runtime sections; renderer strips wrong-runtime fences and substitutes `{{token}}`.

**When to use:** All three runtime files share ~95% content (project description, tech stack, GSD enforcement, conventions); ~5% diverges per runtime (sandbox notes for Codex, `${VAR}`→`$VAR` warning for Gemini, agent-discovery path for Gemini).

**Example template fragment:**
```markdown
<!-- Source: foundation-frameworks/get-shit-done-main/bin/install.js — pattern adapted; oto-owned not synced -->
# Project: oto

oto v{{otoVersion}} — Run `/oto-help` for commands. Repo: {{repoUrl}}

<!-- runtime:claude -->
This is `CLAUDE.md` for Claude Code. Settings live at `~/.claude/settings.json`.
<!-- /runtime:claude -->

<!-- runtime:codex -->
This is `AGENTS.md` for Codex. Settings live at `~/.codex/config.toml`.
Per-agent sandbox modes are declared in `~/.codex/agents/<agent>.toml` and inherited by Codex's agent router.
<!-- /runtime:codex -->

<!-- runtime:gemini -->
This is `GEMINI.md` for Gemini CLI. Settings live at `~/.gemini/settings.json`.
Custom subagents are auto-discovered from `~/.gemini/agents/*.md` (each agent's `name:` becomes a tool exposed to the main agent — see Gemini's "subagents-as-tools" model).
Note: agent bodies use `$VAR` (not `${VAR}`) — Gemini's `templateString()` rejects unresolved `${word}` patterns.
<!-- /runtime:gemini -->

## (shared) Project description, conventions, etc.
...
```

**Renderer signature:**
```javascript
// bin/lib/instruction-file.cjs
function render(runtimeName, ctx) {
  // 1. Read oto/templates/instruction-file.md
  // 2. Strip <!-- runtime:X --> ... <!-- /runtime:X --> blocks where X !== runtimeName
  // 3. Strip the fence markers themselves where X === runtimeName (keep contents)
  // 4. Substitute {{otoVersion}}, {{repoUrl}}, etc. from ctx
  // 5. Return rendered markdown
}
module.exports = { render };
```

### Pattern 2: Per-Agent TOML Emit (D-10)

**What:** After `copyTree` runs and copies all agents into `<configDir>/agents/`, run a derived-file emit pass that walks the 23 retained agents and writes one `<agent>.toml` per agent.

**When to use:** Codex only. Encodes `name`, `description`, `sandbox_mode` (from `agentSandboxes` map), and optional `model` / `model_reasoning_effort` from profile resolution.

**Lifecycle integration:** New adapter hook `emitDerivedFiles(ctx)` on the Codex adapter. `bin/lib/install.cjs` calls it after the copy + transform pass and before the marker-injection step:

```javascript
// install.cjs (added after the SRC_KEYS loop, before instructionPath block)
if (typeof adapter.emitDerivedFiles === 'function') {
  const derivedEntries = await adapter.emitDerivedFiles({ configDir, repoRoot, otoVersion: OTO_VERSION });
  for (const entry of derivedEntries) {
    fileEntries.push(entry); // sha256 hash, path — joins .install.json state
  }
}
```

The hook signature returns the same `{path, sha256}` shape as a `copyTree` entry so the install-state diff and uninstall logic treat derived files identically to copied files.

**Why a new hook (not a `copyTree` extension):** `copyTree` semantics are "mirror source tree"; per-agent `.toml` emit is "for each entry in adapter map, generate a file". They're conceptually different and conflating them in `copyTree` muddies its contract. New helper is cleaner.

### Pattern 3: Idempotent TOML Marker Block (D-10)

**What:** `mergeHooksBlock(existingText, hookEntries) → string` injects oto-managed TOML between `# === BEGIN OTO HOOKS ===` and `# === END OTO HOOKS ===` markers. Re-merge strips the prior marker block first, then injects fresh content. Uninstall strips the block entirely, preserving everything outside.

**Marker convention (matches Phase 5 D-13/D-14 dual-marker contract):**
```toml
# user content above

# === BEGIN OTO HOOKS — managed by oto v0.1.0-alpha.1 ===
[[hooks]]
type = "PreToolUse"
matcher = "Bash"
command = "bash '/Users/.../hooks/oto-validate-commit.sh'"
timeout = 5

[[hooks]]
type = "PostToolUse"
matcher = "Bash|Edit|Write|MultiEdit|Agent|Task"
command = "node '/Users/.../hooks/oto-context-monitor.js'"
timeout = 10
# === END OTO HOOKS ===

# user content below — preserved
```

**Implementation note:** Codex 0.124+ requires `[[hooks]]` array-of-tables (not legacy `[hooks.TYPE]` map format). Upstream lines 2858–2916 contain the migration logic; **oto skips this** — fresh installs only, no legacy migration in v0.1.0 scope (deferred to v0.2 if user reports a real conflict). [VERIFIED: foundation-frameworks/get-shit-done-main/bin/install.js:2858]

### Pattern 4: Runtime-Aware Profile Resolution (D-10)

**Source-of-truth chain:**
1. **Per-project:** `<projectRoot>/.oto/config.json` field `model_overrides[<agent>]` (exact model ID wins, full bypass).
2. **Per-project:** `<projectRoot>/.oto/config.json` field `model_profile` ("opus" | "sonnet" | "haiku" | "balanced" | "inherit") feeds tier resolution.
3. **Global:** `~/.oto/defaults.json` field `model_overrides[<agent>]` (fallback only — per-project wins on conflict; non-conflicting global keys preserved).
4. **Global:** `~/.oto/defaults.json` field `runtime` ("codex" | "gemini") + `model_profile_overrides[<runtime>][<tier>]` for user-customized tier→model mapping.
5. **Built-in:** `RUNTIME_PROFILE_MAP` constant in `bin/lib/codex-profile.cjs` (table of `{runtime: {tier: {model, reasoning_effort?}}}`).

**`~/.oto/defaults.json` schema (mirrors upstream `~/.gsd/defaults.json` verbatim, oto-namespaced per ADR-02):**
```json
{
  "runtime": "codex",
  "model_profile": "balanced",
  "model_overrides": {
    "oto-executor": "gpt-5-pro",
    "oto-debugger": "gpt-5.4"
  },
  "model_profile_overrides": {
    "codex": {
      "opus":   { "model": "gpt-5.4",       "reasoning_effort": "xhigh" },
      "sonnet": { "model": "gpt-5.3-codex", "reasoning_effort": "medium" },
      "haiku":  { "model": "gpt-5.4-mini",  "reasoning_effort": "medium" }
    },
    "gemini": {
      "opus":   { "model": "gemini-3-pro" },
      "sonnet": { "model": "gemini-3-flash" },
      "haiku":  { "model": "gemini-2.5-flash-lite" }
    }
  },
  "resolve_model_ids": "omit"
}
```

[VERIFIED: foundation-frameworks/get-shit-done-main/bin/install.js:625-700, foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/core.cjs:1566-1595]

**Built-in `RUNTIME_PROFILE_MAP` (port verbatim from upstream `core.cjs:1566-1595`):**
```javascript
const RUNTIME_PROFILE_MAP = {
  codex: {
    opus:   { model: 'gpt-5.4',        reasoning_effort: 'xhigh' },
    sonnet: { model: 'gpt-5.3-codex',  reasoning_effort: 'medium' },
    haiku:  { model: 'gpt-5.4-mini',   reasoning_effort: 'medium' },
  },
  gemini: {
    opus:   { model: 'gemini-3-pro' },
    sonnet: { model: 'gemini-3-flash' },
    haiku:  { model: 'gemini-2.5-flash-lite' },
  },
  // claude omitted — Claude resolves models via Task() inline; not used in TOML emit path.
};
```

`RUNTIMES_WITH_REASONING_EFFORT = new Set(['codex'])` controls whether `model_reasoning_effort` is emitted into the per-agent `.toml`. **Gemini does not use `model_reasoning_effort`** — Phase 8 only embeds `model = "..."` for Gemini if explicit per-agent override exists. (Profile-tier resolution for Gemini is deferred per CONTEXT.md "Deferred Ideas".)

**`/oto-set-profile` integration (Phase 4 WF-30):** Already writes `model_profile` to `.oto/config.json`. Phase 8's `codex-profile.cjs::resolveAgentModel(agentName, projectConfig, globalDefaults)` reads it and produces `{model, reasoning_effort}` for `generateCodexAgentToml` to embed.

### Pattern 5: Gemini Task() → Subagent Tool-Call Rewrite (D-14)

**What:** Each Claude `Task(subagent_type='oto-foo', prompt='...')` call in command/agent markdown gets rewritten at install time to Gemini's `@oto-foo` directive (or, in agent-body-as-prose contexts, kept as a tool-call instruction since Gemini exposes each agent as a tool of the same `name:`).

**Gemini's actual delegation model (verified):**
1. **Each custom subagent in `~/.gemini/agents/<name>.md` becomes a tool of the same name** exposed to the main agent. The main agent calls it like any other tool. [CITED: github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md]
2. **`@<name>` syntax** (used at the start of a user prompt) explicitly directs the next turn to that subagent. Per Gemini docs: "When you use the `@` syntax, the CLI injects a system note that nudges the primary model to use that specific subagent tool immediately."
3. **Auto-delegation** based on the agent's `description:` frontmatter — main agent decides when to call.

**Concrete rewrite worked example:**

**Input (Claude command markdown — single Task call):**
```markdown
Now spawn a researcher to investigate the codebase:

\`\`\`
Task(subagent_type='oto-codebase-mapper',
     prompt='Map the dependency graph for src/core/')
\`\`\`
```

**Output (Gemini equivalent — agent invoked as a tool by name):**
```markdown
Now spawn a researcher to investigate the codebase. Invoke the `oto-codebase-mapper` subagent with:

\`\`\`
prompt: Map the dependency graph for src/core/
\`\`\`

(The subagent is exposed as a tool named `oto-codebase-mapper`; Gemini's main agent will call it.)
```

**Or, if the surrounding text is a directive to the user:** simply preserve the agent name as `@oto-codebase-mapper` so the user can prefix the prompt themselves. The choice between these two output forms depends on whether the original markdown is instructing a model (output: tool-call-style instruction) or a human user (output: `@`-prefix instruction). Phase 8's transform should err on **tool-call-style** since most `Task()` calls in oto's commands are model-directives.

**Parallel rewrite (D-15 — verified supported):**

**Input (Claude — parallel dispatch):**
```markdown
Spawn three researchers in parallel:

\`\`\`
Task(subagent_type='oto-domain-researcher', prompt='research auth')
Task(subagent_type='oto-codebase-mapper',  prompt='map auth')
Task(subagent_type='oto-security-auditor', prompt='audit auth')
\`\`\`
```

**Output (Gemini — parallel calls in one tool-use block):**
```markdown
Spawn three researchers in parallel. In a single tool-use block, invoke:

- `oto-domain-researcher` with prompt: research auth
- `oto-codebase-mapper`  with prompt: map auth
- `oto-security-auditor` with prompt: audit auth
```

[VERIFIED: developers.googleblog.com/subagents-have-arrived-in-gemini-cli — "spin off multiple subagents or many instances of the same subagent, at the same time"; infoq.com/news/2026/04/subagents-gemini-cli — "dispatch multiple agents in parallel"]

**Implementation:** A small regex-based pass in `gemini-transform.cjs::rewriteTaskCalls(body)`:
- Match `Task\s*\(\s*subagent_type\s*=\s*['"]([^'"]+)['"]\s*,\s*prompt\s*=\s*['"]([^'"]+)['"]\s*\)` (with multiline flag for prompts that wrap).
- Replace each match with the tool-call-style instruction shown above.
- Detect adjacent `Task()` calls (whitespace/newline only between) and group into a "parallel" instruction.

**Caveat:** Multi-line prompt strings (with embedded quotes / `${VAR}` patterns / triple-quoted blocks) require a real expression-aware scanner — regex is not sufficient. Plan for AST-light scanning (track quote nesting + paren depth) in `gemini-transform.cjs`. Test fixture must include at least one multi-line prompt with embedded quotes to lock this.

### Pattern 6: Gemini settings.json Hook Merge (D-16)

**Event-name mapping (Claude → Gemini):**

| Claude event | Gemini event | Notes |
|--------------|--------------|-------|
| `SessionStart` | `SessionStart` | Same shape; receives `source` ("startup" \| "resume" \| "clear") on Gemini |
| `PreToolUse` | `BeforeTool` | Same matcher/regex shape; payload field names differ slightly (`tool_name`, `tool_input`) |
| `PostToolUse` | `AfterTool` | Same shape; receives `tool_response` |
| `Stop` (Claude) | `SessionEnd` (Gemini) | Different name + slightly different lifecycle but functionally equivalent for "session ending" hooks |
| `statusLine` | **(no equivalent)** | Gemini does NOT have a top-level `statusLine` field. The `oto-statusline.js` hook does not register on Gemini. |

[VERIFIED: github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md, foundation-frameworks/get-shit-done-main/bin/install.js:6554 (`postToolEvent = (runtime === 'gemini') ? 'AfterTool' : 'PostToolUse'`)]

**Required settings.json key (D-14 dependency):** `settings.experimental.enableAgents = true` MUST be set for Gemini agent dispatch to work. Default in current Gemini versions is `true`, but oto's installer should write it explicitly so users with older versions or who've toggled it off get a working install. [VERIFIED: foundation-frameworks/get-shit-done-main/bin/install.js:6589-6598]

**Hook entry shape (Gemini):**
```json
{
  "experimental": { "enableAgents": true },
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash '<configDir>/hooks/oto-session-start'" }] }
    ],
    "BeforeTool": [
      { "matcher": "Write|Edit|Replace", "hooks": [{ "type": "command", "command": "node '<configDir>/hooks/oto-prompt-guard.js'", "timeout": 5 }] }
    ],
    "AfterTool": [
      { "matcher": "read_file", "hooks": [{ "type": "command", "command": "node '<configDir>/hooks/oto-read-injection-scanner.js'", "timeout": 5 }] },
      { "matcher": "run_shell_command|write_file|replace", "hooks": [{ "type": "command", "command": "node '<configDir>/hooks/oto-context-monitor.js'", "timeout": 10 }] }
    ]
  },
  "_oto": { /* marker block — same shape as Claude */ }
}
```

**Note the matcher rewrites:** Gemini matchers must use Gemini tool names (`read_file`, not `Read`; `run_shell_command`, not `Bash`). The `mergeSettings` for Gemini reuses `convertGeminiToolName` to translate Claude matchers into Gemini ones.

### Anti-Patterns to Avoid

- **Hand-editing the generated CLAUDE.md/AGENTS.md/GEMINI.md after Phase 8 lands.** D-03's regen-diff test fails the build. Edit the template instead.
- **Pulling a TOML library to "make codex-toml.cjs simpler".** No library does lossless TOML round-trip with comment preservation; upstream chose hand-rolled for this exact reason. Test heavily; do not import.
- **Rewriting Task() calls inside `<example>...</example>` blocks or fenced code that documents the Claude-native syntax.** The transform must skip code-fence-quoted-as-prose-example contexts. Add a `lang=claude-only` fence variant in commands that documents Claude syntax explicitly, OR keep the rewrite limited to bare `Task(...)` not inside fenced code blocks. **Researcher recommendation:** rewrite ONLY bare `Task(...)` calls (not inside ``` ``` `` `` blocks); if a workflow needs to document Claude syntax for users, that fence is preserved on all runtimes.
- **Using a single global `tier` resolution for all agents.** Upstream's `MODEL_PROFILES` map is per-agent (each agent has its own `{opus, sonnet, haiku}` defaults). For v0.1.0, oto can ship a flat default-tier-per-agent (everyone gets `balanced` unless overridden); but the resolver signature must accept per-agent input so v0.2 can plug in the full per-agent profile map without an API break.
- **Treating Gemini's lack of `statusLine` as a "fix it later" item.** It's a documented capability gap. Matrix records it as `gemini.statusLine = 'unsupported'` and the hook source file at `oto/hooks/dist/oto-statusline.js` simply doesn't get a settings.json entry on Gemini. Gemini installs ship a working but unstatuslined oto.
- **Assuming Codex `transformSkill`/`transformCommand` is identity without test.** Codex consumes commands as native markdown but commands may have `Task(...)` patterns or `${VAR}` shell expansions that need verification. Phase 8 fixture for `/oto-progress` must run through Codex's transform path even if it's identity, to lock that behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading `~/.oto/defaults.json` schema | Custom JSON schema validator | Hand-validate fields one-by-one in `codex-profile.cjs::loadDefaults()` (5 fields, ~20 LOC) | Phase 2 D-16 set the precedent: hand-rolled validation for tiny schemas; pulling Ajv/Zod adds 100KB+ for 5 fields |
| Walking `oto/agents/` for `.toml` emit | Custom directory walker | Reuse `walkTree` from `bin/lib/copy-files.cjs` | Already works; sorted output; symlink-safe |
| Marker-bracketed JSON merge for Gemini settings.json | New marker logic | Reuse `runtime-claude.cjs::mergeSettings/unmergeSettings` shape, parameterize event names | Claude pattern is already locked + tested; Gemini is structurally identical modulo event-name renames |
| `RUNTIME_PROFILE_MAP` constant | Building a config-tier system | Copy upstream's table verbatim (4 runtimes × 3 tiers = 12 entries) | It's a static table; no abstraction needed |
| YAML frontmatter parsing in transforms | Pulling `js-yaml` (or similar) | Hand-rolled key-value parsing per upstream lines 1991–2010 / 3510–3603 | Frontmatter is a known fixed shape; upstream parses it with line-iteration; works fine |
| Spine smoke test driver | Custom harness | Phase 4 MR-01 dogfood harness pattern: `spawnSync('codex'/'gemini', [...])` with tmpdir cwd, assert expected outputs | Already proven for Claude; structurally identical for other runtimes |

**Key insight:** Phase 8 is almost entirely **adoption** of upstream's already-debugged transform code. The only genuinely new logic is (1) the SoT template fence-stripping renderer, (2) the runtime-matrix renderer, (3) the per-agent `.toml` emit lifecycle hook, and (4) the matrix-vs-code consistency test. Everything else is verbatim port + namespace rename (`gsd` → `oto`, `~/.gsd/defaults.json` → `~/.oto/defaults.json`).

## Runtime State Inventory

> Phase 8 is a feature/transform phase, not a rename/refactor phase. The user has flagged D-12 (daily-peer Gemini) which IS a behavioral override of `oto/skills/using-oto/references/gemini-tools.md` line 17 ("No equivalent — Gemini CLI does not support subagents"). That file is a static reference that ships in installs; updating it is a code-edit task in PLAN.md. No data migration is needed (no databases, no live services, no OS-registered state).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 8 emits files at install time, no datastore writes | None |
| Live service config | None — no Datadog/n8n/etc. external services | None |
| OS-registered state | None — Phase 8 does not register Task Scheduler / launchd / systemd entries | None |
| Secrets/env vars | New `~/.oto/defaults.json` path; existing env var `CLAUDE_CONFIG_DIR`/`CODEX_HOME`/`GEMINI_CONFIG_DIR` already resolved by `args.cjs::resolveConfigDir` (no change) | None — schema docs only |
| Build artifacts / installed packages | `oto/skills/using-oto/references/gemini-tools.md` line 17 contains stale "no subagents" claim (pre-dates Gemini v0.38 subagents release April 2026) | **Code edit** — Phase 8 rewrites this file as part of the transform package; new content reflects subagent reality |

## Common Pitfalls

### Pitfall 1: Multi-line `Task()` prompt rewriting eats embedded quotes / parens

**What goes wrong:** Naive regex-based `Task(...)` rewrite in `gemini-transform.cjs` fails when a prompt string contains:
- Embedded single or double quotes (`prompt='He said "hi"'`)
- Multi-line strings with `\n` or template literals
- Triple-quoted multi-line prompts (`prompt="""\n...\n"""`)
- `${VAR}` patterns inside the prompt (which separately need `$VAR` escape)

**Why it happens:** Regex can't track paren-depth + quote-nesting state. Greedy `.*?` matches truncate at the first `)`.

**How to avoid:** Implement a tiny scanner: track `inSingleQuote`/`inDoubleQuote`/`parenDepth`/`tripleQuoteOpen` and walk character-by-character. ~30 LOC. Test fixture: at least one `Task()` with each pathology.

**Warning signs:** Fixture-golden test for `oto-executor` (which uses `Task()` heavily) diverges from expected output even though plain `Task()` calls render correctly.

### Pitfall 2: Codex `[[hooks]]` array-of-tables vs legacy `[hooks.TYPE]` map

**What goes wrong:** Codex 0.124+ requires `[[hooks]]` array-of-tables format. Older GSD installs wrote legacy `[hooks.PreToolUse]` map. If a user has a pre-existing legacy `[hooks]` block from an old install (from a different framework), oto's `mergeHooksBlock` may produce a config with both formats, breaking Codex.

**Why it happens:** Hand-rolled TOML merge sees two separate sections; doesn't know the legacy form is obsolete.

**How to avoid:** v0.1.0 scope: **don't migrate legacy formats** — assume fresh install or oto-only installs. Document in `decisions/runtime-tool-matrix.md`: "If `~/.codex/config.toml` contains a legacy `[hooks.X]` block from a non-oto framework, manually convert to `[[hooks]]` before running `oto install --codex`." Add a guard in `mergeSettings` that emits a stderr warning + refuses to merge if both formats coexist (matches Phase 5 D-13 user-content-preservation contract). [VERIFIED: foundation-frameworks/get-shit-done-main/bin/install.js:2858-2916 has the migration logic; oto deliberately omits it for v0.1.0.]

**Warning signs:** Fresh-install + immediate uninstall on a Codex with no prior config produces a non-empty config.toml; or merge produces a config.toml with both `[hooks.X]` and `[[hooks]]` sections.

### Pitfall 3: Gemini matcher uses Claude tool names

**What goes wrong:** A hook entry in oto's `mergeSettings` for Gemini accidentally writes `matcher: "Write|Edit"` (Claude tool names) instead of `"write_file|replace"` (Gemini tool names). Hook never fires; user sees no error but loses prompt-guard / context-monitor coverage.

**Why it happens:** Copy-paste from Claude's `mergeSettings` without running matchers through `convertGeminiToolName`.

**How to avoid:** Centralize matcher construction in a helper: `gemini-transform.cjs::convertGeminiMatcher(claudeMatcher)` that splits on `|`, calls `convertGeminiToolName` on each, drops nulls, rejoins. Use it everywhere a matcher is set on Gemini. Test it: round-trip `"Bash|Edit|Write|MultiEdit|Agent|Task"` → `"run_shell_command|replace|write_file"` (`MultiEdit`/`Agent` lowercase to themselves; `Task` filters out).

**Warning signs:** `phase-08-gemini-settings.test.cjs` round-trip diverges; or smoke test for Gemini reports no hooks fired.

### Pitfall 4: `${VAR}` escape pass corrupts shell heredocs

**What goes wrong:** Naive `body.replace(/\$\{(\w+)\}/g, '$$$1')` can corrupt strings inside backticks-fenced bash code blocks where the user genuinely wants `${VAR}` in the rendered output (e.g. documentation showing how to use a workflow's env var).

**Why it happens:** The escape pass is global; doesn't distinguish "shell variable that bash will expand" (safe to escape to `$VAR`) from "literal documentation of a template string" (must stay as `${VAR}`).

**How to avoid:** Upstream's pass IS global (`bin/install.js:3598`) — it's a pragmatic tradeoff. The actual semantics are preserved because in bash, `$VAR` and `${VAR}` are equivalent for simple variable expansion. The only case where this breaks is documentation showing literal template syntax for a non-bash language (e.g. shell template strings in JS). v0.1.0 scope: accept upstream's tradeoff; if a fixture surfaces a real conflict, plan a fix in v0.2.

**Warning signs:** Fixture-golden for `oto-executor` (which has `${PHASE}`/`${PLAN}` references in bash blocks) renders correctly but a fixture for an agent with `${...}` in JS template-string documentation renders mangled.

### Pitfall 5: Claude's identity transform broken by accident

**What goes wrong:** A change to `runtime-claude.cjs::transformCommand/transformAgent/transformSkill` (or to a shared transform util that Claude happens to call) silently introduces non-identity behavior. Spine smoke for Claude still passes (the file content is mostly unchanged), but a deep diff against the expected output reveals subtle drift.

**Why it happens:** Claude's identity is not actively asserted today — Phase 3 D-12 just left it as a no-op.

**How to avoid:** `phase-08-claude-identity.test.cjs` runs a representative agent + command + skill through Claude's transforms and asserts byte-equality against the source. Locks the identity contract.

**Warning signs:** Failing assertion in `phase-08-claude-identity.test.cjs` after a refactor of the transform pipeline.

### Pitfall 6: Per-agent `.toml` emit produces stale files on re-install with different agent set

**What goes wrong:** First install writes 23 `.toml` files. User edits oto's source to drop one agent; re-install writes 22 `.toml` files, but the 23rd from the prior install lingers in `<configDir>/agents/`.

**Why it happens:** `install.cjs` lines 101–107 already handle this for `copyTree` outputs (compares prior state's `files` against new entries, removes the difference). The new `emitDerivedFiles` hook must produce `{path, sha256}` entries that flow through the same diff-and-delete pass.

**How to avoid:** `emitDerivedFiles` returns the same shape as `copyTree`'s `fileEntries`; orchestrator treats them identically. Test fixture: install with 23 agents, mutate adapter map to 22 agents, re-install, assert 22nd `.toml` removed.

**Warning signs:** Codex spine smoke test reports unknown-agent errors; or post-install `<configDir>/agents/` listing has stale `.toml` files.

### Pitfall 7: SoT template fence-stripping accidentally kills shared content

**What goes wrong:** Renderer for runtime `claude` strips `<!-- runtime:codex -->...<!-- /runtime:codex -->` blocks. If a closing fence is misspelled or missing, the renderer either skips fences (leaving Codex content in CLAUDE.md) or eats the rest of the file.

**Why it happens:** Open/close fence pairing is positional; missing close means "strip to EOF".

**How to avoid:** Parse the template once, validate that every open fence has a matching close fence (count equality + interleaving check), throw a clear error before rendering. Test: fixture template with mismatched fence triggers a validation error.

**Warning signs:** `tests/phase-08-instruction-file-render.test.cjs` regen-diff produces wildly different output for one runtime than expected.

### Pitfall 8: Gemini smoke test runs against pre-subagent v0.26.0 binary

**What goes wrong:** The locally-installed `gemini` binary is v0.26.0 (pre-subagent). Spine smoke tests assume subagent dispatch works; tests fail unfairly because the binary lacks the feature, not because oto's transforms are wrong.

**Why it happens:** Subagents shipped in v0.38.x; older installations exist.

**How to avoid:** Smoke test header checks `gemini --version`; if < 0.38.0, `t.skip("Gemini < 0.38.0 lacks subagent support; install v0.38+ to run this test")`. Same pattern for Codex < 0.120 (per-agent struct tables landed in 0.120).

**Warning signs:** Smoke tests fail on a developer's machine but the actual transform output matches fixture goldens (transform is correct; runtime version is the gap).

### Pitfall 9: Matrix-vs-code drift goes undetected

**What goes wrong:** A developer adds a new tool to `convertGeminiToolName`'s explicit map but forgets to rerun `scripts/render-runtime-matrix.cjs`. The matrix on disk is stale; the regen-diff test catches it on next CI run, but in the meantime the matrix doc is wrong.

**Why it happens:** Source-of-truth lives in code; doc is generated; nothing in the code-edit flow forces a regen.

**How to avoid:** `tests/phase-08-runtime-matrix-render.test.cjs` does a byte-equality diff between the in-memory render and the on-disk file. Failing the test in CI catches drift. Document the workflow in `decisions/runtime-tool-matrix.md` header: "Generated by `scripts/render-runtime-matrix.cjs`. Do not hand-edit. To update: edit the source in `bin/lib/runtime-matrix.cjs` or in the per-runtime adapter descriptors, then run `npm run render-matrix`."

**Warning signs:** PR diff shows a hand-edit to `decisions/runtime-tool-matrix.md` without a corresponding code change.

## Code Examples

### Example 1: `convertGeminiToolName` (D-13 verbatim port)

```javascript
// bin/lib/gemini-transform.cjs
// Source: foundation-frameworks/get-shit-done-main/bin/install.js:917-970 (Lines 917-928 = map; 955-970 = function)
// Adopt VERBATIM. The map and filter rules are stable across upstream versions.

const claudeToGeminiTools = {
  Read: 'read_file',
  Write: 'write_file',
  Edit: 'replace',
  Bash: 'run_shell_command',
  Glob: 'glob',
  Grep: 'search_file_content',
  WebSearch: 'google_web_search',
  WebFetch: 'web_fetch',
  TodoWrite: 'write_todos',
  AskUserQuestion: 'ask_user',
};

function convertGeminiToolName(claudeTool) {
  if (claudeTool.startsWith('mcp__')) return null;  // auto-discovered from mcpServers
  if (claudeTool === 'Task') return null;            // agents auto-registered as tools
  if (claudeToGeminiTools[claudeTool]) return claudeToGeminiTools[claudeTool];
  return claudeTool.toLowerCase();
}

module.exports = { convertGeminiToolName, claudeToGeminiTools };
```

### Example 2: `convertClaudeAgentToCodexAgent` (D-11 verbatim port, namespace-renamed)

```javascript
// bin/lib/codex-transform.cjs
// Source: foundation-frameworks/get-shit-done-main/bin/install.js:1991-2010
// Renames: gsd → oto in shipped strings; otherwise verbatim.

function convertClaudeAgentToCodexAgent(content) {
  // Helpers (port from upstream lines ~640-720):
  // extractFrontmatterAndBody, extractFrontmatterField, toSingleLine, yamlQuote,
  // convertClaudeToCodexMarkdown (mostly identity for oto)

  let converted = convertClaudeToCodexMarkdown(content);
  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  if (!frontmatter) return converted;

  const name = extractFrontmatterField(frontmatter, 'name') || 'unknown';
  const description = extractFrontmatterField(frontmatter, 'description') || '';
  const tools = extractFrontmatterField(frontmatter, 'tools') || '';

  const roleHeader = `<codex_agent_role>
role: ${name}
tools: ${tools}
purpose: ${toSingleLine(description)}
</codex_agent_role>`;

  const cleanFrontmatter = `---\nname: ${yamlQuote(name)}\ndescription: ${yamlQuote(toSingleLine(description))}\n---`;

  return `${cleanFrontmatter}\n\n${roleHeader}\n${body}`;
}

module.exports = { convertClaudeAgentToCodexAgent };
```

### Example 3: `generateCodexAgentToml` (D-10 port — adjusted for `~/.oto/`)

```javascript
// bin/lib/codex-transform.cjs (continued) or bin/lib/codex-toml.cjs
// Source: foundation-frameworks/get-shit-done-main/bin/install.js:2017-2059
// Renames: ~/.gsd/defaults.json → ~/.oto/defaults.json; CODEX_AGENT_SANDBOX → adapter.agentSandboxes.

function generateCodexAgentToml(agentName, agentContent, sandboxMap, modelOverrides, runtimeResolver) {
  const sandboxMode = sandboxMap[agentName] || 'read-only';
  const { frontmatter, body } = extractFrontmatterAndBody(agentContent);
  const resolvedName = extractFrontmatterField(frontmatter || '', 'name') || agentName;
  const resolvedDescription = toSingleLine(
    extractFrontmatterField(frontmatter || '', 'description') || `oto agent ${resolvedName}`
  );
  const instructions = body.trim();

  const lines = [
    `name = ${JSON.stringify(resolvedName)}`,
    `description = ${JSON.stringify(resolvedDescription)}`,
    `sandbox_mode = "${sandboxMode}"`,
  ];

  // Precedence: per-agent model_overrides > runtime-aware tier resolution.
  const modelOverride = modelOverrides?.[resolvedName] || modelOverrides?.[agentName];
  if (modelOverride) {
    lines.push(`model = ${JSON.stringify(modelOverride)}`);
  } else if (runtimeResolver) {
    const entry = runtimeResolver.resolve(resolvedName) || runtimeResolver.resolve(agentName);
    if (entry?.model) {
      lines.push(`model = ${JSON.stringify(entry.model)}`);
      if (entry.reasoning_effort) {
        lines.push(`model_reasoning_effort = ${JSON.stringify(entry.reasoning_effort)}`);
      }
    }
  }

  // TOML literal multiline: preserve raw backslashes from regex / shell snippets.
  lines.push(`developer_instructions = '''`);
  lines.push(instructions);
  lines.push(`'''`);

  return lines.join('\n') + '\n';
}
```

### Example 4: `convertClaudeToGeminiAgent` (D-13 port)

```javascript
// bin/lib/gemini-transform.cjs (continued)
// Source: foundation-frameworks/get-shit-done-main/bin/install.js:3500-3603

function convertClaudeToGeminiAgent(content) {
  if (!content.startsWith('---')) return content;
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return content;

  const frontmatter = content.substring(3, endIndex).trim();
  const body = content.substring(endIndex + 3);

  const lines = frontmatter.split('\n');
  const newLines = [];
  let inAllowedTools = false;
  let inSkippedArrayField = false;
  const tools = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (inSkippedArrayField) {
      if (!trimmed || trimmed.startsWith('- ')) continue;
      inSkippedArrayField = false;
    }

    if (trimmed.startsWith('allowed-tools:')) { inAllowedTools = true; continue; }

    if (trimmed.startsWith('tools:')) {
      const toolsValue = trimmed.substring(6).trim();
      if (toolsValue) {
        const parsed = toolsValue.split(',').map(t => t.trim()).filter(Boolean);
        for (const t of parsed) {
          const mapped = convertGeminiToolName(t);
          if (mapped) tools.push(mapped);
        }
      } else {
        inAllowedTools = true;  // YAML array follows
      }
      continue;
    }

    if (trimmed.startsWith('color:')) continue;        // Gemini rejects
    if (trimmed.startsWith('skills:')) { inSkippedArrayField = true; continue; }

    if (inAllowedTools) {
      if (trimmed.startsWith('- ')) {
        const mapped = convertGeminiToolName(trimmed.substring(2).trim());
        if (mapped) tools.push(mapped);
        continue;
      } else if (trimmed && !trimmed.startsWith('-')) {
        inAllowedTools = false;
      }
    }
    if (!inAllowedTools) newLines.push(line);
  }

  if (tools.length > 0) {
    newLines.push('tools:');
    for (const tool of tools) newLines.push(`  - ${tool}`);
  }

  // ${VAR} → $VAR escape for Gemini's templateString().
  const escapedBody = body.replace(/\$\{(\w+)\}/g, '$$$1');

  return `---\n${newLines.join('\n').trim()}\n---${escapedBody}`;
}
```

### Example 5: SoT renderer skeleton (D-02)

```javascript
// bin/lib/instruction-file.cjs

const fs = require('node:fs');
const path = require('node:path');

const FENCE_OPEN  = /<!--\s*runtime:(\w+)\s*-->/g;
const FENCE_CLOSE = /<!--\s*\/runtime:(\w+)\s*-->/g;

function render(runtimeName, ctx) {
  const tplPath = path.join(__dirname, '..', '..', 'oto', 'templates', 'instruction-file.md');
  const template = fs.readFileSync(tplPath, 'utf8');

  // Validate fence pairing (Pitfall 7).
  validateFencePairing(template);

  // Strip wrong-runtime fenced blocks.
  let out = stripWrongRuntimeBlocks(template, runtimeName);

  // Strip the right-runtime fence MARKERS (keep contents).
  out = out.replace(new RegExp(`<!--\\s*runtime:${runtimeName}\\s*-->\\s*\\n?`, 'g'), '');
  out = out.replace(new RegExp(`<!--\\s*\\/runtime:${runtimeName}\\s*-->\\s*\\n?`, 'g'), '');

  // Token substitution.
  for (const [key, value] of Object.entries(ctx)) {
    out = out.split(`{{${key}}}`).join(String(value));
  }

  return out;
}

function stripWrongRuntimeBlocks(template, keepRuntime) {
  // For each opening fence not matching keepRuntime, find its close and remove the whole block.
  const allRuntimes = ['claude', 'codex', 'gemini'];
  let out = template;
  for (const r of allRuntimes) {
    if (r === keepRuntime) continue;
    const re = new RegExp(`<!--\\s*runtime:${r}\\s*-->[\\s\\S]*?<!--\\s*\\/runtime:${r}\\s*-->\\s*\\n?`, 'g');
    out = out.replace(re, '');
  }
  return out;
}

function validateFencePairing(template) {
  const opens = [...template.matchAll(FENCE_OPEN)];
  const closes = [...template.matchAll(FENCE_CLOSE)];
  if (opens.length !== closes.length) {
    throw new Error(`instruction-file.md: ${opens.length} open fences, ${closes.length} close fences`);
  }
  // Per-runtime open/close counts must match.
  const counts = {};
  for (const m of opens) counts[m[1]] = (counts[m[1]] || 0) + 1;
  for (const m of closes) counts[m[1]] = (counts[m[1]] || 0) - 1;
  for (const [r, c] of Object.entries(counts)) {
    if (c !== 0) throw new Error(`instruction-file.md: runtime "${r}" has ${c > 0 ? c + ' unclosed' : -c + ' unopened'} fence(s)`);
  }
}

module.exports = { render };
```

### Example 6: Per-agent `.toml` emit lifecycle hook (D-10)

```javascript
// runtime-codex.cjs (added)

async function emitDerivedFiles(ctx) {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const crypto = require('node:crypto');
  const { generateCodexAgentToml } = require('./codex-transform.cjs');
  const { resolveAgentModel, loadDefaults } = require('./codex-profile.cjs');

  const agentsDir = path.join(ctx.configDir, 'agents');
  await fs.mkdir(agentsDir, { recursive: true });

  const defaults = loadDefaults();          // ~/.oto/defaults.json
  const projectConfig = loadProjectConfig(ctx.configDir); // <project>/.oto/config.json
  const resolver = buildResolver(defaults, projectConfig, 'codex');

  const entries = [];
  for (const agentName of Object.keys(module.exports.agentSandboxes)) {
    const agentPath = path.join(ctx.repoRoot, 'oto', 'agents', `${agentName}.md`);
    if (!(await exists(agentPath))) continue;
    const agentContent = await fs.readFile(agentPath, 'utf8');

    const tomlContent = generateCodexAgentToml(
      agentName,
      agentContent,
      module.exports.agentSandboxes,
      defaults?.model_overrides || projectConfig?.model_overrides,
      resolver,
    );

    const tomlPath = path.join(agentsDir, `${agentName}.toml`);
    await fs.writeFile(tomlPath, tomlContent);

    const hex = crypto.createHash('sha256').update(tomlContent).digest('hex');
    entries.push({ path: path.relative(ctx.configDir, tomlPath), sha256: hex });
  }
  return entries;
}

module.exports = {
  // ... existing
  emitDerivedFiles,
};
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22+ builtin) |
| Config file | None — driven by `package.json` `"test"` script: `node --test --test-concurrency=4 tests/*.test.cjs` |
| Quick run command | `node --test tests/phase-08-*.test.cjs` |
| Full suite command | `npm test` |
| Phase gate | All `phase-08-*.test.cjs` green + Phase 1–7 tests still green before `/oto-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MR-02 | SoT template renders to three correct project-root files (D-03 regen-diff) | unit | `node --test tests/phase-08-instruction-file-render.test.cjs` | ❌ Wave 0 |
| MR-02 | All three runtimes produce content for the fixture trio (oto-executor / /oto-progress / oto:test-driven-development) (D-08) | golden-file | `node --test tests/phase-08-codex-transform.test.cjs tests/phase-08-gemini-transform.test.cjs tests/phase-08-claude-identity.test.cjs` | ❌ Wave 0 |
| MR-03 | `decisions/runtime-tool-matrix.md` regen-diff (D-05) | unit | `node --test tests/phase-08-runtime-matrix-render.test.cjs` | ❌ Wave 0 |
| MR-03 | Matrix-vs-code byte equality for Claude→Gemini map + Codex sandbox column (D-08) | unit | (same file as above) | ❌ Wave 0 |
| MR-03 | `convertGeminiToolName` map covers every entry + filter rules + lowercase fallback (D-13) | unit | `node --test tests/phase-08-gemini-toolmap.test.cjs` | ❌ Wave 0 |
| MR-03 | Codex `mergeHooksBlock` round-trip + idempotent rewrite + uninstall removal (D-10) | unit | `node --test tests/phase-08-codex-toml.test.cjs` | ❌ Wave 0 |
| MR-03 | `resolveAgentModel` with project-config + global-defaults precedence (D-10) | unit | `node --test tests/phase-08-codex-profile.test.cjs` | ❌ Wave 0 |
| MR-03 | Gemini `mergeSettings` BeforeTool/AfterTool event-name mapping + `experimental.enableAgents = true` (D-16) | unit | `node --test tests/phase-08-gemini-settings.test.cjs` | ❌ Wave 0 |
| MR-04 | Codex spine: install → `/oto-help` / `/oto-progress` / `/oto-new-project` / `/oto-pause-work` / `/oto-resume-work` → state file written | integration | `node --test tests/phase-08-smoke-codex.integration.test.cjs` (skips if `codex` not on PATH or < 0.120) | ❌ Wave 0 |
| MR-04 | Gemini spine: same shape | integration | `node --test tests/phase-08-smoke-gemini.integration.test.cjs` (skips if `gemini` not on PATH or < 0.38) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-08-*.test.cjs` (all phase-8 tests; ≤ 30s including fixture-golden diffs)
- **Per wave merge:** `npm test` (full Phase 1–8 suite; ≤ 90s)
- **Phase gate:** Full suite green + spine smoke run manually with `codex`/`gemini` binaries present (Phase 10 promotes spine smoke to CI)

### Wave 0 Gaps

- [ ] `tests/phase-08-instruction-file-render.test.cjs` — covers MR-02 (D-03)
- [ ] `tests/phase-08-runtime-matrix-render.test.cjs` — covers MR-03 (D-05/D-08)
- [ ] `tests/phase-08-codex-transform.test.cjs` — covers MR-02 / MR-03 (D-11)
- [ ] `tests/phase-08-codex-toml.test.cjs` — covers MR-03 (D-10)
- [ ] `tests/phase-08-codex-profile.test.cjs` — covers MR-03 (D-10)
- [ ] `tests/phase-08-gemini-transform.test.cjs` — covers MR-02 / MR-03 (D-13/D-14)
- [ ] `tests/phase-08-gemini-toolmap.test.cjs` — covers MR-03 (D-13)
- [ ] `tests/phase-08-gemini-settings.test.cjs` — covers MR-03 (D-16)
- [ ] `tests/phase-08-smoke-codex.integration.test.cjs` — covers MR-04 (D-17/D-18)
- [ ] `tests/phase-08-smoke-gemini.integration.test.cjs` — covers MR-04 (D-17/D-18)
- [ ] `tests/phase-08-claude-identity.test.cjs` — covers Pitfall 5 sanity baseline
- [ ] `tests/fixtures/runtime-parity/{claude,codex,gemini}/oto-executor.expected.md` and friends (3 runtimes × 3 fixtures + per-agent `.toml`)
- [ ] (No new framework install — `node:test` already in use)

### Sampling Justification (Nyquist)

The Phase 8 surface is heavily transform-driven (input → deterministic output), which means **golden-file fixtures provide ≥ 2× the Nyquist rate** for catching regressions: any change to a transform that affects an agent's, command's, or skill's output WILL surface as a fixture diff. The per-runtime fixture trio (`oto-executor`, `/oto-progress`, `oto:test-driven-development`) was chosen because:
- `oto-executor` exercises every Codex/Gemini transform corner — `tools:` field, `color:`/`skills:` strip, `${VAR}` escape, `Task()` rewrite, sandbox map lookup.
- `/oto-progress` is a small command (low surface area) — confirms `transformCommand` behaves correctly when the input has minimal frontmatter.
- `oto:test-driven-development` is the simplest skill — confirms `transformSkill` is identity for skills (likely no Codex/Gemini-specific divergence; matrix records it).

If during execution the planner finds the trio insufficient (e.g. an agent with `mcp__*` tool references is the only place a particular bug would show), expand the fixture set in PLAN.md tasks.

## Security Domain

> Phase 8 has minimal security surface (no auth flows, no user-supplied input, no network). Most ASVS categories don't apply. Coverage:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | (none — phase has no auth) |
| V3 Session Management | no | (none) |
| V4 Access Control | yes | Codex `sandbox_mode` per-agent (already locked in `runtime-codex.cjs::agentSandboxes`); Phase 8 emits these into `<configDir>/agents/<agent>.toml` so Codex's agent router enforces them. Pitfall coverage: ADR-07 + agent-audit ensure no agent gets `workspace-write` without justification. |
| V5 Input Validation | partial | TOML/JSON parser inputs come from upstream-formatted files + project's own state files. `~/.oto/defaults.json` schema validation = hand-rolled type-check (5 fields). No user-supplied free text reaches a parser without going through the existing `marker.cjs` paths. |
| V6 Cryptography | no | (none — no crypto operations beyond sha256 hashing for state-file integrity, which is integrity-only and not a security boundary) |

### Known Threat Patterns for Multi-Runtime Install

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Marker-block injection (a malicious upstream content edit slips a hook into oto's marker block) | Tampering | Marker-block ownership validated by `_oto.hooks` registry; uninstall only removes entries that match registry markers (Phase 5 D-13/D-14) |
| Hook-command injection via `${VAR}` expansion | Tampering | All hook commands shell-quoted via `shellQuote()` (existing pattern in `runtime-claude.cjs:10-12`); applies to Codex + Gemini paths too |
| TOML parse-confusion (a value in `~/.oto/defaults.json` parses ambiguously and embeds untrusted content into emitted TOML) | Tampering | All emitted TOML values use `JSON.stringify()` for string quoting (matches upstream `bin/install.js:2028-2030`); literal multiline `'''...'''` strings only contain agent body (oto-controlled content) |
| Agent body containing literal `gsd-` or `superpowers-` strings (Pitfall 1 / Pitfall 15) | Information Disclosure | Per-runtime fixture goldens (D-08) catch byte-level appearance of upstream identity strings; existing Phase 4 / Phase 6 tests already gate this for the source files; Phase 8 transforms are byte-preserving for shared content |
| `experimental.enableAgents = true` overrides user preference | Tampering | Mitigation: only WRITE the field if missing; if user explicitly set `false`, log a warning and skip the agent-emit pass entirely (mirrors upstream `bin/install.js:6594` `if (!settings.experimental.enableAgents)` guard). Test fixture: `enableAgents: false` in pre-existing settings → installer warns + skips |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gemini CLI lacks subagents (oto's `gemini-tools.md` line 17 still says this) | Gemini CLI v0.38+ ships subagents, exposed as tools | April 2026 (v0.38.x release) | Phase 8 Gemini path is now functionally equivalent to Codex/Claude for `Task()` dispatch — no fallback needed |
| Codex `[hooks.TYPE]` map format | `[[hooks]]` array-of-tables | Codex v0.124 | Phase 8 emits the new format; legacy migration deliberately omitted (v0.1.0 scope) |
| Codex `[[agents]]` array-of-tables (legacy GSD) | `[agents.<name>]` struct tables (Codex v0.120+) | 2026 | Phase 8 emits per-agent `<name>.toml` files (not `[agents.<name>]` in main config), per upstream's current pattern at line 2103 |
| Per-runtime hook event names assumed to all be `PreToolUse`/`PostToolUse` | Gemini uses `BeforeTool`/`AfterTool`; Antigravity (out of scope) same | Long-standing in upstream | `gemini-transform.cjs::convertGeminiHookEventName(claudeName)` maps the renames |

**Deprecated/outdated:**
- `oto/skills/using-oto/references/gemini-tools.md` line 17 ("No equivalent — Gemini CLI does not support subagents") — **stale; rewrite during Phase 8 in the same wave that lands Gemini transforms.**
- `runtime-gemini.cjs` `// TODO Phase 5: Gemini settings.json merge` (line 45) — **resolved by Phase 8 D-16; replace TODO with real call.**
- `runtime-codex.cjs` `// TODO Phase 5: real TOML manipulation via bin/lib/codex-toml.cjs` (line 75) — **resolved by Phase 8 D-10.**
- `runtime-codex.cjs` `// TODO Phase 8: Codex frontmatter parity` (line 72) — **this phase resolves it.**
- `runtime-gemini.cjs` `// TODO Phase 8: Gemini tool-name remap parity` (line 42) — **this phase resolves it.**

## Assumptions Log

> Claims tagged `[ASSUMED]` in this research that the planner / discuss-phase should confirm with the user before locking into PLAN.md.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 23 retained agents in `runtime-codex.cjs::agentSandboxes` are the complete set Phase 8 should emit `.toml` files for (no Phase 8 net-new agents) | Pattern 2 / Code Example 6 | Spine smoke surfaces a missing agent .toml; planner adds it as a one-line entry |
| A2 | `~/.oto/defaults.json` should be left **absent** at first install (read returns null, all overrides start from no-pin baseline) — listed in Claude's Discretion bullets | Pattern 4 schema example | If user wants the file pre-seeded, planner flips the default in PLAN.md; trivial change |
| A3 | Gemini smoke test handles interactive `AskUserQuestion`-equivalent input via **pre-canned answer fixtures** (vs. an `--auto` mode) | Validation Architecture | If the runtimes don't support pre-canned-answer injection, smoke tests need a different harness — but `--auto`-style flags exist in both runtimes and can be confirmed by the planner during Wave 0 |
| A4 | `transformSkill` for Codex and Gemini is **identity** (no per-runtime mutation needed) | Pattern + Pitfall 5 | If a skill body has `${VAR}` that needs the Gemini escape, transformSkill must call into gemini-transform; planner confirms by running the fixture trio's skill through both transforms during Wave 1 |
| A5 | `transformCommand` for Codex is **identity** (commands are markdown-native to Codex) | Anti-Patterns + Pattern | If commands contain Claude-specific syntax (e.g. tool names in matchers inside the body), Codex may need a real transform; fixture for `/oto-progress` will surface this in Wave 1 |
| A6 | Legacy-format Codex `config.toml` migration is **deferred to v0.2** (oto refuses to merge into a config.toml with both `[hooks.X]` map and `[[hooks]]` array forms) | Pitfall 2 | If a user has a legacy GSD install and wants to migrate, oto won't help; planner can elevate this to Phase 8 if user disagrees with the deferral |
| A7 | Phase 8 fixture trio (`oto-executor`, `/oto-progress`, `oto:test-driven-development`) is sufficient surface coverage | Validation Architecture / Sampling Justification | If a corner-case agent (e.g. one with `mcp__*` references or with multi-line `Task()` prompts) is not represented, regressions in those paths slip through; planner can add fixtures during execute |
| A8 | Pre-existing project-root `CLAUDE.md` (the seed for the SoT template) is the canonical content; nothing in `AGENTS.md` / `GEMINI.md` exists yet to reconcile | D-04 / Pattern 1 | If hand-edited drafts of `AGENTS.md` / `GEMINI.md` exist somewhere unsanctioned, the SoT template generator will overwrite them; verify by `find .` for those filenames before Wave 1 |

**If any of these assumptions are confirmed wrong by the user during PLAN.md authoring, the affected sections need adjustment but no foundational research re-do.**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Phase 8 work | ✓ | 22.17.1 | — (engines field gates installs) |
| `node:test` | All `phase-08-*.test.cjs` | ✓ | builtin in Node 22 | — |
| `codex` CLI | `phase-08-smoke-codex.integration.test.cjs` | ✓ | 0.128.0 (≥ 0.120 required for per-agent struct tables) | Test `t.skip()`s with clear message if absent or < 0.120 |
| `gemini` CLI | `phase-08-smoke-gemini.integration.test.cjs` | ✓ but **outdated** | 0.26.0 — **subagents shipped in v0.38** | Test `t.skip()`s with `"requires gemini >= 0.38.0 for subagent support"`. Manual upgrade required to run full Gemini spine smoke. |
| `claude` CLI | `phase-08-smoke-claude.integration.test.cjs` (optional, Phase 4 MR-01 already covers) | (assume ✓) | (current) | Optional baseline; skip if absent |

**Missing dependencies with no fallback:** None. All required tools are present locally.

**Missing dependencies with fallback:** Gemini CLI v0.26.0 lacks subagent support — local Gemini spine smoke tests for agent dispatch must skip. Recommend the user upgrade `gemini` to v0.38+ before running the spine smoke locally; CI promotion in Phase 10 can specify the version.

## Open Questions (RESOLVED)

All Phase 8 open questions are resolved here as locked decisions before planning. If implementation surfaces conflict, downgrade to a plan-revision (not a phase-replan).

1. **Per-agent `.toml` `# managed by oto v{{OTO_VERSION}}` header — RESOLVED: INCLUDED.**
   - Decision: The header line is emitted as the first line of every `<configDir>/agents/<name>.toml`. Plan 03 fixture goldens at `tests/fixtures/runtime-parity/codex/oto-executor.expected.toml` include the header line.
   - Fallback: If smoke tests in Plan 06 surface a Codex parse error from the TOML comment, downgrade to a plan-revision task (drop the header, update the goldens) — NOT a phase-replan.
   - Rationale: Hook source files already use this token convention (Phase 5 D-03). Marker makes Phase 9 sync detection of stale `.toml` files trivial. Low-risk, high-payoff.

2. **Fenced-code `Task()` preservation — RESOLVED: BARE-ONLY rewrite.**
   - Decision: Gemini `Task()` rewrite (D-14) operates only on bare `Task(...)` invocations OUTSIDE fenced code blocks. Fenced-code Claude `Task()` examples in markdown bodies are preserved verbatim.
   - Plan 04 fixture must include both a bare `Task()` and a fenced-code `Task()` in the test inputs; the transform asserts only the bare one is rewritten.
   - Rationale: Some `oto/commands/*.md` files contain fenced `Task()` as documentation of Claude syntax for the user. Rewriting them would corrupt the documentation. Bare-only matches the Anti-Patterns guidance.

3. **Phase 8.5 dogfood wave — RESOLVED: DEFERRED to v0.2 / not in v0.1.0 closeout.**
   - Decision: CONTEXT.md `<deferred>` already captures this. Plan 06 spine smoke (Codex + Gemini tmpdir installs + state-file assertions) is the v0.1.0 closeout proof.
   - Rationale: Spine smoke is automated, byte-asserted coverage. A manual dogfood is qualitative confidence — useful but not a v0.1.0 gate. Open as a follow-up Phase 8.x or v0.2 candidate if user feedback surfaces a need.


## Sources

### Primary (HIGH confidence)
- **Upstream `bin/install.js`** at `foundation-frameworks/get-shit-done-main/bin/install.js`:
  - Lines 19, 70–71 (constants `GSD_CODEX_MARKER`, `GSD_RUNTIME_PROFILE_MAP`, `gsdResolveTierEntry`)
  - Lines 625–700 (`readGsdGlobalModelOverrides`, `readGsdEffectiveModelOverrides` — `~/.gsd/defaults.json` schema)
  - Lines 746–809 (`readGsdRuntimeProfileResolver` — runtime-aware tier resolution)
  - Lines 917–928 (`claudeToGeminiTools` map)
  - Lines 955–970 (`convertGeminiToolName`)
  - Lines 1991–2010 (`convertClaudeAgentToCodexAgent`)
  - Lines 2017–2059 (`generateCodexAgentToml`)
  - Lines 2128–2166 (`stripGsdFromCodexConfig` — marker block strip)
  - Lines 2168–2965 (TOML parsing utilities — `parseTomlBracketHeader`, `getTomlLineRecords`, `stripCodexHooksFeatureAssignments`, `splitTomlLines`, `findTomlCommentStart`, `detectLineEnding`)
  - Lines 3500–3603 (`convertClaudeToGeminiAgent`)
  - Lines 3942–3976 (`convertClaudeToGeminiToml`)
  - Lines 6213–6253 (call sites — confirms install-time invocation point)
  - Lines 6554, 6589–6598, 6633–6652 (Gemini event-name renames + `experimental.enableAgents` requirement)
- **Upstream `core.cjs`** at `foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/core.cjs:1566-1595` — `RUNTIME_PROFILE_MAP` definition
- **Upstream call site for `convertClaudeAgentToCodexAgent`** — install.js line 6230
- **oto adapters** — `bin/lib/runtime-claude.cjs` / `runtime-codex.cjs` / `runtime-gemini.cjs` (current Phase 7 state)
- **oto orchestrator** — `bin/lib/install.cjs`, `copy-files.cjs`, `marker.cjs`
- **CONTEXT.md** — `.planning/phases/08-codex-gemini-runtime-parity/08-CONTEXT.md` (locked decisions D-01..D-18)
- **Project ADR-02** — `decisions/ADR-02-env-var-prefix.md` (`OTO_*` env-var policy → `~/.oto/defaults.json`)

### Secondary (MEDIUM-HIGH confidence — official docs)
- **Gemini CLI subagents reference** — [github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md) (frontmatter shape, `@`-syntax, agent-as-tool exposure model)
- **Gemini CLI hooks reference** — [github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md) (full event list, payload shapes, settings.json schema)
- **Gemini CLI configuration reference** — [geminicli.com/docs/reference/configuration/](https://geminicli.com/docs/reference/configuration/) (settings.json layout)
- **Gemini CLI v0.38 subagents discussion** — [github.com/google-gemini/gemini-cli/discussions/25562](https://github.com/google-gemini/gemini-cli/discussions/25562) (subagents release version)

### Tertiary (MEDIUM confidence — secondary press / blog corroboration)
- **Google Developers Blog on Gemini subagents** — [developers.googleblog.com/subagents-have-arrived-in-gemini-cli](https://developers.googleblog.com/subagents-have-arrived-in-gemini-cli) (parallel dispatch confirmed)
- **InfoQ Gemini subagents writeup** — [infoq.com/news/2026/04/subagents-gemini-cli](https://www.infoq.com/news/2026/04/subagents-gemini-cli/) (parallel + delegation behaviors)
- **Romin Irani tutorial on Gemini parallel orchestration** — [medium.com/google-cloud/mastering-gemini-cli-subagents-part-3-parallel-orchestration-scaling](https://medium.com/google-cloud/mastering-gemini-cli-subagents-part-3-parallel-orchestration-scaling-bdb7fb7c81f2)

## Metadata

**Confidence breakdown:**
- Standard stack (Node 22, node:test, zero-dep): **HIGH** — already locked in CLAUDE.md and used in Phase 1–7
- Upstream transforms (D-10/D-11/D-13 verbatim ports): **HIGH** — read line-by-line, all functions located and documented
- Gemini subagents + parallel dispatch (D-14/D-15): **HIGH** — official docs + multiple corroborating sources, all current as of April 2026
- Gemini hook surface (D-16): **HIGH** — official hooks reference doc; event-name renames confirmed against upstream code
- SoT template fence syntax (D-02): **MEDIUM** — HTML-comment fences are de-facto safe in markdown but no edge-case test of e.g. how `marked.js`/`remark` handles them; matters only if future tooling parses oto's CLAUDE.md/AGENTS.md/GEMINI.md (currently nothing does)
- Per-agent `.toml` lifecycle integration (D-10): **HIGH** — orchestrator structure already supports the new hook with one-line addition
- Spine smoke harness pattern (D-17/D-18): **HIGH** — Phase 4 MR-01 / Phase 7 D-08 precedent

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (30 days for stable upstream + Gemini docs; re-verify Gemini version requirements if smoke tests delay past mid-June)

---

*Phase 08 research complete; planner can author PLAN.md files. Highest-priority research input (Gemini Task() rewrite syntax + parallel support + hooks surface) all resolved with HIGH confidence.*
