# Feature Research — oto Hybrid Framework

**Domain:** Personal AI-CLI dev framework (GSD + Superpowers fusion)
**Researched:** 2026-04-27
**Confidence:** HIGH (direct source inspection of both repos at `foundation-frameworks/`)
**Sources:** GSD v1.38.5 source, Superpowers v5.0.7 source

---

## How To Read This Document

1. **Section 1** — Full GSD inventory (commands, agents, workflows, hooks, SDK)
2. **Section 2** — Full Superpowers inventory (skills, commands, agents, hooks, runtime files)
3. **Section 3** — Combined feature set categorised: table stakes / differentiators / overlapping / anti-features
4. **Section 4** — Overlap-resolution table — concrete merge recommendation per overlapping pair
5. **Section 5** — Implications for oto requirements

User question framing: GSD's command/workflow appeal is *core*; Superpowers' value is *to-be-determined*. The overlap analysis in Section 4 is the most important part of this document — it tells the user where Superpowers actually adds something GSD lacks vs. where it duplicates GSD with a different shape.

---

## 1. GSD Inventory

### 1.1 Slash Commands (89 total)

GSD's surface is *enormous*. Grouped by purpose. Every command is a `.md` file in `commands/gsd/` that becomes a `/gsd-*` skill at install time.

#### Core Workflow (the "spine")

| Command | One-liner |
|---------|-----------|
| `/gsd-new-project` | Initialize a new project: deep questions → research → requirements → roadmap |
| `/gsd-new-milestone` | Start a new milestone cycle on an existing project |
| `/gsd-discuss-phase` | Adaptive Q&A to gather phase context before planning (CONTEXT.md) |
| `/gsd-plan-phase` | Research + plan + verification loop for one phase (PLAN.md, RESEARCH.md) |
| `/gsd-execute-phase` | Run all plans in a phase with wave-based parallelization |
| `/gsd-verify-work` | Conversational UAT — manual user-acceptance testing |
| `/gsd-ship` | Create PR from verified phase work with auto-generated body |
| `/gsd-next` | Auto-advance to the next logical workflow step |
| `/gsd-progress` | "Where am I, what's next" status |
| `/gsd-autonomous` | Run all remaining phases unattended (discuss→plan→execute per phase) |
| `/gsd-fast` | Inline trivial task — no subagents, no planning |
| `/gsd-quick` | Ad-hoc task with GSD guarantees but skip optional agents (composable: `--discuss --research --validate --full`) |
| `/gsd-do` | Route freeform text to the right GSD command automatically |

#### Spec, Research, Discuss Variants

| Command | One-liner |
|---------|-----------|
| `/gsd-spec-phase` | Socratic spec refinement before discuss-phase (falsifiable WHATs locked first) |
| `/gsd-discovery-phase` | Earlier-stage scoping (precedes spec/discuss) |
| `/gsd-discuss-phase-assumptions` | Codebase-first variant — surface assumptions instead of asking |
| `/gsd-discuss-phase-power` | Bulk question generation into a file-based UI |
| `/gsd-research-phase` | Standalone research (usually rolled into plan-phase) |
| `/gsd-list-phase-assumptions` | Surface assumptions before planning |
| `/gsd-explore` | Socratic ideation / idea routing |

#### Spike & Sketch (throwaway exploration)

| Command | One-liner |
|---------|-----------|
| `/gsd-spike` | Run 2–5 focused experiments with Given/When/Then verdicts |
| `/gsd-spike-wrap-up` | Package spike findings into a project-local skill |
| `/gsd-sketch` | Generate 2–3 interactive HTML mockup variants for a design question |
| `/gsd-sketch-wrap-up` | Package sketch design findings into a project-local skill |

#### UI / Design

| Command | One-liner |
|---------|-----------|
| `/gsd-ui-phase` | Generate UI design contract (UI-SPEC.md) for a frontend phase |
| `/gsd-ui-review` | Retroactive 6-pillar visual audit of implemented frontend code |

#### AI/LLM Integration

| Command | One-liner |
|---------|-----------|
| `/gsd-ai-integration-phase` | AI-SPEC.md — framework selection, eval strategy, monitoring |
| `/gsd-eval-review` | Retroactive eval-coverage audit on an implemented AI phase |

#### Code Quality

| Command | One-liner |
|---------|-----------|
| `/gsd-code-review` | Review changed files for bugs/security/quality (severity-classified REVIEW.md) |
| `/gsd-code-review-fix` | Auto-fix issues from REVIEW.md, atomic commits |
| `/gsd-review` | Cross-AI peer review of plans via external CLIs |
| `/gsd-plan-review-convergence` | Replan loop using cross-AI review feedback (max 3 cycles) |
| `/gsd-secure-phase` | Threat-model-anchored security verification |
| `/gsd-debug` | Systematic debugging with persistent state across context resets |
| `/gsd-add-tests` | Generate tests for a completed phase from UAT criteria |
| `/gsd-validate-phase` | Nyquist validation gap-fill (test-coverage audit) |
| `/gsd-audit-fix` | Autonomous audit-to-fix pipeline |
| `/gsd-diagnose-issues` | (workflow-only) issue diagnosis |
| `/gsd-undo` | Safe git revert using phase manifest with dependency checks |

#### Roadmap & Phase Management

| Command | One-liner |
|---------|-----------|
| `/gsd-add-phase` | Append phase to current milestone |
| `/gsd-insert-phase` | Insert urgent decimal phase between two existing |
| `/gsd-remove-phase` | Remove future phase, renumber |
| `/gsd-edit-phase` | Edit any field of an existing phase in place |
| `/gsd-analyze-dependencies` | Suggest "Depends on" entries for ROADMAP |
| `/gsd-plan-milestone-gaps` | Create phases to close audit gaps |
| `/gsd-audit-milestone` | Verify milestone hit its definition-of-done |
| `/gsd-complete-milestone` | Archive milestone, tag release |
| `/gsd-milestone-summary` | Comprehensive project summary for onboarding |
| `/gsd-extract_learnings` | Extract decisions/lessons/patterns from completed phase |
| `/gsd-graduation` | Cross-phase LEARNINGS.md graduation helper |
| `/gsd-transition` | Phase transition state-update routine |
| `/gsd-ultraplan-phase` | [BETA] Offload planning to Claude Code's ultraplan cloud |

#### Brownfield / Codebase Intelligence

| Command | One-liner |
|---------|-----------|
| `/gsd-map-codebase` | Parallel mappers produce `.planning/codebase/` documents |
| `/gsd-scan` | Lightweight rapid alternative to `map-codebase` |
| `/gsd-ingest-docs` | Classify/synthesize ADRs/PRDs/SPECs/DOCs into `.planning/` |
| `/gsd-import` | Ingest external plans with conflict detection |
| `/gsd-from-gsd2` | Import GSD-2 (`.gsd/`) project back to v1 (`.planning/`) format |
| `/gsd-graphify` | Build/query/inspect project knowledge graph in `.planning/graphs/` |
| `/gsd-intel` | Query/inspect/refresh codebase intelligence in `.planning/intel/` |

#### Workspaces & Workstreams

| Command | One-liner |
|---------|-----------|
| `/gsd-new-workspace` | Isolated workspace with repo copies (worktrees or clones) |
| `/gsd-list-workspaces` | Show all GSD workspaces and status |
| `/gsd-remove-workspace` | Remove workspace, clean up worktrees |
| `/gsd-workstreams` | Manage parallel workstreams (list/create/switch/status/complete) |

#### Backlog, Threads, Notes

| Command | One-liner |
|---------|-----------|
| `/gsd-add-backlog` | Add idea to 999.x backlog parking lot |
| `/gsd-review-backlog` | Promote/remove backlog items |
| `/gsd-plant-seed` | Capture forward-looking idea with trigger conditions |
| `/gsd-thread` | Persistent context threads for cross-session work |
| `/gsd-add-todo` | Capture todo from current conversation |
| `/gsd-check-todos` | List pending todos, pick one |
| `/gsd-note` | Zero-friction idea capture (append/list/promote) |
| `/gsd-inbox` | Triage GitHub issues/PRs against project templates |

#### Session & Recovery

| Command | One-liner |
|---------|-----------|
| `/gsd-pause-work` | Write HANDOFF.json when stopping mid-phase |
| `/gsd-resume-work` | Restore from last session |
| `/gsd-resume-project` | (workflow-only) project-level resume |
| `/gsd-session-report` | Session summary with token estimates and outcomes |
| `/gsd-forensics` | Post-mortem on failed workflow runs |
| `/gsd-health` | Validate `.planning/` integrity, optional auto-repair |
| `/gsd-reapply-patches` | Reapply local mods after a GSD update |
| `/gsd-cleanup` | Archive completed-milestone phase directories |
| `/gsd-node-repair` | Fix corrupted Node install state |

#### Configuration & Meta

| Command | One-liner |
|---------|-----------|
| `/gsd-settings` | Configure model profile + workflow agents |
| `/gsd-settings-advanced` | Power-user knobs (timeouts, branch templates, cross-AI exec) |
| `/gsd-settings-integrations` | API keys, code-review CLI routing, agent-skill injection |
| `/gsd-set-profile` | Switch model profile (quality/balanced/budget/inherit) |
| `/gsd-profile-user` | Generate developer behavioral profile from session analysis |
| `/gsd-help` | Show all commands and usage guide |
| `/gsd-update` | Update GSD with changelog preview |
| `/gsd-stats` | Project stats — phases, plans, requirements, git metrics |
| `/gsd-manager` | Interactive command center for managing multiple phases |
| `/gsd-pr-branch` | Filter `.planning/` commits to produce a clean PR branch |
| `/gsd-audit-uat` | Cross-phase verification-debt audit |
| `/gsd-docs-update` | Verified doc generation with writer + verifier agents |
| `/gsd-sync-skills` | Sync managed GSD skills across runtime roots |
| `/gsd-join-discord` | Join GSD Discord (anti-feature for oto — see §3) |

### 1.2 Subagents (33 total in `agents/`)

| Agent | Spawned by | Role |
|-------|-----------|------|
| `gsd-project-researcher` | `/gsd-new-project`, `/gsd-new-milestone` | Domain ecosystem research → research files |
| `gsd-research-synthesizer` | `/gsd-new-project` | Synthesizes 4 parallel researchers into SUMMARY.md |
| `gsd-roadmapper` | `/gsd-new-project` | Creates roadmap with phase breakdown + requirement mapping |
| `gsd-phase-researcher` | `/gsd-plan-phase` | Per-phase implementation research → RESEARCH.md |
| `gsd-pattern-mapper` | `/gsd-plan-phase` | Maps new files to closest existing analogs |
| `gsd-planner` | `/gsd-plan-phase` | Creates executable plans with task/dep breakdown |
| `gsd-plan-checker` | `/gsd-plan-phase` | Goal-backward plan-quality verification before execution |
| `gsd-executor` | `/gsd-execute-phase` | Executes plans w/ atomic commits and checkpoints |
| `gsd-verifier` | `/gsd-execute-phase` | Goal-backward verification — codebase delivers what phase promised |
| `gsd-integration-checker` | execute/verify | Cross-phase integration & E2E flow check |
| `gsd-code-reviewer` | `/gsd-code-review` | Severity-classified REVIEW.md |
| `gsd-code-fixer` | `/gsd-code-review-fix` | Applies fixes atomically |
| `gsd-debugger` | `/gsd-debug` | Scientific-method bug investigation |
| `gsd-debug-session-manager` | `/gsd-debug` | Multi-cycle debug checkpoint loop |
| `gsd-codebase-mapper` | `/gsd-map-codebase` | Focus-area codebase analysis (tech/arch/quality/concerns) |
| `gsd-intel-updater` | intel pipeline | Writes structured intel files |
| `gsd-doc-classifier` | `/gsd-ingest-docs` | Classifies a doc as ADR/PRD/SPEC/DOC/UNKNOWN |
| `gsd-doc-synthesizer` | `/gsd-ingest-docs` | Consolidates classified docs + conflict report |
| `gsd-doc-writer` | `/gsd-docs-update` | Writes/updates project docs |
| `gsd-doc-verifier` | `/gsd-docs-update` | Verifies factual claims vs codebase |
| `gsd-security-auditor` | `/gsd-secure-phase` | Verifies threat mitigations from PLAN threat model |
| `gsd-nyquist-auditor` | `/gsd-validate-phase` | Fills validation gaps via test-coverage audit |
| `gsd-eval-planner` | `/gsd-ai-integration-phase` | AI eval strategy + rubrics |
| `gsd-eval-auditor` | `/gsd-eval-review` | Retroactive AI eval-coverage scoring |
| `gsd-ai-researcher` | `/gsd-ai-integration-phase` | AI-framework docs research |
| `gsd-domain-researcher` | `/gsd-ai-integration-phase` | Business-domain research for AI eval criteria |
| `gsd-framework-selector` | AI integration | Interactive framework decision matrix |
| `gsd-advisor-researcher` | `/gsd-discuss-phase` (advisor mode) | Single gray-area decision research |
| `gsd-assumptions-analyzer` | `/gsd-discuss-phase` (assumptions mode) | Codebase-evidence-backed assumptions |
| `gsd-ui-researcher` | `/gsd-ui-phase` | UI-SPEC.md design contract |
| `gsd-ui-checker` | `/gsd-ui-phase` | UI-SPEC vs 6-pillar quality dimensions |
| `gsd-ui-auditor` | `/gsd-ui-review` | Retroactive 6-pillar visual audit |
| `gsd-user-profiler` | `/gsd-profile-user` | 8-dimension developer behavioral profile |

### 1.3 Workflows (`get-shit-done/workflows/`)

84 workflow `.md` files. These are the implementations behind commands — most are 1:1 with a `commands/gsd/<x>.md` (the command is a thin invocation, the workflow holds the actual logic). Notable workflow-only entries (no matching `commands/gsd/`): `diagnose-issues`, `discovery-phase`, `execute-plan`, `graduation`, `node-repair`, `resume-project`, `transition`, `verify-phase`. The split commands→workflows is GSD's "thin orchestrator, fat workflow doc" pattern.

### 1.4 Reference Documents (`get-shit-done/references/`, 50+ files)

Shared context fragments injected into agent prompts. Categories:
- **Thinking models** per phase: `thinking-models-{research,planning,execution,verification,debug}.md`
- **Anti-patterns**: `planner-antipatterns.md`, `universal-anti-patterns.md`
- **Domain probes**: `domain-probes.md`, `common-bug-patterns.md`
- **Engineering**: `tdd.md`, `gates.md`, `git-integration.md`, `git-planning-commit.md`, `revision-loop.md`
- **Bootstrap glue**: `mandatory-initial-read.md`, `project-skills-discovery.md`
- **Domain-specific**: `ios-scaffold.md`, `ai-evals.md`, `ai-frameworks.md`, `sketch-*` (4 files), `ui-brand.md`
- **Operational**: `model-profiles.md`, `model-profile-resolution.md`, `context-budget.md`, `checkpoints.md`, `phase-argument-parsing.md`, `decimal-phase-calculation.md`, `workstream-flag.md`

### 1.5 Templates (`get-shit-done/templates/`)

35+ markdown templates: `project.md`, `requirements.md`, `roadmap.md`, `state.md`, `phase-prompt.md`, `discussion-log.md`, `summary-{minimal,standard,complex}.md`, `verification-report.md`, `UAT.md`, `UI-SPEC.md`, `AI-SPEC.md`, `SECURITY.md`, `DEBUG.md`, `VALIDATION.md`, `milestone.md`, `milestone-archive.md`, `retrospective.md`, plus subdirs `codebase/` and `research-project/` (with FEATURES/STACK/ARCHITECTURE/PITFALLS/SUMMARY).

### 1.6 Hooks (`hooks/`, 11 files)

| Hook | Type | Purpose |
|------|------|---------|
| `gsd-check-update.js` + `-worker.js` | SessionStart | Background update check, write to cache |
| `gsd-context-monitor.js` | PostToolUse | Reads statusline metrics, injects context-usage warnings to agent |
| `gsd-statusline.js` | Statusline | Renders model / current task / dir / context% in Claude Code statusline |
| `gsd-session-state.sh` | SessionStart | Inject project state reminder |
| `gsd-prompt-guard.js` | PreToolUse | Scan `.planning/` writes for prompt-injection patterns (advisory) |
| `gsd-read-guard.js` | PreToolUse | Nudge non-Claude models to Read-before-Write existing files |
| `gsd-read-injection-scanner.js` | PostToolUse | Scan Read-tool output for injection patterns at ingestion |
| `gsd-validate-commit.sh` | PreToolUse | Enforce Conventional Commits format on `git commit` |
| `gsd-workflow-guard.js` | PreToolUse | Soft warning when editing outside a `/gsd-*` workflow context (opt-in) |
| `gsd-phase-boundary.sh` | PostToolUse | Reminder when `.planning/` files modified outside workflow (opt-in) |

### 1.7 SDK (`sdk/`)

TypeScript SDK published as `@gsd-build/sdk` (npm) with binary `gsd-sdk`. Substantial surface:

- **Modules**: `phase-runner`, `init-runner`, `session-runner`, `context-engine`, `event-stream`, `prompt-builder`, `prompt-sanitizer`, `tool-scoping`, `cli-transport`, `ws-transport`, `plan-parser`, `research-gate`, `context-truncation`, `workstream-utils`, `gsd-tools`
- **CLI subcommands**: `query`, `run`, `init`, `auto`
- **Query registry**: deterministic handlers for `state.json`, `roadmap.analyze`, etc. — agents call SDK instead of shelling
- **Fallback**: shells to `get-shit-done/bin/gsd-tools.cjs` if a query has no native handler (gated by `GSD_QUERY_FALLBACK`)
- **Test footprint**: 25+ vitest specs, integration tests for init/lifecycle/transport
- **Internal docs**: handover docs for ongoing work (Golden Parity, Parity Docs, Query Layer)

This is a meaningful programmatic API — not just a CLI wrapper.

---

## 2. Superpowers Inventory

Superpowers is *much* smaller — by design. It is built around a "skills" library that auto-triggers via descriptions.

### 2.1 Skills (14 total in `skills/`)

Each is a directory with `SKILL.md` (frontmatter `name` + `description`) — the description doubles as the auto-trigger condition for runtimes that support skill discovery.

| Skill | Trigger / Purpose |
|-------|-------------------|
| `using-superpowers` | Activates at conversation start. Mandates checking other skills before any response. The "bootstrap" skill. |
| `brainstorming` | Activates before any creative/feature work. Socratic spec refinement, requirements/design exploration, saves design doc. |
| `writing-plans` | Activates with approved spec/requirements. Breaks work into 2–5-min atomic tasks with exact paths and verification steps. |
| `executing-plans` | Activates with a written plan to execute in a separate session. Batch execution with human checkpoints. |
| `subagent-driven-development` | Activates when executing plans with independent tasks in current session. Two-stage review (spec compliance → code quality). |
| `dispatching-parallel-agents` | Activates with 2+ independent tasks (no shared state). Concurrent subagent dispatch pattern. |
| `using-git-worktrees` | Activates before isolation-needing feature work or plan execution. Creates worktree with safety verification. |
| `finishing-a-development-branch` | Activates when all tests pass and integration decision needed. Presents merge/PR/keep/discard options. |
| `requesting-code-review` | Activates on task completion / before merging. Pre-review checklist + reviewer dispatch. |
| `receiving-code-review` | Activates when receiving review feedback. Requires technical rigor over performative agreement. |
| `test-driven-development` | Activates before writing any feature/bugfix code. RED-GREEN-REFACTOR enforcement. Includes `testing-anti-patterns.md`. |
| `systematic-debugging` | Activates on any bug/test-failure/unexpected behavior. 4-phase root-cause process. Bundles `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`, `find-polluter.sh`. |
| `verification-before-completion` | Activates before claiming work complete or committing. Requires running verification commands and confirming output. |
| `writing-skills` | Activates when creating/editing skills. Includes `anthropic-best-practices.md`, `persuasion-principles.md`, `testing-skills-with-subagents.md`, graphviz conventions. |

Several skills also bundle reviewer-prompt files (e.g. `subagent-driven-development/{spec-reviewer-prompt,code-quality-reviewer-prompt,implementer-prompt}.md`, `brainstorming/spec-document-reviewer-prompt.md`, `writing-plans/plan-document-reviewer-prompt.md`). These are *prompts dispatched to subagents* — the skill is the orchestrator, the prompt is the worker.

### 2.2 Slash Commands (3 total — all deprecated stubs)

| Command | Purpose |
|---------|---------|
| `/brainstorm` | **Deprecated** — directs user to invoke `superpowers:brainstorming` skill |
| `/write-plan` | **Deprecated** — directs user to `superpowers:writing-plans` skill |
| `/execute-plan` | **Deprecated** — directs user to `superpowers:executing-plans` skill |

Important: Superpowers has **no real slash-command surface**. All capability is via skills. The 3 commands exist solely as redirect-to-skill shims for users who type `/brainstorm` out of habit.

### 2.3 Subagents (1 total)

| Agent | Purpose |
|-------|---------|
| `code-reviewer` | Reviews completed work against the original plan and code-quality standards. `model: inherit`. Used by `requesting-code-review` skill. |

(Other "agents" in Superpowers are inline subagent prompts bundled inside skills, not standalone agent definitions.)

### 2.4 Hooks

| Hook | Type | Purpose |
|------|------|---------|
| `session-start` (bash) | SessionStart | Inject the full `using-superpowers` SKILL.md content as `additionalContext` at session start. Warns about legacy `~/.config/superpowers/skills` dir. |
| `run-hook.cmd` | Polyglot wrapper | Cross-platform launcher (Windows cmd.exe ↔ Unix bash) so hook scripts work on every OS. |
| `hooks.json` | Config | Claude Code hook registration (SessionStart matches startup/clear/compact). |
| `hooks-cursor.json` | Config | Cursor hook registration (snake_case `additional_context`). |

That's the entire hook footprint. Compared to GSD's 11 specialised hooks, Superpowers has **one** hook with one job: load `using-superpowers` at session start so skills work.

### 2.5 Multi-Runtime Files

| File | Lines | Contents |
|------|-------|----------|
| `CLAUDE.md` | 85 | Contributor guidelines for the Superpowers repo itself — *not* runtime guidance for users. PR-rejection rules, "what we will not accept", skill-eval requirements, project terminology. |
| `AGENTS.md` | 85 | **Identical** to `CLAUDE.md`. Same contributor guidelines, just a different filename for Codex/AGENTS-aware runtimes. |
| `GEMINI.md` | 2 | Two `@import` lines: `@./skills/using-superpowers/SKILL.md` and `@./skills/using-superpowers/references/gemini-tools.md` — relies on Gemini's `@` import syntax to load the bootstrap skill. |

Critical observation: Superpowers' multi-runtime files are *contributor-facing*, not user-facing. The actual user-runtime guidance lives in the `using-superpowers` skill, which is injected via the `session-start` hook (Claude/Cursor) or `@import` (Gemini). The repo gets multi-runtime support primarily through (a) skill-discovery conventions per platform and (b) the polyglot `run-hook.cmd` wrapper.

### 2.6 Other Assets

- `gemini-extension.json` — Gemini extension manifest
- `docs/` — `README.codex.md`, `README.opencode.md`, `superpowers/`, `windows/`, `testing.md`, `plans/`
- `scripts/bump-version.sh`, `scripts/sync-to-codex-plugin.sh`
- `tests/` — pressure tests, eval scaffolding for skill content
- No SDK, no programmatic API, no state-files, no `.planning/`-equivalent

---

## 3. Combined Feature Set — Categorised

### 3.1 Table Stakes (oto MUST have these)

These are non-negotiable. User stated GSD's command/workflow appeal is core; everything below is either a GSD pillar or a Superpowers feature that GSD lacks but a serious dev framework needs.

| Feature | Source | Why table-stakes for oto |
|---------|--------|--------------------------|
| `/oto-new-project` initialization with research → requirements → roadmap | GSD | Spine of the workflow; user explicitly values this |
| Phase-based discuss → plan → execute → verify loop | GSD | The "shape" of GSD that the user wants preserved |
| Atomic git commits per task | GSD | Bisect/revert is core to GSD's value prop |
| Wave-based parallel plan execution | GSD | Major perf win on multi-plan phases |
| Fresh-context subagent dispatch for executors | GSD + SP | Both frameworks rely on this; Sonnet/Opus context-rot hedge |
| Persistent state across sessions (`.planning/`-equivalent) | GSD | Solo-dev memory; user wants `.planning/` rebranded to `.oto/` |
| TDD enforcement (RED-GREEN-REFACTOR) | Superpowers | GSD has `tdd.md` reference but no enforcement skill; SP's `test-driven-development` skill is widely-cited as its strongest |
| Systematic debugging skill | Superpowers | GSD has `/gsd-debug` (orchestration) but not the *skill* mandate; SP's `systematic-debugging` is composable from any context |
| Verification-before-completion gate | Superpowers | GSD verifies *phases*, SP verifies *every claim*. Different granularity, both valuable. |
| Atomic-task plan structure | Both | GSD: XML `<task>` tags. SP: 2–5-min tasks with exact paths/code/verify. |
| Multi-runtime guidance (CLAUDE/AGENTS/GEMINI.md) | Both | User constraint: must support Claude Code, Codex, Gemini |
| Code-review feedback loop | Both | GSD has it as a phase; SP has it as a skill — at least one form needed |
| Help / discovery (`/oto-help`) | GSD | Users need a manifest of available commands |
| Update mechanism | GSD | User builds an upstream-sync tool; needs an `/oto-update` |
| Session statusline (context %, current task) | GSD | Essential UX once you've used it; SP doesn't have anything comparable |

### 3.2 Differentiators (unique to one side, oto should likely keep)

GSD-only differentiators:

| Feature | Why distinctive |
|---------|-----------------|
| Spike & Sketch with wrap-up (`/gsd-spike`, `/gsd-sketch`) | No SP equivalent. Throwaway-experiment pattern with skill packaging is GSD-unique. |
| `/gsd-ai-integration-phase` + AI-SPEC.md | Eval-strategy-anchored AI feature workflow. Niche but high-value when applicable. |
| `/gsd-secure-phase` + threat-model anchoring | Security verification tied to PLAN threat model. SP has no security workflow. |
| `/gsd-ingest-docs` + classifier/synthesizer agents | Brownfield doc-ingest is a major GSD strength. |
| `/gsd-map-codebase` + `/gsd-scan` + `/gsd-graphify` + `/gsd-intel` | Codebase-intelligence layer (parallel mappers, knowledge graph, intel files). |
| Workstreams + workspaces | Parallel milestone work, isolated repo copies. |
| Backlog (999.x), seeds (trigger conditions), threads | Idea-capture + future-surfacing system. |
| Cross-AI peer review (`/gsd-review`, `/gsd-plan-review-convergence`) | Routes plans to external AI CLIs for second-opinion convergence. |
| `gsd-sdk` programmatic API | Deterministic query/mutation handlers; agents can call instead of shell-piping. Major architectural strength. |
| Forensics / audit / health / stats / forensic progress | Operational tooling: post-mortems, integrity checks, telemetry. |
| Decimal phase insertion (e.g. 72.1) | Insert urgent work without renumbering. |
| `gsd-statusline.js` | Live context-% + current-task display in Claude Code statusline. |
| `gsd-context-monitor.js` | Inject context-usage warnings into the agent's view (not just the user's). |
| `gsd-validate-commit.sh` | Enforce Conventional Commits format. |
| Model profiles (quality/balanced/budget/inherit) | Per-agent model selection with named profiles. |
| Visual audits (`/gsd-ui-phase`, `/gsd-ui-review`, 6-pillar) | Frontend-specific design-contract + audit pipeline. |
| Pause/resume with HANDOFF.json | Mid-phase context handoff. |
| `/gsd-profile-user` + behavioral profile | Personalised agent responses based on session-mined dev profile. |

Superpowers-only differentiators:

| Feature | Why distinctive |
|---------|-----------------|
| Skill auto-triggering via descriptions | Skills load *based on situation* (e.g. "encountering any bug" → `systematic-debugging` auto-loads). GSD only loads skills when commands are explicitly invoked. |
| `using-superpowers` as session-start primer | Single skill that enforces "check skills before any response". Behavioural-shaping at the session boundary. |
| Skill-bundled subagent prompts | Each skill ships its own reviewer/implementer prompts. The skill is the orchestrator, the bundled prompts are the workers. |
| `writing-skills` skill (meta) | Creating new skills is itself a skill — with anthropic best-practices reference, persuasion principles, adversarial pressure-testing methodology. |
| `dispatching-parallel-agents` skill | Generalised parallel-subagent pattern as a callable skill (GSD has wave-execution but only inside `/execute-phase`). |
| Two-stage review (spec compliance → code quality) | Built into `subagent-driven-development`. GSD's `plan-checker` checks before, `verifier` after — but no two-stage *during*-implementation review. |
| `using-git-worktrees` as a portable skill | GSD has worktrees as a config flag; SP makes worktree creation a callable skill from any context. |
| Skill philosophy / behavioral content | "Red Flags" tables, rationalization lists, "human partner" framing — adversarially-tuned content the maintainers refuse to soften. Has measured efficacy in agent-behavior shaping. |
| Polyglot `run-hook.cmd` wrapper | One file works as both Windows .cmd and Unix shell script — single hook entry across OSes. |

### 3.3 Overlapping Features (need a merge decision)

These are the pairs where both frameworks do roughly the same thing, but in *different shapes*. Section 4 below resolves each.

| # | Feature area | GSD shape | Superpowers shape |
|---|-------------|-----------|-------------------|
| O1 | Specification / pre-plan refinement | `/gsd-discuss-phase` (+ `-assumptions`, `-power`, `/gsd-spec-phase`) — orchestrator-driven Q&A producing CONTEXT.md/SPEC.md | `brainstorming` skill — Socratic dialogue, design-doc artifact, auto-triggers on creative work |
| O2 | Plan creation | `/gsd-plan-phase` → `gsd-planner` agent → XML-tagged PLAN.md with `<task>`/`<verify>`/`<done>` | `writing-plans` skill — 2–5-min tasks with exact file paths, complete code, verification steps |
| O3 | Plan execution | `/gsd-execute-phase` → wave-based parallel `gsd-executor` agents with atomic commits | `executing-plans` skill (batch w/ checkpoints) + `subagent-driven-development` skill (in-session w/ two-stage review) |
| O4 | Code review | `/gsd-code-review` → `gsd-code-reviewer` agent → severity-classified REVIEW.md → `/gsd-code-review-fix` → `gsd-code-fixer` | `requesting-code-review` skill + `code-reviewer` agent + `receiving-code-review` skill (response discipline) |
| O5 | Debugging | `/gsd-debug` + `gsd-debugger` + `gsd-debug-session-manager` (multi-cycle checkpoint loop, persistent state) | `systematic-debugging` skill (4-phase root-cause, bundled techniques) |
| O6 | Test discipline | `references/tdd.md` (passive guidance), `/gsd-add-tests`, `gsd-nyquist-auditor` | `test-driven-development` skill (active enforcement, deletes pre-test code) |
| O7 | Verification | `gsd-verifier` (phase goal achievement, post-execution) + `/gsd-verify-work` (UAT) | `verification-before-completion` skill (every claim, before commit) |
| O8 | Branch finishing / PR | `/gsd-ship` + `/gsd-pr-branch` (filter `.planning/` commits) | `finishing-a-development-branch` skill (merge/PR/keep/discard chooser) |
| O9 | Worktree / isolation | `git.use_worktrees` config flag + `/gsd-new-workspace` | `using-git-worktrees` skill |
| O10 | Parallel subagent dispatch | Wave engine inside `/gsd-execute-phase` | `dispatching-parallel-agents` skill (generic, callable from anywhere) |
| O11 | Subagent orchestration model | 33 named agents, each spawned by specific commands | "Skill = orchestrator, bundled prompts = workers" (`subagent-driven-development`) |
| O12 | Session bootstrap | `gsd-session-state.sh` + `gsd-check-update.js` + statusline | `session-start` hook injects `using-superpowers` skill |
| O13 | Skill creation / extension | Project-local skills via wrap-up commands (`/gsd-spike-wrap-up`, `/gsd-sketch-wrap-up`) | `writing-skills` skill — full meta-methodology |
| O14 | Multi-runtime guidance file | Templated `claude-md.md`, `copilot-instructions.md` in templates | `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` (contributor-facing in SP, but pattern is the runtime-guidance file) |

### 3.4 Anti-Features (do NOT bring into oto)

Features that would either bloat scope, contradict personal-use ceiling, or carry community-distribution baggage that doesn't belong in a private fork.

| Anti-feature | Source | Why exclude |
|--------------|--------|-------------|
| `/gsd-join-discord` | GSD | Community link command. Personal fork; no community to invite to. |
| `gsd-token-foundation` chrome (README badges, $GSD token references, "Trusted by Amazon/Google" copy) | GSD | Marketing surface for the public project. oto is private. |
| Discord/marketplace plugin install instructions (Anthropic marketplace, OpenCode marketplace, Cursor plugin marketplace, Copilot marketplace, Gemini extension) | Superpowers | oto distributes via `npm install -g github:...` only. |
| `gemini-extension.json` | Superpowers | Marketplace artifact; oto's Gemini support comes via direct install. |
| OpenCode-specific install paths (`.opencode/`, opencode INSTALL.md, opencode docs) | Both | User dropped OpenCode in PROJECT.md. |
| Kilo / Cursor / Windsurf / Antigravity / Augment / Trae / Qwen Code / CodeBuddy / Cline runtime support | GSD | User scope is Claude Code + Codex + Gemini only. Each extra runtime ~doubles install/test surface. |
| `/gsd-from-gsd2` | GSD | Migrating from GSD-2 → GSD-1. oto is greenfield. |
| `/gsd-ultraplan-phase` (BETA, Claude Code cloud offload) | GSD | Beta cloud feature; adds external dependency. Personal-use cost ceiling fails. |
| `/gsd-eval-review`, `/gsd-ai-integration-phase` AI eval scaffolding | GSD | **Probably-exclude**, not definite — only valuable if user builds AI features regularly. Otherwise dead weight. Surface in REQUIREMENTS as "defer". |
| `/gsd-inbox` (GitHub issue/PR triage) | GSD | Solo personal fork — minimal incoming issues. Not zero, but low-value vs maintenance cost. |
| `/gsd-profile-user` + behavioral profile | GSD | Privacy-adjacent, complex to maintain, marginal value for solo dev. |
| `/gsd-graphify` knowledge graph | GSD | Heavy infrastructure (`.planning/graphs/`); marginal benefit for solo workflow. Defer. |
| `/gsd-intel` codebase intelligence | GSD | Overlaps with `/gsd-map-codebase` outputs. Pick one (see overlap O15 below). |
| `/gsd-graduation` LEARNINGS.md cross-phase | GSD | Niche advanced feature; revisit if needed. |
| Superpowers "94% PR rejection rate" / contributor-guideline content in CLAUDE.md/AGENTS.md | Superpowers | Repo-maintainer-facing. Not relevant in oto. |
| Superpowers internal release-process docs (RELEASE-NOTES.md, scripts/sync-to-codex-plugin.sh) | Superpowers | Their distribution pipeline; oto has its own. |
| Superpowers `tests/` pressure-testing infrastructure | Superpowers | Maintainer test harness; not a user feature. (Their *methodology* in `writing-skills` is worth preserving as reference; the test files are not.) |

Soft anti-features (consider, but lean exclude):
- `/gsd-import` (importing external plans) — solo dev rarely has that need
- `/gsd-reapply-patches` (post-update patch reapply) — oto has the rebrand sync tool; this is GSD-update-specific
- `/gsd-node-repair` — environmental fix; oto can document instead of automate
- `/gsd-thread` — overlaps with `/gsd-add-todo` and `/gsd-plant-seed`; trim the trio

---

## 4. Overlap Resolution Table

For each overlap pair from §3.3, this is the merge recommendation.

| ID | Overlap | Recommendation | Rationale |
|----|---------|----------------|-----------|
| **O1** | discuss/spec ↔ brainstorming | **Keep GSD shape, port SP's Socratic discipline as a reference doc.** `/oto-discuss-phase` stays the spine. Lift SP's `brainstorming` skill content into a reference doc that the discuss-phase orchestrator consumes (especially the "show design in chunks for validation" pattern, which GSD's `-power` mode partially has). Drop the SP skill as a standalone surface. | GSD's discuss has phase-aware question generation, multiple modes (advisor/assumptions/power), and produces a CONTEXT.md that downstream agents consume. SP's brainstorming is excellent prose but free-form — would create two ways to do the same thing if both ship. |
| **O2** | planning | **Keep GSD shape, adopt SP's "exact file paths + complete code + verification" rigor inside the gsd-planner template.** PLAN.md stays XML-tagged, but the planner agent's instructions absorb SP's writing-plans contract: every task has *exact path*, *full code or diff*, *exact verification command*. | GSD's XML structure feeds wave parallelisation and validation. SP's plans are looser but more concrete in *content*. Combine: GSD shape + SP content rigor. |
| **O3** | execution | **Keep GSD wave engine. Add SP's two-stage review (spec compliance → code quality) inside the executor loop.** Each task: executor implements → spec-compliance review → code-quality review → commit. Today GSD's executor does plan-vs-output check; this elevates it to two named stages. | Wave parallelisation is GSD's killer feature. SP's two-stage review catches a class of issues (drift from spec vs. brittle code) that GSD's single verifier pass misses. Cost: small per-task latency increase. Worth it. |
| **O4** | code review | **Keep both, scope-separated.** Use GSD's `/oto-code-review` + `gsd-code-reviewer` for *phase-end review*. Adopt SP's `requesting-code-review` + `receiving-code-review` skills for *task-level review during execution* (composes with O3). | The two operate at different granularities. GSD: "review the 30 files this phase touched." SP: "review the diff I just wrote." Both useful. SP's `receiving-code-review` (technical-rigor discipline) is unique and worth keeping as a skill. |
| **O5** | debugging | **Keep GSD's `/oto-debug` orchestration; install SP's `systematic-debugging` content as the methodology the gsd-debugger agent follows.** SP's bundled `root-cause-tracing.md`, `defense-in-depth.md`, `condition-based-waiting.md`, `find-polluter.sh` become reference docs/scripts loaded into the debugger agent's context. | GSD has the multi-cycle session loop and persistent state (debug-session-manager). SP has the *methodology* (4-phase root-cause). Marry them: GSD's loop runs SP's process. |
| **O6** | TDD | **Adopt SP's `test-driven-development` skill as a first-class oto skill, replace GSD's passive `references/tdd.md`.** Have it auto-trigger before any feature/bugfix code is written. | This is a clear SP win. GSD's tdd.md is reference-only — agents read it if pointed at it. SP's skill is enforcement-shaped (deletes pre-test code, RED-GREEN-REFACTOR mandate). Strictly better behavioral shaping. |
| **O7** | verification | **Keep both, scope-separated.** GSD's `gsd-verifier` runs at phase boundary (goal-backward). SP's `verification-before-completion` runs at every commit/claim. Different cadence, both valuable. Codify the boundary in the workflow doc. | GSD answers "did the phase deliver?"; SP answers "is this specific claim actually true?" Different questions. Both essential — many bugs slip past phase verification because individual claims weren't verified at the moment they were made. |
| **O8** | ship / branch finishing | **Keep GSD's `/oto-ship` (PR creation + auto-body + .planning-filter). Adopt SP's `finishing-a-development-branch` decision-tree as a reference inside ship.** | GSD's ship has automation SP lacks (PR body generation, planning-commit filtering). SP's decision tree (merge/PR/keep/discard) is good UX. Combine. |
| **O9** | worktrees | **Keep GSD's config flag + `/oto-new-workspace`. Adopt SP's `using-git-worktrees` as a callable skill for non-workspace ad-hoc isolation.** | GSD's workspace is heavyweight (full repo copy). SP's worktree skill is lightweight (single branch, same repo). Different use cases. |
| **O10** | parallel subagent dispatch | **Keep GSD's wave engine for plan execution. Adopt SP's `dispatching-parallel-agents` as a generic skill for non-execute contexts.** | The wave engine is plan-shape-specific. SP's skill works whenever there's "2+ independent tasks" — research, audit, codebase mapping, etc. They compose. |
| **O11** | subagent orchestration model | **Hybrid. Keep GSD's named-agent registry as the spine; allow SP's "skill = orchestrator, bundled prompts = workers" pattern for *new* skills going forward.** | Rewriting all 33 GSD agents into the SP pattern is a massive cost with unclear payoff. But the SP pattern is genuinely good for new skills (no separate agent file = less to maintain). Allow both, use SP's pattern as the default for new work. |
| **O12** | session bootstrap | **Keep GSD's hook stack (state, statusline, update-check, context-monitor). Adopt SP's idea of injecting a "primer skill" at session start as the oto-bootstrap.** | GSD's hooks do operational things (status, updates, security). SP's session-start does behavioral priming. Both layers, no conflict. |
| **O13** | skill creation | **Keep GSD's wrap-up commands for project-local skills. Adopt SP's `writing-skills` as the methodology for creating reusable framework-level skills.** | Different scopes. GSD wrap-up = "package these spike findings as a project-private skill." SP writing-skills = "create a new general-purpose skill anyone using oto would benefit from." |
| **O14** | multi-runtime guidance | **Use templated CLAUDE.md/AGENTS.md/GEMINI.md per-project (GSD's pattern). At the framework level, ship one runtime-primer skill (SP's pattern) that each guidance file imports.** | GSD provides per-project templates the user fills in. SP provides one global primer. oto needs both: project-level guidance (rebranded) + framework-level primer ("you have oto, here's how it works"). |

Add one not previously listed:

| **O15** | codebase intelligence | **Keep `/oto-map-codebase` + `/oto-scan` (lightweight option). Drop `/oto-graphify` and `/oto-intel` initially — they overlap with map outputs and add infrastructure.** | The map/scan pair covers the core need. Graphify and intel are advanced layers; defer. |

---

## 5. Implications for REQUIREMENTS.md

This research suggests the next-phase requirement scope should be cut along these lines:

### Definite Inclusion (table stakes, §3.1 + clear overlap winners from §4)

GSD spine of `/oto-new-project → discuss → plan → execute → verify → ship`, plus:
- Atomic-commit execution with wave parallelization
- `.oto/` (renamed `.planning/`) state directory
- Statusline + context monitor + session-state hooks
- Update / health / help / progress / next
- Multi-runtime support (Claude Code, Codex, Gemini)
- Three SP skills as first-class: `test-driven-development`, `systematic-debugging`, `verification-before-completion`
- Two SP skills as supporting: `dispatching-parallel-agents`, `using-git-worktrees`
- SP's `writing-skills` as meta-methodology
- SP's two-stage review pattern fused into oto's executor

### Conditional Inclusion (carries weight, but user must decide)

- AI integration phase + eval-planner (only if user does AI work regularly)
- Workstreams + workspaces (only if user runs parallel milestones)
- Spike + sketch (high-value if user explores often, dead weight otherwise)
- Cross-AI peer review (requires external CLI access; could be worth one v2 iteration)
- gsd-sdk programmatic API (huge architectural strength; question is whether oto needs the same surface or can ship narrower)

### Definite Exclusion (anti-features from §3.4)

- All marketplace/community/discord/token/branding artifacts
- All non-Claude/Codex/Gemini runtime support
- BETA features (ultraplan)
- GSD-2 migration paths
- Soft-exclude: `/gsd-graphify`, `/gsd-intel`, `/gsd-thread`, `/gsd-profile-user`, `/gsd-inbox`

### Open Questions (the most important ones to ask the user)

1. Does AI-integration-phase / eval scaffolding stay or drop?
2. Workstreams + workspaces — keep, or trim to "phases only"?
3. Spike + sketch — keep both, one, or neither?
4. gsd-sdk — port faithfully, port narrowly, or skip?
5. Skill auto-triggering vs explicit invocation — does oto adopt SP's auto-trigger model for skills, or stay with GSD's explicit `/gsd-*` invocation?
6. How aggressively to merge: do we want one `/oto-debug` that runs SP's methodology (recommended O5), or both `/oto-debug` AND a `systematic-debugging` skill exposed separately?

---

## Sources

- Direct inspection: `foundation-frameworks/get-shit-done-main/{commands,agents,hooks,sdk,get-shit-done}/`
- Direct inspection: `foundation-frameworks/superpowers-main/{skills,commands,agents,hooks,CLAUDE.md,AGENTS.md,GEMINI.md}/`
- GSD README v1.38.5
- Superpowers README v5.0.7
- `using-superpowers/SKILL.md`, `session-start` hook script

Confidence: **HIGH** — every claim is grounded in a file path inspected during this research run.
