# Architecture Research

**Domain:** Hybrid AI-CLI framework (oto = GSD ⊕ Superpowers)
**Researched:** 2026-04-27
**Confidence:** HIGH (direct source inspection of both upstreams in `foundation-frameworks/`)

---

## Executive Summary

GSD and Superpowers are **the same primitives at different abstraction levels.** Both ship Markdown artifacts with YAML frontmatter, both fan-out to parallel subagents, both target multi-runtime distribution. They differ in *what's load-bearing*:

- **GSD's load-bearing concept is the workflow** — a long, prescriptive Markdown file (200–1500 lines) executed step-by-step by a thin command shim. State is durable in `.planning/`. Subagents are typed (`gsd-executor`, `gsd-planner`, etc.) with strict contracts.
- **Superpowers' load-bearing concept is the skill** — a short Markdown file (60–650 lines) that gets *invoked on suspicion* via the `Skill` tool, with a session-start bootstrap that injects `using-superpowers` into context. There is no durable state. Subagents are spawned ad-hoc per skill (no fixed agent registry beyond one example `code-reviewer`).

These are **complementary**, not competing. GSD owns "structured work" (define → plan → execute → ship). Superpowers owns "ambient discipline" (TDD enforcement, debugging rigor, brainstorming, code review). The interesting design question is not *which spine* but *where the seam goes*.

**Recommendation: Option A — GSD spine + Superpowers skills as a first-class peer concept.** Justified in §6.

---

## 1. GSD Architecture (As-Is)

### 1.1 Top-Level Layout

```
get-shit-done/                     # The "core" — runtime-agnostic source of truth
├── workflows/      (88 files)     # Long executable Markdown — the actual logic
├── templates/      (38 files)     # Stamped into .planning/ (PROJECT.md, ROADMAP.md, etc.)
├── references/     (54 files)     # Reusable prose chunks (mandatory-initial-read, gates, etc.)
├── contexts/       (3 files)      # dev / research / review context bundles
└── bin/
    ├── gsd-tools.cjs              # ~100+ atomic CLI ops (state load, commit, find-phase…)
    └── lib/                       # core.cjs, model-profiles.cjs, install-profiles.cjs

commands/gsd/       (86 files)     # Per-runtime command shims. Each ~30 lines, points at workflows/
agents/             (33 files)     # gsd-* subagent definitions (planner, executor, verifier…)
hooks/              (11 files)     # Build artifacts; sources elsewhere; PreToolUse/PostToolUse/SessionStart
sdk/                               # @gsd-build/sdk — TypeScript "query registry" (gsd-sdk query …)
bin/install.js                     # The runtime adapter — 3000+ LOC routing to 14 runtimes
```

### 1.2 The Command-Workflow-Agent Triad

GSD has **three distinct artifact types** with strict roles:

| Layer | Files | Job | Size |
|-------|-------|-----|------|
| **Command** | `commands/gsd/*.md` | Thin entry point. Frontmatter declares allowed-tools + arg-hint. Body is `<execution_context>` references and a single line: "Execute the X workflow from @~/.claude/get-shit-done/workflows/X.md end-to-end." | ~30–80 lines |
| **Workflow** | `get-shit-done/workflows/*.md` | The actual procedure. Step-by-step orchestration prose with embedded bash, `AskUserQuestion` blocks, agent dispatch, gates, validation loops. Read by the orchestrator (main Claude session). | 200–1500 lines |
| **Agent** | `agents/gsd-*.md` | Subagent persona. Frontmatter declares tools. Body is a role + checklist + return contract. Spawned via `Task` tool with a workflow-supplied prompt. | 200–1600 lines (size-budget enforced) |

**Critical observation:** The command file is *not* the logic. It's an alias that loads the workflow + relevant references via `@~/.claude/...` includes, then says "execute that." This indirection is what makes `--minimal` mode work: the same workflow can run with or without the full agent fleet pre-installed.

### 1.3 Agent Spawn Contract

Workflows spawn subagents using Claude Code's `Task` tool with `subagent_type: "gsd-executor"` (etc.). Contracts:

- **Strict typed names.** Workflows must use exact agent type names — no falling back to `general-purpose`. The new-project workflow lists `available_agent_types` explicitly.
- **Mandatory initial read.** Agent prompts include a `<required_reading>` block. The agent MUST `Read` every listed file before any other action. Boilerplate is extracted to `references/mandatory-initial-read.md`.
- **Sandbox declarations.** `install.js` maintains `CODEX_AGENT_SANDBOX` mapping each agent to `workspace-write` or `read-only` for Codex deployments — a runtime adapter detail leaking into core.
- **Model resolution.** Each agent type resolves to a specific Claude tier (Opus/Sonnet/Haiku) via the active profile (`quality`/`balanced`/`budget`). `gsd-tools resolve-model gsd-executor` returns the model name.
- **Structured returns.** Agents return Markdown with required sections (e.g., `## RESEARCH COMPLETE` or `## RESEARCH BLOCKED`) that the orchestrator parses.
- **No commits in subagents.** Agents write artifacts; the orchestrator commits. This is enforced by convention, not tooling.

### 1.4 State Management: `.planning/` Directory

`.planning/` is the **single source of project memory.** Everything is git-trackable Markdown + JSON:

```
.planning/
├── PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, MILESTONES.md
├── config.json                    # mode, granularity, model profile, workflow toggles
├── research/                      # SUMMARY/STACK/FEATURES/ARCHITECTURE/PITFALLS
├── 01-{slug}/                     # Per-phase directories
│   ├── CONTEXT.md, RESEARCH.md, PLAN.md, SUMMARY.md, UAT.md, VERIFICATION.md
├── quick/, todos/, threads/, seeds/, backlog/
├── WAITING.json                   # Signal file: orchestrator is paused for user input
└── HANDOFF.json                   # Pause-resume state
```

Read/write conventions:
- **Workflows read & write.** They populate templates, append summaries, mutate STATE.md.
- **Agents write to their assigned slots.** `gsd-project-researcher` → `research/`. `gsd-planner` → `{phase}-PLAN.md`. `gsd-executor` → code + `{phase}-{N}-SUMMARY.md`.
- **`gsd-tools` mediates structured ops.** `state patch`, `phase complete`, `requirements mark-complete` — these encapsulate the "right way" to mutate state files. Direct edits are discouraged.
- **The SDK is the long-term replacement.** `gsd-sdk query init.new-project` returns JSON the workflow consumes; `gsd-tools.cjs` is officially deprecated in favor of `@gsd-build/sdk`. Both currently coexist.

### 1.5 Hooks

GSD's hooks are extensive and intercept five Claude Code events:

| Hook | Event | Purpose |
|------|-------|---------|
| `gsd-prompt-guard` | PreToolUse on Write to `.planning/` | Scan for prompt-injection patterns in user-supplied text |
| `gsd-read-guard`, `gsd-read-injection-scanner` | PreToolUse on Read | Block sensitive paths; scan injected file contents |
| `gsd-context-monitor` | After every turn | Track context window usage; warn near limits |
| `gsd-statusline` | Statusline | Render phase/profile/progress in status bar |
| `gsd-phase-boundary`, `gsd-session-state` | SessionStart / phase transitions | Maintain durable session state across compactions |
| `gsd-validate-commit` | PreToolUse on Bash(git commit) | Enforce atomic commit message format |
| `gsd-workflow-guard` | Various | Prevent illegal state transitions (e.g., executing without a plan) |
| `gsd-check-update` | SessionStart | Background check for new GSD versions |

Hooks are sourced in `hooks/` (TypeScript/JS) and built into `hooks/dist/` via `npm run build:hooks` before install. The installer copies them and rewrites paths to absolute (so they survive in `~/.claude/`).

### 1.6 Multi-Runtime Adapter Strategy

GSD supports **14 runtimes** through `bin/install.js` (3000+ LOC). The strategy is *one source of truth, many install layouts*:

| Runtime | Install location | Discovery mechanism | Tool mapping |
|---------|------------------|---------------------|--------------|
| Claude Code (modern) | `~/.claude/skills/gsd-*/SKILL.md` | Native skill auto-discovery | Native |
| Claude Code (legacy) | `~/.claude/commands/gsd/*.md` | Slash command | Native |
| Codex | `~/.codex/skills/gsd-*/SKILL.md` + `config.toml` agents block | Native skills + agent registry | Codex remap (no tool mapping needed for skills) |
| Gemini CLI | `~/.gemini/extensions/get-shit-done/` | Extension manifest | Gemini tool names |
| OpenCode | `~/.config/opencode/command/gsd-*.md` | Plugin/command discovery | OpenCode remap |
| Copilot CLI | `~/.github/...` + `copilot-instructions.md` injection | Marketplace plugin | Copilot remap (`Read`→`read`, `Bash`→`execute`, `Task`→`agent`, `Skill`→`skill`) |
| 8 others (Cursor, Windsurf, Kilo, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline) | Each has a directory convention | Varies — usually Markdown discovery | Varies |

**Key adapter mechanics:**
- Source workflows live in **one** location (`get-shit-done/workflows/`). The installer copies into per-runtime locations and rewrites absolute paths.
- A `.gsd-manifest.json` is written into the install dir tracking `mode` (full/minimal), version, and runtime.
- For Codex: `install.js` injects a managed block into `~/.codex/config.toml` (delimited by `# GSD Agent Configuration — managed by get-shit-done installer`). Identical pattern for Copilot's `copilot-instructions.md` (HTML comment markers).
- The tool-name mapping (`claudeToCopilotTools`) only applies to **agents**, not skills — a deliberate decision: skills use generic tool references and let runtimes resolve them.

### 1.7 SDK Layer

`sdk/` is a TypeScript package (`@gsd-build/sdk`) exposing:
- A **query registry** — workflows call `gsd-sdk query <key>` to get JSON config (e.g., `init.new-project` returns `{researcher_model, project_exists, has_codebase_map, ...}`).
- This is the *future* path: workflows shrink as the SDK grows. Today, ~50 workflow files still call `gsd-tools.cjs` directly.

---

## 2. Superpowers Architecture (As-Is)

### 2.1 Top-Level Layout

```
superpowers-main/
├── skills/             (14 skills)    # The product. Each is a directory with SKILL.md + refs/scripts
├── commands/           (3 files)      # All deprecated stubs ("use the skill instead")
├── agents/             (1 file)       # code-reviewer.md — proof-of-concept, not the system
├── hooks/
│   ├── hooks.json                     # Single SessionStart hook
│   ├── run-hook.cmd                   # Polyglot bash/cmd wrapper
│   └── session-start                  # Inject using-superpowers into first message
├── CLAUDE.md / AGENTS.md (symlink) / GEMINI.md   # Per-runtime entry points
├── .claude-plugin/plugin.json + marketplace.json # Claude Code plugin manifest
├── .codex/INSTALL.md                  # Manual symlink instructions
├── .codex-plugin/plugin.json          # Codex plugin manifest
├── .cursor-plugin/                    # Cursor plugin
├── .opencode/INSTALL.md + plugins/superpowers.js   # OpenCode plugin (JS module)
├── gemini-extension.json              # Gemini CLI extension
└── scripts/bump-version.sh, sync-to-codex-plugin.sh
```

### 2.2 The Skill as Atomic Unit

A skill is a directory: `skills/<kebab-name>/SKILL.md` plus optional `references/`, `scripts/`, `examples/`. Frontmatter is minimal:

```yaml
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---
```

The `description` field is **load-bearing**: runtimes index it as the trigger condition. A skill with `description: "Use when starting any conversation..."` auto-fires on session start. A skill with `description: "Use before writing any code"` fires when the agent intends to write code.

Skill bodies are dense behavioral prose: red-flag tables, dot-graph decision flows, "Iron Law" sections, anti-rationalization patterns. They are *prompts*, tuned through "adversarial pressure testing across multiple sessions" (per CONTRIBUTING.md). The maintainer explicitly rejects "compliance" rewrites because the wording is the eval-tuned product.

### 2.3 Skills vs Commands vs Agents in Superpowers

| Concept | Status in v5.0.7 | Notes |
|---------|------------------|-------|
| **Skills** | The system. 14 of them. | Auto-loaded via session-start bootstrap; invoked via `Skill` tool. |
| **Commands** | Deprecated. 3 files (`brainstorm.md`, `execute-plan.md`, `write-plan.md`) all say "use the skill instead." | The maintainer migrated commands → skills as the spec format matured. |
| **Agents** | One file (`code-reviewer.md`), labeled as an example. | Skills tell the main agent *how* to spawn subagents (`subagent-driven-development`, `dispatching-parallel-agents`); there's no fixed agent registry. |

**This is the critical insight:** Superpowers does not have a stable "agent type" namespace. When a skill says "dispatch a subagent," it composes the prompt inline. There's no `superpowers-debugger` agent file analogous to `gsd-debugger.md`.

### 2.4 Bootstrap Mechanism

Superpowers' magic trick is the **session-start bootstrap**. Three runtimes, three flavors, same outcome — `using-superpowers` content lands in the agent's context before any user message:

1. **Claude Code:** `hooks.json` declares a SessionStart hook (matchers `startup|clear|compact`). The bash script reads `skills/using-superpowers/SKILL.md`, JSON-escapes it, and emits `additional_context` / `additionalContext` / `hookSpecificOutput.additionalContext` — three keys for cross-runtime compat (Cursor, Claude Code, Copilot CLI).
2. **OpenCode:** `superpowers.js` is a real Node plugin. It hooks `experimental.chat.messages.transform` to prepend the bootstrap to the first user message of each session, plus `config` hook to register the skills directory path so OpenCode's native skill discovery finds it.
3. **Gemini / Codex:** A `GEMINI.md` / `AGENTS.md` symlink resolves to a file containing `@./skills/using-superpowers/SKILL.md` — these runtimes' instruction files support `@` includes.

`using-superpowers` is the policy: "If there's a 1% chance a skill applies, invoke it. This is not negotiable." That's the entire framework — once that policy is in context, the rest of the system is the skill library.

### 2.5 No Persistent State

Superpowers has **nothing analogous to `.planning/`**. No state directory. No `STATE.md`. No phase tracking. The closest thing is `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` — a convention surfaced in the `brainstorming` skill — but it's a single artifact, not a state machine.

This is a deliberate philosophy difference: GSD survives across sessions via durable artifacts; Superpowers operates entirely in-context, trusting git for memory.

### 2.6 Multi-Runtime Adapter Strategy

Superpowers takes the **opposite** approach to GSD. Instead of one installer mapping to 14 runtimes, it ships *all manifests in the repo* and lets each runtime's plugin system pull what it needs:

- `.claude-plugin/plugin.json` + `marketplace.json` for Claude Code
- `.codex-plugin/plugin.json` for Codex
- `.cursor-plugin/` for Cursor
- `.opencode/plugins/superpowers.js` (a real plugin)
- `gemini-extension.json` for Gemini CLI

**No installer.** Each runtime clones the repo (or installs via its marketplace) and reads its own manifest. Updates = `git pull` (or runtime-managed update). This works because skills are pure data — no path rewriting, no model resolution, no state migration.

---

## 3. Side-by-Side: The Conceptual Mapping

| GSD concept | Superpowers concept | Notes |
|---|---|---|
| Workflow (`workflows/new-project.md`, 1399 lines) | Skill (`brainstorming/SKILL.md`, 164 lines) | Both are executable Markdown. GSD workflows are *much* longer because they encode multi-stage orchestration. |
| Command (`commands/gsd/new-project.md`) | (No equivalent) | Superpowers skips the command shim — skills are invoked directly. |
| Agent (`agents/gsd-executor.md`, typed) | Inline subagent spawn from a skill | GSD has 33 typed agents; Superpowers has ~0 stable agent types. |
| `.planning/STATE.md` | (No equivalent) | Superpowers has no durable state. |
| `gsd-sdk query` / `gsd-tools.cjs` | (No equivalent) | Superpowers has no programmatic surface — skills *are* the surface. |
| Hooks (11, broad) | Hooks (1, narrow) | GSD intercepts everything; Superpowers intercepts session-start only. |
| `bin/install.js` (3000 LOC, 14 targets) | Per-runtime manifests in repo | Opposite philosophies. |
| `using-superpowers` SKILL | (No equivalent) | GSD has no "always-on policy" — workflow/skill descriptions are the trigger. |

**Punchline:** GSD is a **state machine with typed agents and a multi-runtime installer.** Superpowers is a **prompt library with a session-start bootstrap and per-runtime manifests.** They share Markdown-with-frontmatter as the unit, but everything else differs.

---

## 4. Hybrid Architecture Options

### Option A — GSD Spine + Superpowers Skills as a First-Class Peer

**Shape:**

```
oto/
├── oto/                              # ← was get-shit-done/
│   ├── workflows/                    # Ported GSD workflows (rebranded)
│   ├── skills/                       # ← NEW peer concept. Hosts ported Superpowers skills.
│   ├── templates/, references/, contexts/, bin/
├── commands/oto/                     # /oto-* command shims (one per workflow)
├── agents/                           # oto-executor, oto-planner, oto-debugger… (rebranded gsd-*)
├── hooks/
│   ├── (rebranded GSD hooks)
│   └── session-start-skills          # ← NEW: ports Superpowers' bootstrap, points at oto/skills/using-skills
└── bin/install.js                    # Extended GSD installer; drops 11 unwanted runtimes
```

**How the seam works:**
- **Skills bolt on without changing the workflow architecture.** Workflows continue to be the orchestration spine. Skills become an *ambient* layer the orchestrator (and subagents) can pull from via the `Skill` tool.
- **`using-skills` policy ported from Superpowers** as a SessionStart-injected bootstrap, but tuned to coexist with GSD's `mandatory-initial-read` discipline.
- **GSD agents can invoke skills.** `gsd-executor.md` (renamed `oto-executor.md`) gets a "before implementation, check for relevant skills (TDD, debugging, verification-before-completion)" clause.
- **Some Superpowers skills replace GSD references.** `verification-before-completion` skill ↔ existing `gsd-verifier` agent — pick one, demote the other.

**Pros:**
- Lowest design risk. GSD's workflow+state model is the proven backbone for a multi-month build.
- `.planning/` is preserved. Renaming to `.oto/` is mechanical.
- Multi-runtime install story already exists (`install.js`) — extend, don't rewrite.
- Skills are *additive*. Drop the bad ones, keep the good ones.
- Clear rebrand surface: workflow files, command files, agent IDs, env vars, state dir name.

**Cons:**
- Inherits GSD's installer complexity (3000-line `install.js`). That code has to be cut down (drop 11 runtimes) but not rewritten.
- Two trigger models live side-by-side: GSD's "workflow says spawn this agent" vs Superpowers' "skill auto-fires on description match." User-facing this is fine; for the rebrand pipeline it means two trigger conventions to track.
- Some Superpowers skills (e.g., `subagent-driven-development`) overlap conceptually with GSD's executor/planner. Demoting one of each pair is necessary; ducking that decision creates two ways to do the same thing.

**When to pick:** When the user already trusts GSD's planning/execution loop and wants Superpowers' discipline (TDD, debugging) to land *into* that loop without restructuring it. **This matches the user's profile.**

---

### Option B — Superpowers Skill-First + GSD Workflows Reformed as Skills

**Shape:**

```
oto/
├── skills/
│   ├── using-oto/SKILL.md            # ← Bootstrap
│   ├── new-project/SKILL.md          # ← was workflows/new-project.md (compressed)
│   ├── plan-phase/SKILL.md, execute-phase/SKILL.md, …
│   ├── tdd/SKILL.md, debugging/SKILL.md, brainstorming/SKILL.md  (from Superpowers)
│   └── … (~80 skills total, mostly former workflows)
├── commands/oto/                     # Thin /oto-* aliases that say "load skill X"
├── agents/                           # Heavily reduced — only what skills can't replace
├── .oto/                             # Optional state. Skills *can* persist here but it's not load-bearing.
└── (no separate workflows/, no SDK in v1)
```

**How the seam works:**
- The 86 GSD workflows get rewritten as skills. Long orchestrations decompose into chains: `new-project` skill invokes `research-domain` skill invokes `create-roadmap` skill, etc.
- The `Skill` tool becomes the universal dispatch. Commands become trivial.
- Durable state shrinks. PROJECT.md and ROADMAP.md remain (they're how the user steers); STATE.md and the per-phase artifacts may or may not survive depending on whether skills can be made stateful enough.

**Pros:**
- Aligns with Anthropic's direction (Claude Code 2.1.88+ ships skills as first-class).
- Fewer concepts: skill, command-as-alias, agent. Cleaner mental model.
- Auto-discovery of "relevant capability" via skill descriptions is genuinely powerful for ambient work.

**Cons:**
- **Massive design effort.** 86 workflows × decomposition ≠ trivial. Each workflow must be split into composable skills without losing the orchestration semantics that make GSD reliable.
- **GSD's eval-tuned prompts get blendered.** The wording in `workflows/new-project.md` was tuned over ~40 versions. Refactoring it into 5–10 sub-skills risks regressions that won't surface until you use them in anger.
- **State management gets harder, not easier.** Skills are stateless by default. Reintroducing `.oto/STATE.md` semantics inside a skill-first model is awkward — skills need to know when to read/write what.
- **Rebrand pipeline is nightmarish.** Tracking upstream GSD changes when you've structurally re-decomposed every workflow means manual diff-and-port forever. Defeats the user's "automated rebrand" goal.

**When to pick:** When you're starting a framework from scratch, want maximum fidelity to Anthropic's skills paradigm, and have months of design budget. **Wrong fit for this project** because of the rebrand-pipeline cost.

---

### Option C — Two-Tier: GSD for "Structured Work", Superpowers for "Ambient Work"

**Shape:**

```
oto/
├── oto/                              # ← GSD spine, untouched architecturally
│   ├── workflows/, templates/, references/, contexts/, bin/
├── oto-skills/                       # ← Superpowers' skills/, untouched
│   └── (14 skills — TDD, debugging, brainstorming, etc.)
├── commands/oto/                     # /oto-* shims for workflows AND for the skills that need slash invocation
├── agents/                           # GSD agents (rebranded)
├── hooks/                            # Both GSD's hook fleet AND Superpowers' SessionStart bootstrap
└── bin/install.js                    # Installs both trees, rebrands paths in both
```

**How the seam works:**
- The two systems remain **architecturally separate.** No mixing. Workflows don't reach into skills; skills don't reach into `.planning/`.
- Skills auto-fire on their descriptions; workflows fire on `/oto-*` commands.
- The user gets: structured planning via `/oto-new-project` etc., and ambient discipline (TDD enforcement, debugging, brainstorming) via auto-firing skills.

**Pros:**
- **Clean conceptual separation.** Easy to explain: "workflows = explicit, skills = ambient."
- **Easiest rebrand pipeline.** Each tree tracks its upstream independently. No cross-tree refactoring on upstream pulls.
- **Lowest integration testing burden** — the two systems don't interact much.

**Cons:**
- **No synergy.** The whole point of merging is that GSD's executor benefits from TDD discipline. If they don't talk to each other, you've just installed two frameworks side-by-side with a unified prefix — which is already possible today by installing both.
- **Two state models.** GSD has `.planning/`; Superpowers has nothing. Where do shared concerns (e.g., "current branch", "current phase") live? Not naturally answered.
- **Two trigger conventions surface to the user as inconsistency.** Some `/oto-*` commands gate on planning artifacts; some skills auto-fire regardless of project state. New-user confusion.

**When to pick:** When the user explicitly does not want the two systems to interact, or when the rebrand pipeline cost dominates everything else.

---

### Option D — Skills as the Universal Substrate, Workflows as Skill Compositions (Hybrid Variant)

**Shape:** Like Option B, but workflows survive as **first-class artifacts** that *contain* skill invocations rather than being rewritten as skills. The `Skill` tool is the universal dispatch; workflows are the only things that compose multiple skills into a multi-stage flow.

Considered and rejected: this is Option A under a different name. The key load-bearing decision in any hybrid is "does GSD's workflow survive as a primitive or does it dissolve into skills?" — Option A says yes, Option B says no, Option D is the same yes as Option A with extra branding.

---

## 5. Recommendation: **Option A**

**Pick Option A: GSD spine + Superpowers skills as a first-class peer.**

### Justification (against the four user constraints)

| Constraint | Why Option A wins |
|------------|-------------------|
| **Production-grade personal use** | GSD's `.planning/` + state machine + typed agents survives compactions, restarts, and multi-day work. Superpowers alone doesn't. Option A keeps the durable backbone. |
| **Multi-runtime (Claude / Codex / Gemini)** | GSD's `install.js` already routes to all three (and 11 more we're dropping). Option B would force re-deriving runtime adapters from scratch. Option A inherits a working installer to trim. |
| **Automated rebrand pipeline** | The rebrand surface in Option A is mechanical: `s/gsd/oto/g` across filenames, `s/\.planning/\.oto/g` across content, `s/\/gsd-/\/oto-/g` for command prefixes. A scripted rename map handles ~95% of it. Option B requires structural decomposition that no rename script can do — kills automated upstream tracking. |
| **Single developer, no enterprise theater** | Option A keeps the single mental model the user is already proficient in (GSD's discuss → plan → execute → ship), then adds skills as ambient amplifiers. No retraining cost. |

### What "skills as a first-class peer" means concretely

1. **`oto/skills/` is a top-level directory under `oto/` (the renamed `get-shit-done/`).** Same level as `workflows/`, `templates/`, `references/`. Hosts ported Superpowers skills.
2. **Skills install into the runtime's native skills directory** (`~/.claude/skills/oto/<skill>/SKILL.md`, `~/.codex/skills/oto/<skill>/SKILL.md`). The installer handles this — same code path GSD already uses for its 86 workflow-skills in modern Claude Code.
3. **Workflows can `Skill`-invoke and so can subagents.** `oto-executor` agent's prompt gains: "Before writing code, check for `tdd` and `verification-before-completion` skills."
4. **`using-oto` skill = the merged bootstrap.** Replace Superpowers' "use a skill on 1% suspicion" with a tuned-for-oto version that says "if you're inside a workflow, follow the workflow first; outside a workflow, skills auto-fire."
5. **Drop conflicting Superpowers skills.** `subagent-driven-development`, `dispatching-parallel-agents`, `executing-plans`, `writing-plans`, `requesting-code-review`, `finishing-a-development-branch` — these duplicate GSD's executor/planner/reviewer/ship pipeline. **Keep:** `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `brainstorming`, `using-git-worktrees`, `writing-skills`, `using-superpowers` (renamed `using-oto`). That's 7 of 14.
6. **Drop Superpowers' `code-reviewer` agent** in favor of GSD's `gsd-code-reviewer`. One reviewer agent, not two.

---

## 6. Component Boundaries (oto, named)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME LAYER (per-runtime)                      │
│                                                                          │
│  Claude Code             Codex CLI               Gemini CLI              │
│  ~/.claude/skills/oto/   ~/.codex/skills/oto/    ~/.gemini/extensions/   │
│  + commands/oto/         + AGENTS.md block       + GEMINI.md include     │
│  + hooks (.json)         + config.toml block     + extension manifest    │
└────────────┬────────────────────┬─────────────────────┬─────────────────┘
             │                    │                     │
             └────────────────────┴─────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          INSTALLER (oto-cli)                             │
│                                                                          │
│  oto/bin/install.js — trimmed fork of GSD's installer                    │
│  - 3 targets only (Claude / Codex / Gemini)                              │
│  - Reads from oto/ source tree, writes to runtime layer                  │
│  - Path rewriting, hook compilation, agent sandbox config                │
│                                                                          │
│  oto/bin/oto-sdk — query registry (renamed gsd-sdk)                      │
│  - Workflows call: oto-sdk query <key>  → JSON                           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CORE: oto/ source tree                            │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ workflows/   │  │ skills/      │  │ templates/   │                   │
│  │ (orchestra-  │  │ (ported      │  │ (.oto/       │                   │
│  │  tion logic) │  │  Superpowers │  │  artifacts)  │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘                   │
│         │                 │                                              │
│         │ spawns          │ invoked-on-suspicion                         │
│         ▼                 ▼                                              │
│  ┌──────────────┐  ┌──────────────┐                                     │
│  │ agents/      │  │ references/  │                                     │
│  │ (oto-*       │  │ (shared      │                                     │
│  │  subagents)  │  │  prose)      │                                     │
│  └──────────────┘  └──────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STATE: .oto/ (per-project)                             │
│                                                                          │
│  PROJECT.md  REQUIREMENTS.md  ROADMAP.md  STATE.md  config.json          │
│  research/   {NN}-{slug}/     quick/      todos/    threads/             │
│  WAITING.json  HANDOFF.json   (signal files for orchestrator)            │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              REBRAND PIPELINE (oto/scripts/sync-upstream/)               │
│                                                                          │
│  - pull-gsd:     git fetch upstream/get-shit-done, apply rename-map      │
│  - pull-spw:     git fetch upstream/superpowers, apply rename-map        │
│  - rename-map:   gsd→oto, .planning→.oto, /gsd-→/oto-, gsd_→oto_ etc.   │
│  - conflict-report: surface manual-review files (rebranded code that    │
│                     diverged from upstream structure)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Named Components

| Component | Owns | Talks to |
|-----------|------|----------|
| **oto-installer** (`bin/install.js`, trimmed) | Layout per runtime, hook compilation, agent sandbox config, manifest writing | File system; no runtime communication |
| **oto-sdk** (`bin/oto-sdk`) | The query registry — JSON answers to workflow/agent queries | Reads `.oto/` state; called by workflows + agents |
| **oto-tools** (`oto/bin/oto-tools.cjs`) | Atomic state ops (state patch, phase complete, commit) | Reads/writes `.oto/`; deprecated path, migrate to oto-sdk |
| **oto-orchestrator** (the main Claude session executing a workflow) | Workflow step execution, agent dispatch, user interaction | Reads workflows; spawns agents via Task; reads/writes `.oto/`; invokes Skills |
| **oto-agents** (33 typed subagents) | Specialized work (research, plan, execute, verify, debug, …) | Receive prompt from orchestrator; write to `.oto/`; return structured Markdown |
| **oto-skills** (~7 ported + future custom) | Ambient discipline (TDD, debugging, brainstorming, verification, worktrees) | Invoked via Skill tool; no state ownership |
| **oto-hooks** | Cross-cutting concerns (context monitoring, prompt-injection scanning, statusline, session-start bootstrap) | Run on Claude Code lifecycle events |
| **rebrand-pipeline** (`oto/scripts/sync-upstream/`) | Pulling upstream GSD/Superpowers, applying rename-map, conflict-reporting | Git, file system, no runtime involvement |

---

## 7. Data Flow

### Primary Flow: User runs `/oto-execute-phase 1`

```
User
 │  /oto-execute-phase 1
 ▼
[oto-orchestrator] (main Claude session)
 │
 │  1. Loads commands/oto/execute-phase.md
 │  2. Loads oto/workflows/execute-phase.md (via @ include)
 │  3. Calls: oto-sdk query phase-state --phase 1     ──┐
 │                                                      ▼
 │                                            ┌──────────────────┐
 │                                            │  .oto/STATE.md   │
 │                                            │  .oto/01-*/PLAN.md│
 │                                            └──────────────────┘
 │  4. Workflow says: "spawn oto-executor for each plan in wave 1"
 │
 ├──spawn──► [oto-executor] (subagent, fresh 200K context)
 │              │  Reads PLAN.md (mandatory-initial-read)
 │              │  Workflow prompt says: "before code, check Skill tdd"
 │              ├──Skill──► [tdd skill loaded into executor's context]
 │              │              Returns: "RED-GREEN-REFACTOR; write failing test first"
 │              │  Implements task
 │              │  Writes code, writes .oto/01-01-SUMMARY.md
 │              │  Returns: "## EXECUTION COMPLETE\n..."
 │              ▼
 │  5. Orchestrator parses returns, commits via oto-tools
 │  6. Calls: oto-tools commit "feat(01-01): ..."     ──┐
 │                                                       ▼
 │                                            ┌──────────────────┐
 │                                            │     git repo     │
 │                                            └──────────────────┘
 │  7. Loop wave 2, wave 3, …
 │  8. Spawn oto-verifier; produce VERIFICATION.md
 │  9. Update STATE.md, ROADMAP.md
 ▼
User sees: "Phase 1 complete. Run /oto-verify-work 1 next."
```

### Ambient Flow: User says "fix this bug" outside a workflow

```
User
 │  "fix this bug — login throws 500"
 ▼
[Main Claude session]
 │
 │  SessionStart hook already injected `using-oto` skill into context.
 │  using-oto says: "If 1% chance a skill applies, invoke it."
 │
 ├──Skill──► [systematic-debugging]
 │              Returns: "4-phase root cause process; gather symptoms first"
 │
 │  Agent follows the skill, gathers logs, isolates failure
 │  Identifies fix
 │
 ├──Skill──► [tdd]
 │              "write failing test first"
 │  Writes test, watches it fail
 │
 ├──Skill──► [verification-before-completion]
 │              "evidence over claims; actually run the test"
 │  Runs the test, sees green
 │  Reports to user with evidence
 ▼
User sees fix + passing test
```

### Rebrand Pipeline Flow: `oto-sync upstream-gsd`

```
[oto/scripts/sync-upstream/pull-gsd]
 │
 │  1. git fetch upstream-gsd  → reads new commits
 │  2. For each changed file:
 │       Apply rename-map (gsd→oto, /gsd-→/oto-, .planning→.oto, etc.)
 │       Diff against current oto/ tree
 │     ├── If clean apply → write to oto/, queue for review
 │     └── If conflict   → emit to .oto-sync-conflicts/<path>.md
 │  3. Generate REPORT.md: clean N, conflicts M, files-touched K
 │  4. User reviews, resolves conflicts manually, commits
 ▼
git commit "sync: GSD vX.Y → oto"
```

---

## 8. Build Order Implications (Phase Sequencing)

Given Option A, the natural phase order:

| Phase | Name | Why this order |
|-------|------|---------------|
| **0** | **Inventory & rename map** | Before any code: list every file in both upstreams, classify (keep/drop/merge), produce the canonical `rename-map.json`. This is the input to everything downstream. |
| **1** | **Installer fork & runtime trim** | Fork `bin/install.js`, drop 11 unwanted runtimes (keep Claude/Codex/Gemini), rebrand paths and identifiers. Validate: `oto-cli --claude --local` produces a non-empty `.claude/` dir. |
| **2** | **Core port (workflows + agents + templates + hooks)** | Apply rename-map to `get-shit-done/`, `agents/`, `commands/gsd/`, `hooks/`, `sdk/`. Validate: `/oto-help` works, `/oto-new-project` initializes a `.oto/` directory. |
| **3** | **Skills port (Superpowers subset)** | Add `oto/skills/` with 7 selected skills, port `using-superpowers` → `using-oto` bootstrap, install hook for SessionStart injection. Validate: typing nothing fires `using-oto` policy on session start; "fix this bug" auto-invokes `systematic-debugging`. |
| **4** | **Cross-system integration** | Update `oto-executor` to invoke `tdd` skill before writing code; update `oto-verifier` to invoke `verification-before-completion`; resolve conceptual overlaps. Validate: end-to-end `/oto-new-project` → `/oto-execute-phase` produces TDD-shaped commits. |
| **5** | **Rebrand pipeline** | Build `oto/scripts/sync-upstream/`. Pull both upstreams, apply rename-map, surface conflicts. Validate against a known upstream commit: changes apply cleanly to `oto/` tree. |
| **6** | **Tests & CI** | Port GSD's test suite (substantial — 300+ test files), add tests for skill installation, add tests for the rebrand pipeline (snapshot-based: known upstream → expected oto output). |
| **7** | **Documentation & polish** | README, install guide, command reference, contribution + upstream-sync guide, changelog policy. |

**Critical ordering constraint:** Phase 0 (rename map) must complete before Phase 1, and Phase 1 (installer trim) must work before Phase 2 (core port) — without an installer, you can't validate the port at the end of Phase 2. Skills (Phase 3) come after the GSD spine works because they layer onto a working system rather than being load-bearing for `/oto-*` commands.

**Phases 1-2 can be one branch** if the rename map is solid; splitting them is hedging. Phases 3-4 are separable: skills installed but not invoked from agents (Phase 3) is a working state; cross-invocation (Phase 4) is the synergy step.

---

## 9. Anti-Patterns (oto-specific)

### Anti-Pattern 1: Re-decomposing GSD workflows into skills

**What people do:** "Skills are the future of Claude Code, let's rewrite GSD's workflows as compositions of skills."
**Why it's wrong:** GSD workflows are eval-tuned multi-stage prose. Decomposition loses the orchestration semantics. Breaks the rebrand pipeline (no clean diff against upstream).
**Do this instead:** Treat workflows and skills as different primitives. Workflows orchestrate; skills add ambient discipline.

### Anti-Pattern 2: Two equivalent ways to do code review (or planning, or debugging)

**What people do:** Keep both `gsd-code-reviewer` agent and Superpowers' `requesting-code-review` skill, "let the user pick."
**Why it's wrong:** Two paths means two sets of bugs, two test surfaces, two upstream-sync reconciliations forever. User-facing inconsistency.
**Do this instead:** For each conceptual overlap, pick one. Document the choice in `.oto-sync/decisions.md` so future upstream pulls don't accidentally reintroduce the dropped one.

### Anti-Pattern 3: Manual rebrand commits

**What people do:** Pull upstream changes, run rename, manually fix what looks wrong, commit "sync: upstream changes."
**Why it's wrong:** Doesn't compose. Within 3 syncs the rename map drifts from reality and the next sync breaks.
**Do this instead:** All rebrand decisions live in `rename-map.json` and `.oto-sync/decisions.md`. If a new upstream change requires manual handling, update the rename map first, then rerun the sync. The script is the source of truth.

### Anti-Pattern 4: Carrying GSD's full agent fleet without trimming

**What people do:** Port all 33 agents because they're all "useful sometimes."
**Why it's wrong:** Cold-start system-prompt overhead grows with each agent description (GSD's own `--minimal` mode exists exactly because of this). For personal use, half the agents will never fire.
**Do this instead:** Audit which agents actually run in user's typical flow. Demote rarely-used agents into "load on demand" via SDK queries rather than registering them globally.

### Anti-Pattern 5: Letting hooks proliferate

**What people do:** Keep all 11 GSD hooks plus add Superpowers' SessionStart bootstrap → 12 hooks.
**Why it's wrong:** Hooks are silent. When one breaks (e.g., `gsd-context-monitor` after a Claude Code update), debugging requires runtime-specific knowledge.
**Do this instead:** Audit each hook's value. Keep the ones the user has actually leaned on (statusline, session-state, the new SessionStart bootstrap). Demote read-guards / injection-scanners to opt-in if the user doesn't ingest external prose into `.oto/`.

---

## 10. Integration Points

### External Services / Runtimes

| Runtime | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude Code | `~/.claude/skills/oto/<skill>/` (modern) + `~/.claude/commands/oto/` (commands) + `~/.claude/agents/oto-*.md` + `~/.claude/hooks.json` | Native skill discovery + slash commands + plugin marketplace optional |
| Codex CLI | `~/.codex/skills/oto/` + managed block in `~/.codex/config.toml` for agents | Same skill format as Claude Code; agent sandbox declared in config.toml |
| Gemini CLI | `~/.gemini/extensions/oto/` with extension manifest + `GEMINI.md` include | Gemini's `activate_skill` tool replaces Skill; tool name remap loaded via GEMINI.md |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| orchestrator ↔ subagent | Task tool (Claude Code), structured Markdown returns | Strict typed agent names; no fallback to general-purpose |
| subagent ↔ skill | Skill tool (loaded into the subagent's own context) | One-shot — skill content lands inline, no skill ↔ skill protocol |
| workflow ↔ state | `oto-sdk query` (read), `oto-tools` (write) | Plus direct file writes for templated artifacts (PROJECT.md, ROADMAP.md) |
| installer ↔ runtime | File system writes only — no IPC | Each runtime's own discovery picks up the files |
| upstream sync ↔ tree | `git fetch` + scripted rename — never direct merge | Conflicts surfaced as files in `.oto-sync-conflicts/` for manual review |

---

## Sources

- Direct source inspection: `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/get-shit-done-main/` (GSD v1.38.5)
- Direct source inspection: `/Users/Julian/Desktop/oto-hybrid-framework/foundation-frameworks/superpowers-main/` (Superpowers v5.0.7)
- GSD README, package.json, install.js (top 200 lines), `get-shit-done/bin/gsd-tools.cjs`, `workflows/new-project.md`, `commands/gsd/new-project.md`, `agents/gsd-project-researcher.md`
- Superpowers README, CLAUDE.md, AGENTS.md, GEMINI.md, `skills/using-superpowers/SKILL.md`, `skills/brainstorming/SKILL.md`, `skills/test-driven-development/SKILL.md`, `.opencode/plugins/superpowers.js`, `hooks/session-start`, `hooks/hooks.json`, `.claude-plugin/plugin.json`, `commands/brainstorm.md`, `agents/code-reviewer.md`
- `.planning/PROJECT.md` for user constraints

---
*Architecture research for: oto hybrid AI-CLI framework*
*Researched: 2026-04-27*
