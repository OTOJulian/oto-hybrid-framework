# Pitfalls Research

**Domain:** Personal hybrid AI-CLI framework (forked GSD + Superpowers, multi-runtime, GitHub-installed)
**Researched:** 2026-04-27
**Confidence:** HIGH (based on direct inspection of `foundation-frameworks/` source, both CHANGELOGs, hook scripts, and install logic)

> Suggested phase names referenced below: `inventory`, `architecture-decision`, `rebrand-tooling`, `core-rebrand`, `runtime-adapters`, `distribution`, `upstream-sync`, `tests-ci`, `docs`. These are placeholders for the planner — adjust as needed.

---

## Critical Pitfalls

### Pitfall 1: `gsd` substring collisions during automated rebrand

**What goes wrong:**
Naive `s/gsd/oto/g` over the source tree corrupts content that has nothing to do with the framework name.

**Why it happens:**
`gsd` is three letters and appears as a fragment inside ordinary English and code:
- `git diff` of release prose contains words like "stagsd" wouldn't match — but real hits include filenames like `gsd-tools.cjs` *and* commit-message body text from upstream contributors. More dangerous: `# WARNING: GSD has 94% PR rejection rate` style maintainer messages, link slugs (`/issues/2387`), CHANGELOG section anchors (`compare/v1.38.5...HEAD`), GitHub URLs (`github.com/gsd-build/...`), and *every translated README* (`README.ja-JP.md`, `README.ko-KR.md`, `README.pt-BR.md`, `README.zh-CN.md`).
- Quoted user-facing strings like `<EXTREMELY_IMPORTANT>You have superpowers.</EXTREMELY_IMPORTANT>` (from `superpowers-main/hooks/session-start` line 35) — Superpowers literal — also need rebrand or model gets confused identity.
- `processAttribution` in GSD CHANGELOG (1.35.0) was hardcoded to `'claude'` until a fix; analogous "claude" / "superpowers" / "gsd" runtime-detection strings in conditionals must NOT be blindly renamed because they pattern-match runtime env vars (`CLAUDE_PLUGIN_ROOT`, `COPILOT_CLI`).

**How to avoid:**
- Build the rename map as a list of *typed* rules, not regex pairs:
  - `identifier` rules — only match word-boundary `\bgsd\b`, `\bgsd-[a-z-]+\b`, `\bGSD\b`, `\bget-shit-done\b`, `\bget-shit-done-cc\b`.
  - `path` rules — only match path segments: `^|/get-shit-done(/|$)`, `\.planning(/|$)`.
  - `command` rules — only match `/gsd-` followed by lowercase word chars at start of inline-code or after whitespace.
  - `package` rules — `package.json` `name` and `bin` keys only.
  - `url` rules — explicitly preserve `github.com/gsd-build/get-shit-done` (it's the upstream we sync FROM); rewrite only repo-relative anchors.
- Maintain an explicit *do-not-rename* allowlist:
  - All env-var names (`GSD_VERSION`, `GSD_PORTABLE_HOOKS`, `GSD_RUNTIME`, `GSD_AGENTS_DIR`, `GSD_TOOLS_PATH`) are kept as `GSD_*` *for upstream-sync simplicity* OR renamed to `OTO_*` in lockstep — choose once and stick.
  - Translated READMEs: drop them entirely (out-of-scope per PROJECT.md personal-use-cost-ceiling) rather than rebrand 4 languages of marketing copy.
  - License "Copyright (c) 2025 Lex Christopherson" / "Copyright (c) 2025 Jesse Vincent" — MUST be preserved (see Pitfall 6).
- Run the rebrand as a dry-run first that prints every match grouped by rule type with file:line, and a hand-reviewable summary count per rule. Reject the run if any unclassified match remains.

**Warning signs:**
- After rebrand, model output references `superpowers` or `gsd` identity in unexpected places.
- Search for the strings `gsd`, `GSD`, `superpowers`, `Superpowers` in the rebranded tree should return ZERO hits except in: (a) `foundation-frameworks/` (preserved upstream copy), (b) `LICENSE` / `THIRD-PARTY-LICENSES.md` attribution files, (c) `upstream-sync` tool's rename-map source.

**Phase to address:**
`rebrand-tooling` (build the rule-typed rename engine first), then `core-rebrand` (apply it).

---

### Pitfall 2: Rebrand corrupts internal IDs the runtime expects

**What goes wrong:**
Claude Code, Codex, and Gemini CLI each have implicit naming contracts. Renaming an agent or skill to `oto-*` breaks them silently.

**Why it happens:**
- Claude Code subagent dispatch uses the `name:` frontmatter field. GSD's `agents/gsd-planner.md` has `name: gsd-planner` and is invoked from workflows with `Task(subagent_type="gsd-planner", ...)`. Every one of GSD's 33 agents has this dual reference (frontmatter + workflow body). Missing one = silent dispatch failure.
- Superpowers cross-references use the namespaced form: `superpowers:brainstorming`, `superpowers:code-reviewer`, etc. — these appear in 11+ skills as `**REQUIRED SUB-SKILL:**`. The colon namespace is consumed by the Skill tool. Rebranding requires (a) renaming the namespace itself (`superpowers:` → `oto:`) AND (b) preserving the *internal* skill identity expectation everywhere.
- Slash command vs. directory naming: GSD CHANGELOG 1.38.5 explicitly notes `/gsd-<cmd>` (user-typed) vs. `Skill(skill="gsd:<cmd>")` (frontmatter `name:`) — these resolve differently. Issue #2697 in upstream is literally a fix where they got this wrong. The rebrand has to honor this distinction.
- Codex sandbox map in `bin/install.js` lines 26-38 hardcodes per-agent sandbox levels (`gsd-executor: workspace-write`, `gsd-plan-checker: read-only`). If rebrand renames the agent file but misses this map, every Codex install gets default sandbox.
- Hardcoded skill name `using-superpowers` in `hooks/session-start` line 35 — appears as a literal string injected into model context. Renaming the SKILL.md file without updating the hook breaks bootstrap.

**How to avoid:**
- Treat agent/skill IDs as schema, not free text. Build a single `rename-map.json` with explicit before/after per ID, then have the rebrand engine assert *every* old ID in the source tree is consumed by exactly one rule and *every* new ID round-trips.
- Generate a coverage manifest after rebrand: list every agent name, every skill name, every slash command, every namespaced reference. Diff it against the pre-rebrand manifest with the rename map applied. Any mismatch = bug.
- Maintain a "runtime contract" reference doc enumerating: where Claude Code reads `name:`, where Codex reads sandbox config, where Superpowers' Skill tool consumes the `superpowers:` namespace, etc. This doc IS the test fixture.

**Warning signs:**
- Workflow says "spawning gsd-planner" / "spawning oto-planner" but the dispatch silently no-ops (subagent_type unknown).
- Skill tool returns "skill not found" for known IDs.
- Codex installs work but sandbox is wrong (executor agent can't write, planner can't read project files).

**Phase to address:**
`inventory` (enumerate every ID), `core-rebrand` (apply), `tests-ci` (coverage manifest + golden-file diff).

---

### Pitfall 3: `.planning/` path baked into 90+ files at multiple scopes

**What goes wrong:**
The directory name `.planning/` is hardcoded across GSD's prompts, hooks, workflows, agents, and the SDK query layer. Renaming it (e.g., to `.oto/`) requires touching every reference *plus* the SDK's runtime path resolution *plus* state-file lockfiles *plus* gitignore rules.

**Why it happens:**
Direct inspection counts:
- 69 files under `get-shit-done/workflows/` reference `.planning`
- 21 files under `agents/` reference `.planning`
- `hooks/gsd-phase-boundary.sh` lines 11-23 hardcode `.planning/config.json`, `.planning/`, `STATE.md`
- SDK code in `sdk/src/query/helpers.ts::findProjectRoot` (CHANGELOG #2623) walks up looking for `.planning/` to detect the project root in monorepos.
- `gsd-tools.cjs` legacy script also walks for `.planning/`.

A single missed reference means: SDK can't find project root → workflows fail with "project_exists: false" (this exact bug shipped to GSD users in 1.36/1.38).

**How to avoid:**
- Decide the new directory name in `architecture-decision` phase BEFORE rebrand starts. Document it in PROJECT.md Key Decisions.
- Treat `.planning` as a rename rule with stricter matching than `gsd` — match only path-shaped occurrences (`\.planning/`, `^\.planning$`, `"\.planning"`, `'\.planning'`). Do NOT match the bare word "planning".
- Add a unified path-resolution helper to oto's SDK shim (analog of `findProjectRoot`) and refactor inline `.planning/` string concatenation to call it. Reduces future drift.
- Acceptance test: spawn the framework in a temp dir, run a workflow that writes state, assert the state lands under `<new-name>/` and not `.planning/` anywhere.

**Warning signs:**
- After rebrand, a workflow writes `STATE.md` to `.planning/` while the rest of the system reads from `.oto/` (or vice versa).
- `gsd-sdk query`-equivalent reports `project_exists: false` despite the new dir being present.
- Gitignore entries left as `.planning/` silently leak state files into commits.

**Phase to address:**
`architecture-decision` (name choice), `core-rebrand` (apply), `tests-ci` (round-trip integration test).

---

### Pitfall 4: GSD upstream is extremely volatile — sync conflicts will be the dominant ongoing cost

**What goes wrong:**
GSD's CHANGELOG shows ~14 minor releases in roughly 12 weeks (1.32 → 1.38.5 over March–April 2026), with breaking changes hidden inside minor bumps. Superpowers shipped 7 versions of v5.x in March 2026 alone. The rebrand pipeline must apply renames AND merge upstream changes that may have refactored, renamed, deleted, or restructured files.

**Why it happens:**
Concrete recent volatility evidence (from CHANGELOGs):
- GSD 1.36 introduced `gsd-sdk query` and migrated dozens of workflows from `gsd-tools.cjs` to the new CLI — a structural change touching every workflow file.
- GSD 1.38.4 deleted 13 bundled SDK prompt files (`sdk/prompts/agents/`, `sdk/prompts/workflows/`) — *deletions* that a naive rename-map sync would silently miss.
- GSD 1.36 renamed `/gsd:<cmd>` → `/gsd-<cmd>` user-facing slash commands (issue #2697) while keeping `Skill(skill="gsd:<cmd>")` internal references — a context-sensitive rename.
- GSD 1.36 added `--minimal` install mode with a separate skill allowlist (`MINIMAL_SKILL_ALLOWLIST`) — schema addition.
- GSD 1.34.2 lowered Node minimum from 24 to 22 — engine drift.
- Superpowers v5.0.0 restructured `docs/superpowers/specs/` and `docs/superpowers/plans/` (breaking change). v5.0.2 *removed all `node_modules`* from the brainstorm server. v5.0.6 *replaced subagent review loops with inline self-review*. v5.0.7 added Copilot CLI support with new env-var detection (`COPILOT_CLI`).

**How to avoid:**
- Pin upstream to specific tags (`v1.38.5`, `v5.0.7`) and bump deliberately, not on every push. Treat each bump as a planned operation with its own dry-run and review.
- Sync tool must surface three kinds of upstream change separately:
  1. **File added upstream** — auto-apply rename rules, queue for review.
  2. **File modified upstream** — three-way merge: upstream-original vs. upstream-new vs. oto-current (with rename rules applied to both upstream sides). Conflict if oto edited the same lines.
  3. **File deleted upstream** — *do not silently delete locally*. Surface as an explicit decision with a reason: "GSD 1.38.4 deleted these stripped-down SDK prompts; they're maintained inline in oto now — confirm deletion or keep."
- Maintain a per-upstream `last-synced-commit.json` so the sync can compute exact diffs against the previous sync, not just the current state.
- For each upstream, maintain a `BREAKING-CHANGES.md` log noting which versions required hand-merge intervention. This becomes the predictor for future cost.

**Warning signs:**
- After sync, a workflow references a file that no longer exists.
- After sync, a renamed identifier still appears in old form somewhere.
- `oto-tools query` (or whatever the SDK shim becomes) returns errors for commands that worked before.
- Sync claims "clean apply" but tests start failing — schema or behavior drifted under your feet.

**Phase to address:**
`upstream-sync` (build the tool with three-way merge and deletion-surfacing), `tests-ci` (post-sync regression suite must run on every sync).

---

### Pitfall 5: GitHub-install (`npm install -g github:...`) does NOT run `prepublishOnly` — your prebuilt SDK won't be there

**What goes wrong:**
`npm install -g github:owner/oto-hybrid-framework` clones the repo and runs `prepare` / `install` lifecycle scripts but NOT `prepublishOnly`. GSD's `package.json` builds the SDK *only* in `prepublishOnly`:
```
"prepublishOnly": "npm run build:hooks && npm run build:sdk"
```
A user installing oto from GitHub gets the source tree without `sdk/dist/` populated, and the `gsd-sdk` shim resolves `sdk/dist/cli.js` and fails with `MODULE_NOT_FOUND`. GSD itself hit this exact bug in 1.38.2 (CHANGELOG: "SDK decoupled from build-from-source install").

**Why it happens:**
- npm runs scripts in this order on `npm install <git-url>`: `preinstall`, `install`, `postinstall`, `prepare`. It does NOT run `prepublishOnly` (that's only on `npm publish`).
- GSD's npm tarball ships pre-built `sdk/dist/` because the publish flow built it. GitHub installs ship the raw repo without `dist/`.

**How to avoid:**
- Move the build step to `prepare` (runs on `npm install <git-url>` AND on `npm publish`). Test by installing from a fresh clone with empty `sdk/dist/`.
- OR commit `sdk/dist/` to the repo (tradeoff: pollutes diffs, but install is rock-solid). For a personal tool with low contribution surface, this is acceptable.
- OR rewrite the SDK in plain `.js`/`.cjs` to eliminate the build step entirely. GSD has a *pre-existing* deprecated `gsd-tools.cjs` that does most of the same work — oto could fork that path and skip TypeScript.
- Lock Node version requirement in `engines.node` to a specific minimum the user has on every machine. GSD requires `>=22.0.0`; verify Codex and Gemini CLI runners support it.
- Test the install path end-to-end: `npm install -g github:owner/oto-hybrid-framework#vX.Y.Z` on a clean machine, then run a smoke command.

**Warning signs:**
- "command not found: oto-sdk" or `MODULE_NOT_FOUND: sdk/dist/cli.js` immediately after install.
- Install succeeds but the first slash command fails with cryptic Node errors.
- Different machines with different Node versions get different results.

**Phase to address:**
`distribution` (decide build strategy, write install smoke test), `tests-ci` (CI matrix install from git URL on Node 22 and 24).

---

### Pitfall 6: License/attribution silently lost during rebrand

**What goes wrong:**
Both upstreams are MIT-licensed and require preserving the copyright notice in "all copies or substantial portions of the Software". The rebrand tool, if naive, replaces or deletes lines containing the upstream identity — including LICENSE files and source-file copyright headers.

**Why it happens:**
- GSD `LICENSE`: `Copyright (c) 2025 Lex Christopherson`
- Superpowers `LICENSE`: `Copyright (c) 2025 Jesse Vincent`
- Source files in both upstreams contain attribution comments that the rebrand might match (e.g., when authors leave `// Copyright Jesse Vincent` headers). None observed in current samples but Superpowers' `package.json` author field and `obra/superpowers` URL references in `README.md` (5 hits per grep) need explicit preservation rules.
- MIT requires the copyright notice **and** the permission notice. Removing the LICENSE file or stripping it from the package is a license violation.

**How to avoid:**
- Ship `THIRD-PARTY-LICENSES.md` (or similar) at repo root that contains both upstream LICENSE files verbatim. Reference it from oto's main LICENSE.
- Add the rebrand engine an explicit *do-not-touch* path list: `LICENSE`, `THIRD-PARTY-LICENSES.md`, any file matching `*LICENSE*` (case-insensitive).
- Preserve any inline `Copyright (c) ... Jesse Vincent` / `... Lex Christopherson` comments unmodified.
- Add a CI check: assert both upstream copyright strings still appear somewhere in the repo. Fails the build if either is missing.

**Warning signs:**
- LICENSE file contents shrink between rebrand runs.
- A file authored upstream loses its copyright comment.
- README does not credit upstreams.

**Phase to address:**
`rebrand-tooling` (do-not-touch allowlist), `docs` (explicit attribution section in README), `tests-ci` (CI license check).

---

### Pitfall 7: Multi-runtime CLAUDE.md / AGENTS.md / GEMINI.md silently drift

**What goes wrong:**
Each runtime expects its own bootstrap file. Superpowers ships all three at repo root (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`). They contain similar-but-not-identical instructions. Without enforcement, they drift over time and runtimes get inconsistent behavior.

**Why it happens:**
- Direct inspection: `superpowers-main/` ships `CLAUDE.md` (contributor-only — actually this one is for the upstream repo, not a runtime bootstrap), `AGENTS.md`, `GEMINI.md`, plus `gemini-extension.json`. Each is hand-maintained.
- GSD's runtime targets diverge in concrete ways already documented in its CHANGELOG: Codex tool mapping (`Read → read`, `Bash → execute`, `Task → agent`, `TodoWrite → todo` per `bin/install.js` lines 42-55), Gemini's lack of subagent support, Cursor's separate hooks file (`hooks-cursor.json`), Copilot CLI's `additionalContext` SDK format.
- Superpowers `hooks/session-start` lines 46-55 has a runtime-detection cascade: Cursor → Claude Code → Copilot/other. Each branch emits a different JSON shape. Adding/removing a runtime without updating all branches breaks bootstrap.
- Tool availability differs: `AskUserQuestion` exists in Claude Code; Codex falls back to plain-text numbered lists (GSD CHANGELOG 1.35.0). `WebSearch` not in Codex. `Task` not in Gemini.

**How to avoid:**
- Single source of truth: maintain one `bootstrap-content.md` and generate `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` from it via a build step (with per-runtime sections gated by frontmatter or include directives). Drift becomes impossible.
- Maintain a `runtime-tool-matrix.md` listing every tool and its per-runtime equivalent. Reference it from any agent/skill that uses a tool — when the matrix changes, grep finds every dependent.
- Add a parity test: spawn a minimal command on each runtime, assert it produces the same artifacts (allowing for runtime-specific representation differences).
- Drop OpenCode (per PROJECT.md) — but DO NOT drop the runtime-detection branching, because Codex/Gemini already need it. Just remove the OpenCode branch.
- Stage runtime support: nail Claude Code first (test pass rate 100%), then Codex (90%+), then Gemini (best-effort given subagent absence). Don't perfect Gemini before Claude is stable (see Pitfall 11).

**Warning signs:**
- A new feature works in Claude Code but errors in Codex with "tool not found".
- The same workflow produces different output structures on different runtimes without intentional reason.
- Bootstrap text in `CLAUDE.md` references a tool the user's runtime doesn't have.

**Phase to address:**
`runtime-adapters` (build the bootstrap generator + tool matrix), `tests-ci` (per-runtime parity test).

---

### Pitfall 8: Hooks fire in unspecified order; both frameworks register hooks

**What goes wrong:**
GSD ships 11 hooks (`hooks/gsd-*.{js,sh}`); Superpowers ships 1 SessionStart hook. Both register on `SessionStart`, both inject `additionalContext`. Without ordering control, the second injection may clobber the first or the model gets two competing identity blocks.

**Why it happens:**
- Superpowers `hooks/session-start` line 35 emits an `<EXTREMELY_IMPORTANT>You have superpowers...` block.
- GSD's `gsd-session-state.sh` (referenced in CHANGELOG 1.36 stale-hook warning fix) also fires on SessionStart.
- Claude Code's hooks.json lets multiple hook commands run on the same event, but the merge semantics for `additionalContext` aren't guaranteed: some runtimes deduplicate (per Superpowers session-start comment lines 41-43: "Claude Code reads BOTH `additional_context` and `hookSpecificOutput` without deduplication"). Two hooks emitting both fields = duplicated context.
- GSD CHANGELOG 1.36/1.38.5 had a `gsd-read-injection-scanner` hook that *never shipped* because `scripts/build-hooks.js` allowlist missed it (#2406). Pre-existing evidence that hook plumbing is fragile.

**How to avoid:**
- After the architecture decision (one framework's spine hosts the other), pick ONE SessionStart entrypoint. The other framework's session-start logic gets either inlined into the chosen entrypoint or removed.
- Document hook ordering and event semantics in a `hooks-contract.md`. Each hook declares: events it listens on, fields it emits, fields it expects pre-emitted, and dependencies on other hooks.
- Add a hook-output integration test: simulate SessionStart, capture the emitted JSON, assert exactly one identity block and the expected merged content.
- Mirror GSD's `# gsd-hook-version: {{GSD_VERSION}}` header pattern (CHANGELOG 1.38.5 fix) so the installer can detect stale hooks during upgrade.

**Warning signs:**
- Model output contains two identity primers ("You have superpowers" and "You are using oto") in the same first turn.
- One framework's session-start logic stops firing after install.
- Hook log shows the same hook firing twice or out of expected order.

**Phase to address:**
`architecture-decision` (which session-start wins), `core-rebrand` (consolidate), `tests-ci` (hook-output integration test).

---

### Pitfall 9: Two state systems leak into each other

**What goes wrong:**
GSD owns `.planning/` (PROJECT.md, ROADMAP.md, STATE.md, phases, intel store, etc. — ~10 distinct artifact types). Superpowers owns `docs/superpowers/specs/` and `docs/superpowers/plans/` (per v5.0.0 breaking change) plus a brainstorm-server session dir under `skills/brainstorming/scripts/`. Without a clear contract, hybrid workflows write half-state to each location and become unrecoverable.

**Why it happens:**
- GSD's spec is "spec → plan → execute → verify" centered on `.planning/`. Superpowers' spec is "brainstorm → write-plan → execute" centered on `docs/superpowers/`.
- Both write design documents (`SPEC.md` in GSD vs. `YYYY-MM-DD-<topic>-design.md` in Superpowers).
- Both have an "executor" concept (`gsd-executor` agent vs. Superpowers' `executing-plans` skill / subagent-driven-development).
- Both have a "verifier" concept (`gsd-verifier` agent vs. Superpowers' `verification-before-completion` skill).
- If a user runs `oto-brainstorm` (Superpowers-flavored) and then `oto-execute-phase` (GSD-flavored), where does the spec live? Where does state go?

**How to avoid:**
- The architecture-decision phase MUST resolve the state-system question. Recommended: one canonical state root (e.g., `.oto/`), with subdirs that subsume both upstreams (`.oto/specs/`, `.oto/plans/`, `.oto/phases/`, `.oto/state.md`, `.oto/brainstorm-sessions/`). Drop the parallel `docs/superpowers/` location.
- Migration of paths upstream → oto canonical is a rename rule in the rebrand engine, not a runtime concern.
- Document the state contract in a `state-contract.md`: which command writes which file, the shape of each file, what reads each file.
- Acceptance test: a full hybrid workflow (brainstorm → plan → execute → verify) writes only under the canonical root and produces an artifact graph the user can reason about.

**Warning signs:**
- After running a workflow, state appears in both `.oto/` and `docs/oto/` (or wherever the leaked twin lives).
- A skill can't find its input because it's looking under one path scheme but the prior step wrote the other.
- Two SPEC.md / design.md files exist for the same feature.

**Phase to address:**
`architecture-decision` (decide the canonical state root), `core-rebrand` (rewrite path constants), `tests-ci` (state-leak detection test).

---

### Pitfall 10: Skill auto-loading conflicts with command-driven flow

**What goes wrong:**
Superpowers uses skill auto-discovery (the Skill tool reads `name:` frontmatter and Claude invokes skills proactively when descriptions match the user's intent). GSD uses explicit slash commands (`/gsd-do`, `/gsd-plan-phase`) plus subagent dispatch. If both systems are active, the model may auto-trigger a Superpowers skill mid-GSD-workflow and derail it.

**Why it happens:**
- Superpowers' `using-superpowers` SKILL has explicit "if even 1% chance a skill applies, you MUST read it" enforcement language (CHANGELOG 3.2.2). It's tuned for high recall.
- GSD's workflows are deterministic state machines: `discuss-phase → plan-phase → execute-phase → verify-phase`. Each step has a specific agent dispatched with a specific prompt.
- Superpowers v5.0.0 made subagent-driven-development *mandatory* on capable harnesses — meaning the brainstorming skill expects to spawn its own subagent loop. If a GSD workflow is running and brainstorming auto-triggers, the agent boundary is violated.
- Superpowers v5.0.6 added `<SUBAGENT-STOP>` block specifically to prevent dispatched subagents from re-activating skill workflows — direct evidence the upstream has hit this exact problem.

**How to avoid:**
- Architecture decision: either (a) Superpowers skills are demoted to *opt-in references* (only activated when an oto command explicitly says "now invoke `oto:brainstorming`"), or (b) GSD workflows are deconstructed into skills the way Superpowers structures them. Pick one before rebrand.
- If keeping skill auto-load: the using-superpowers-equivalent must be retuned to *defer* to oto commands when they're active. Add a hard rule "if `.oto/STATE.md` shows an in-progress phase, do not auto-invoke skills outside the workflow's allowlist."
- Maintain a `skill-vs-command-routing.md` decision table for every overlap (brainstorming vs. discuss-phase, writing-plans vs. plan-phase, executing-plans vs. execute-phase, verification-before-completion vs. verify-phase).
- Test: spawn a session in a project mid-phase, give it an ambiguous prompt that could trigger a skill. Assert the in-progress workflow continues and skills do not auto-fire.

**Warning signs:**
- User runs `/oto-execute-phase` and the model immediately invokes `oto:brainstorming` instead.
- Workflows complete with extra unexpected artifacts (Superpowers skill output mixed into phase output).
- Subagents dispatched by GSD start invoking skills and recurse.

**Phase to address:**
`architecture-decision` (skill-vs-command policy), `core-rebrand` (rewrite using-superpowers-equivalent), `tests-ci` (auto-trigger regression test).

---

### Pitfall 11: Production-grade rigor on a personal tool becomes the project

**What goes wrong:**
Test infrastructure, CI matrices, multi-runtime parity, automated upstream sync, license auditing, install smoke tests — each individually justified — collectively absorb the entire "multi-month build" budget without ever shipping a rebranded framework the user actually uses.

**Why it happens:**
PROJECT.md sets "production-grade" expectation but also "single developer", "personal use", and a "personal-use cost ceiling" constraint. These pull in opposite directions. Rigor compounds: writing the rebrand tool well requires tests; testing the rebrand tool requires fixtures; fixtures need a sample upstream; the sample upstream needs to be kept in sync; …

Concrete inflation risks identified:
- Multi-runtime parity tests for Codex and Gemini *before* Claude Code is rock-solid (PROJECT.md Constraints calls Claude Code "primary").
- Upstream-sync tooling that handles 3-way merges, conflict resolution UI, scriptable rename maps, *and* a CLI for it — when the user could instead pin to a tag and re-run the rebrand from scratch every 2-3 months.
- Snapshot tests for every workflow's output — when the upstream itself doesn't have those.
- A `THIRD-PARTY-LICENSES` check, hook-output integration test, state-leak detection test, license-string CI check, install smoke test, runtime parity test, agent-name coverage manifest. Each is on a rigor-justified pitfall above. Together: an enormous test surface.

**How to avoid:**
- Apply a *cost-of-defect-per-incident* lens at planning time. For each test/automation: estimate (a) how often the failure would happen, (b) how long debugging it manually would take, (c) how long building the test takes. Build it only when (a × b > c).
- Phase ordering should ship a usable rebranded framework EARLY (one runtime, one happy path, manual sync) and add rigor incrementally based on observed pain.
- Cap the upstream-sync tool's v1 scope: rename application + conflict surfacing. Defer 3-way merge UX, deletion-detection-with-confirmation, schema-drift detection to v2 if pain emerges.
- Defer Codex and Gemini parity testing until Claude Code is daily-use stable.
- Re-read PROJECT.md "personal-use cost ceiling" at every milestone close. If a phase is adding maintenance burden without proportional daily-use win, cut it.

**Warning signs:**
- "Production-grade" criterion blocks shipping a working Claude-Code-only oto for >6 weeks.
- Test-writing time exceeds rebrand-feature time across two consecutive milestones.
- The upstream-sync tool grows a config file before ever being used in anger.
- The user finds themselves still switching between GSD and Superpowers because oto isn't ready.

**Phase to address:**
Cross-cutting — applies at every milestone close. Call it out in `architecture-decision` as an explicit guardrail: define MVP scope before scaffolding rigor.

---

## Moderate Pitfalls

### Pitfall 12: Branch-pinned installs (`#main`) drift silently

**What goes wrong:**
`npm install -g github:owner/oto-hybrid-framework` (no ref) installs from `main`. Every machine the user installs on gets a different snapshot. Reproducibility broken.

**How to avoid:**
- Default install instruction in README: `npm install -g github:owner/oto-hybrid-framework#vX.Y.Z`.
- Tag every release. Use semver. Keep tags in sync with `package.json` `version`.
- Add a CI check that the `package.json` version matches the latest tag at release time.
- Consider an `oto --version` self-check that warns when running from main.

**Phase to address:**
`distribution`.

---

### Pitfall 13: Deprecated upstream features carried forward by mistake

**What goes wrong:**
GSD and Superpowers are actively deprecating features. Superpowers v5.0.0 deprecated `/brainstorm`, `/write-plan`, `/execute-plan` slash commands. GSD 1.38.5 marks `gsd-tools.cjs` deprecated in favor of `gsd-sdk query`. A naive rebrand carries deprecated entry points forward and the user unknowingly relies on them, breaking on the next sync when upstream removes them.

**How to avoid:**
- During inventory phase, mark every command/skill/agent with its upstream deprecation status.
- Drop upstream-deprecated surfaces during rebrand — don't carry them. PROJECT.md "Out of Scope" already excludes legacy concerns.
- Track deprecation announcements in the per-upstream BREAKING-CHANGES.md.

**Phase to address:**
`inventory`, `core-rebrand`.

---

### Pitfall 14: Codex's `~/.codex/` and Gemini's runtime paths missed in install

**What goes wrong:**
GSD CHANGELOG 1.38.2 (#2402) records that `checkAgentsInstalled` defaulted to `~/.claude/agents` and reported `agents_installed: false` for Codex/Gemini/Kilo/Cursor/Windsurf/etc. — *every* non-Claude runtime hard-blocked. GSD also had `processAttribution` hardcoded to `'claude'` (1.35.0). These are real bugs that already shipped to users.

**How to avoid:**
- Centralize runtime path resolution in one helper. No runtime-conditional path logic outside it.
- Test install on each supported runtime in CI; assert the post-install marker file exists at the expected runtime-specific location.
- Drop OpenCode, Cursor, Kilo, Windsurf, Augment, Trae, Qwen, Codebuddy, Cline, Antigravity, Copilot from oto (per PROJECT.md scope: Claude Code, Codex, Gemini CLI only). Aggressively delete the install branches for excluded runtimes — every line removed is one fewer rebrand surface and one fewer drift vector.

**Phase to address:**
`runtime-adapters`, `distribution`.

---

### Pitfall 15: Hook injection of literal strings exposes upstream identity

**What goes wrong:**
`hooks/session-start` hardcodes the string `superpowers:using-superpowers` and emits `<EXTREMELY_IMPORTANT>You have superpowers.` directly into the model's context every session. GSD agents similarly inject `gsd-*` identity. Missing one of these in the rebrand means oto announces itself as superpowers/gsd to the model, which then loads upstream identity as ground truth.

**How to avoid:**
- Specifically grep `hooks/`, `agents/`, `skills/` for any user-facing string starting with `<` (XML-style identity blocks) and add them to a hand-reviewed rebrand allowlist.
- After rebrand, run an actual session and capture the SessionStart `additionalContext` payload. Eyeball it for residual upstream identity strings.

**Phase to address:**
`core-rebrand`, `tests-ci`.

---

### Pitfall 16: `package.json` `bin` collisions and shim resolution

**What goes wrong:**
GSD declares `"bin": { "get-shit-done-cc": "bin/install.js", "gsd-sdk": "bin/gsd-sdk.js" }`. The rebrand changes the bin names. If the user has GSD also installed globally (or had it before), `npm install -g` may not cleanly replace it, and PATH may shadow with the wrong binary.

**How to avoid:**
- Pick distinct bin names that cannot collide with GSD: `oto`, `oto-sdk` (not `gsd-sdk`).
- Document install instruction including `npm uninstall -g get-shit-done-cc` if the user previously had GSD.
- The rebrand test should `npm install` into a clean prefix (`npm install -g --prefix /tmp/oto-test`) to validate isolation.

**Phase to address:**
`distribution`.

---

### Pitfall 17: GSD's `model: inherit` and Superpowers' `model: inherit` semantics differ across runtimes

**What goes wrong:**
Superpowers' `agents/code-reviewer.md` declares `model: inherit`. GSD agents declare specific `tools:` and `color:` fields. Across Codex/Gemini, the `model` field semantics differ — Codex has worker roles, Gemini has no subagent system. Hand-rebrand may silently drop these or rebind to the wrong model.

**How to avoid:**
- Validate frontmatter shape per runtime. Maintain a `frontmatter-schema.json` for agents, skills, and commands. Run schema validation in CI.
- Document the model-inherit semantics for each runtime. If Gemini ignores it, document that explicitly.

**Phase to address:**
`runtime-adapters`.

---

## Minor Pitfalls

### Pitfall 18: Translated READMEs become rebrand sinks

GSD ships `README.ja-JP.md`, `README.ko-KR.md`, `README.pt-BR.md`, `README.zh-CN.md`. Rebranding 4 languages of marketing copy is pure cost for a personal tool. **Action:** delete during inventory.

### Pitfall 19: `.cursor-plugin/`, `.opencode/`, OpenCode plugin shape

Superpowers ships `.opencode/plugins/superpowers.js` as the package main (per `package.json`). The OpenCode plugin shape may bleed into other runtimes' loading. **Action:** scrub OpenCode artifacts entirely; verify no other runtime's loader trips on `.opencode/` presence.

### Pitfall 20: GSD bash hooks with `{{GSD_VERSION}}` token substitution

Per CHANGELOG 1.38.5, GSD's `.sh` hooks contain `# gsd-hook-version: {{GSD_VERSION}}` and the installer substitutes the token. Forgetting the substitution path during rebrand = stale-hook-warning loop on every session.

### Pitfall 21: Identity collision: both have `code-reviewer` agent

GSD has `gsd-code-reviewer.md`, Superpowers has `code-reviewer.md` (frontmatter `name: code-reviewer`). After rebrand, both become `oto-code-reviewer` — file collision OR identity collision in dispatch. **Action:** detect during inventory, decide canonical version, drop or merge the other.

### Pitfall 22: GSD's `gsd-tools.cjs` deprecation creates a moving target

CHANGELOG 1.38.5 deprecates `gsd-tools.cjs` in favor of `gsd-sdk query`. Some commands still call CJS (intel `state validate`, `audit-open`, `graphify`, `from-gsd2`). Mid-migration upstream → oto inherits the inconsistency. **Action:** wait until upstream completes the migration before forking the SDK shim, OR commit to the dual path during rebrand.

### Pitfall 23: `node_modules` checked-in vs. zero-dep brainstorm server

Superpowers v5.0.2 removed all vendored `node_modules` from the brainstorm server. v5.0.1 still had them. Pinning to v5.0.7 avoids this, but the brainstorm-server skill's `scripts/` directory is now zero-dep — simplifies rebrand but means oto can't easily upgrade brainstorm-server features without re-vendoring.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `sed -i 's/gsd/oto/g'` global rebrand | 5-minute rebrand pipeline v0 | Corrupts URLs, comments, license attribution; breaks runtime IDs; impossible to detect what failed | NEVER — even for prototype, use word-boundary matching |
| Skip `prepare` script, build SDK manually before commit | Fast iteration during rebrand-tooling phase | Every fresh GitHub install fails; user rage; eventual emergency hotfix | Only during local dev; must be fixed before first tag |
| Carry forward all 14 GSD runtimes "just in case" | No deletion work | Every rebrand rule applies to 11 unused runtimes; install.js stays 800 lines; runtime-adapter test matrix expands | NEVER — PROJECT.md scope is 3 runtimes |
| Single CLAUDE.md/AGENTS.md/GEMINI.md, hand-edit | No build step | They drift; bug only shows on the runtime you used last week | Acceptable while there's only one bootstrap doc per runtime AND the docs are <50 lines each |
| Skip three-way merge in upstream-sync v1 | Ship sync tool faster | Every sync = manual conflict triage on overlapping edits | Acceptable v1; cap upstream sync frequency to reduce pain |
| Pin to `#main` instead of tags during dev | Get latest GSD/Superpowers fixes immediately | Reproducibility lost; can't rollback; "works on my machine" diverges | Acceptable for local-only dev; never for the published install instruction |
| Skip license-attribution CI check | One less test to write | Silent MIT violation; reputational risk if public | Acceptable IF `THIRD-PARTY-LICENSES.md` is ALWAYS present and updated by hand at every sync |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code SessionStart hook | Emitting both `additional_context` and `hookSpecificOutput.additionalContext` causing duplication | Detect platform via env vars (`CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `COPILOT_CLI`); emit only the matching field (per Superpowers session-start lines 46-55) |
| Codex agent dispatch | Assuming `Task(subagent_type=...)` works as in Claude Code | Codex uses `spawn_agent` with worker roles; map per per-agent in install.js (existing CODEX_AGENT_SANDBOX pattern) |
| Gemini CLI extension | Assuming subagent dispatch is available | Gemini CLI lacks subagent support; skills fall back to `executing-plans` (per Superpowers v5.0.1); design oto workflows so any subagent dispatch has an inline-equivalent fallback |
| GitHub git-install lifecycle | Expecting `prepublishOnly` to run on `npm install <git>` | Use `prepare` script (runs on both publish AND git-install) |
| Hooks across runtimes | One `hooks.json` for all runtimes | Cursor needs `hooks-cursor.json` (camelCase); Copilot CLI needs SDK-standard `additionalContext`; per-runtime hook files |
| Upstream `.planning/` resolver in monorepos | Using cwd to find state root | Walk parent dirs looking for the canonical state dir (per GSD's `findProjectRoot` fix #2623) |
| Skill discovery (Claude Code) | Reading skill files directly with Read tool | Use Skill tool — it loads skill content as system context (per Superpowers 4.0.1 fix) |

---

## Performance Traps

Most performance traps from the upstreams (e.g., GSD's context-cost sizing, prompt thinning for sub-200K models) target the agent's context window, not user-perceived latency. For a personal tool, the relevant traps:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-dispatch context bloat from un-minified agent files | Slow first turn after `Task()`; high token usage per workflow | Use `@file` includes for shared boilerplate (per GSD's `references/mandatory-initial-read.md` pattern, CHANGELOG 1.37.0 #2361) | When daily workflows trigger 5+ subagent dispatches |
| Loading all 13 Superpowers skills into context at session start | High SessionStart token cost; slow first response | Use Skill tool for lazy load; only `using-superpowers`-equivalent in SessionStart context | Always — fix from day one |
| Re-reading the same file multiple times within a workflow | Visible "Read tool called 5x on same file" in transcript | Add no-re-read rules to top agents (per GSD CHANGELOG 1.37.0 #2346, #2312) | Multi-step workflows on large files (>500 lines) |
| Synchronous SessionStart hook blocking TUI | Terminal freezes for 1-3 seconds on Windows; "frozen on session start" | Async hook on Windows; sync hook elsewhere (per Superpowers v4.2.0 fix #404) | Windows/MSYS only — but oto MAY support Windows? confirm with user, otherwise non-issue |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Installing `npm install -g github:owner/repo` runs arbitrary `prepare`/`postinstall` scripts | If the repo is compromised, install runs attacker code with user perms | This IS the threat model for personal-use; mitigation: only install from your own github account; pin to specific tags; audit `prepare` script before each install |
| Hooks execute arbitrary shell on every SessionStart | Compromised hook = persistent code execution per session | Sign or hash hooks; installer warns on hook hash mismatch (GSD's stale-hook-version pattern is one-step from this) |
| Prompt injection via file content read by skills | A malicious file read by an agent contains prompt injection that hijacks the workflow | GSD ships `gsd-read-injection-scanner` PostToolUse hook (CHANGELOG 1.37.0 #2201). Port it. |
| Secrets in `.planning/` committed to git | API keys, paths, etc. leaked publicly when user pushes | Add `.oto/` (or whatever) to user's gitignore template; the `new-project` flow should write `.gitignore` lines |
| Codex sandbox levels wrong per agent | Read-only agent gets workspace-write; can mutate project unexpectedly | Test sandbox map per agent (existing GSD `CODEX_AGENT_SANDBOX` pattern in `bin/install.js`) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Inconsistent slash-command prefix (`/oto-do` vs `/oto:do`) | User types one form, runtime resolves the other, gets confusing "command not found" | Per GSD #2697: `/oto-<cmd>` for user-typed slash commands; `oto:<cmd>` reserved for internal `Skill()` calls. Pick one user-facing form, document loudly. |
| Error messages still say "GSD" / "superpowers" | User confusion, identity drift | Audit error strings as part of rebrand acceptance test |
| Help docs reference upstream URLs | Clicking "see https://github.com/gsd-build/..." in oto's `--help` | Rewrite all help URLs to oto repo or to canonical upstream (acknowledge fork explicitly) |
| Stale-hook warnings on every session after upgrade | User ignores warning OR installer re-runs unnecessarily | GSD's `# gsd-hook-version: {{GSD_VERSION}}` pattern + version-aware stale detector (CHANGELOG 1.38.5 #2136) |
| User upgrades upstream and oto silently breaks | Workflow that was working last week now fails opaquely | After every upstream sync, run a smoke test BEFORE swapping the rebranded tree into place |

---

## "Looks Done But Isn't" Checklist

- [ ] **Rebrand:** Search the rebranded tree for `gsd`, `GSD`, `get-shit-done`, `superpowers`, `Superpowers` case-insensitive. Excluding `foundation-frameworks/`, `LICENSE*`, and `THIRD-PARTY-LICENSES.md`, count must be 0.
- [ ] **Agent IDs:** Coverage manifest of every agent's `name:` frontmatter matches every dispatch reference (`subagent_type=`, `Task(subagent_type=`, etc.) across `agents/`, `commands/`, workflows.
- [ ] **Skill cross-refs:** Every `oto:<skill>` reference in any file has a corresponding `name: <skill>` SKILL.md. No dangling references.
- [ ] **Slash commands:** Every `/oto-<cmd>` referenced in docs or workflow output has a corresponding `commands/oto/<cmd>.md` (or equivalent).
- [ ] **Hooks:** SessionStart on each runtime emits exactly one identity block, in the correct JSON shape per runtime.
- [ ] **State paths:** No file under the rebranded tree references `.planning/` (except in `foundation-frameworks/` archive).
- [ ] **Install:** `npm install -g github:owner/oto-hybrid-framework#vX.Y.Z` on a clean machine produces a working `oto` and `oto-sdk` binary on PATH; first command runs without error.
- [ ] **License:** Both `Lex Christopherson` and `Jesse Vincent` copyright strings present somewhere in the repo (likely `THIRD-PARTY-LICENSES.md`).
- [ ] **Codex:** `oto` install + a one-shot workflow on Codex completes without "tool not found" errors and writes state to canonical location.
- [ ] **Gemini:** `oto` install + a one-shot workflow on Gemini CLI completes; subagent-requiring workflows fall back to inline mode without hard-erroring.
- [ ] **Upstream sync:** Pulling latest GSD or Superpowers and running the sync tool (a) detects every renamed/added/deleted file, (b) surfaces conflicts on overlapping edits, (c) does NOT silently overwrite local edits.
- [ ] **Tests:** CI matrix runs on Node 22 AND Node 24 (per GSD's CI matrix change in 1.34.2).
- [ ] **Bootstrap:** SessionStart hook output captured as a snapshot fixture; manually reviewed for residual upstream identity strings; locked as regression baseline.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Naive `gsd→oto` rebrand corrupted URLs / license / comments | MEDIUM | `git reset --hard` to pre-rebrand commit; rewrite rebrand engine with rule types; re-run; diff against the corrupted attempt to verify the new run only changes intended sites |
| Renamed agent ID, dispatch fails | LOW | Grep for old ID across rebranded tree; usually a single missed reference; add to coverage manifest going forward |
| `.planning/` reference missed, SDK can't find project root | LOW | Grep for `.planning` (excluding `foundation-frameworks/`); fix the missed reference; centralize path constant if not already done |
| GitHub install fails because `sdk/dist/` missing | LOW | Add `prepare` script; tag a new patch version; tell users to reinstall |
| Upstream sync 3-way conflict misapplied | HIGH | Roll back via git; re-run sync against the last-known-good `last-synced-commit` marker; resolve conflicts manually; re-record the marker only after smoke tests pass |
| Two state systems leaking into each other (mid-workflow data corruption) | HIGH | This is why the architecture-decision phase MUST resolve state-system canonicalization before any rebrand. If it leaks at runtime: pause workflows, manually reconcile state files, decide canonical location, refactor. |
| License attribution silently lost | LOW | Restore `THIRD-PARTY-LICENSES.md` from upstream LICENSE files; add CI check to prevent recurrence |
| Personal-use rigor inflation, user back to switching frameworks | HIGH | Re-scope: cut the rigor surface. Ship Claude-Code-only oto with manual sync. Add Codex/Gemini once daily-use stable. Re-read PROJECT.md "personal-use cost ceiling" |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. `gsd` substring collisions | `rebrand-tooling`, `core-rebrand` | Rule-typed rename engine; dry-run report reviewed; post-rebrand grep returns 0 hits |
| 2. Internal IDs broken | `inventory`, `core-rebrand`, `tests-ci` | Pre/post coverage manifest; round-trip test |
| 3. `.planning/` path drift | `architecture-decision`, `core-rebrand`, `tests-ci` | State-write integration test |
| 4. Upstream-sync volatility | `upstream-sync`, `tests-ci` | Three-way merge tool; per-upstream BREAKING-CHANGES.md; post-sync regression suite |
| 5. GitHub install missing build artifacts | `distribution`, `tests-ci` | Clean-machine install smoke test in CI on Node 22 + 24 |
| 6. License/attribution lost | `rebrand-tooling`, `docs`, `tests-ci` | Do-not-touch path list; CI license-string check |
| 7. Multi-runtime instruction drift | `runtime-adapters`, `tests-ci` | Single-source bootstrap generator; per-runtime parity test |
| 8. Hook ordering / two SessionStart blocks | `architecture-decision`, `core-rebrand`, `tests-ci` | Hook-output integration test |
| 9. Two state systems leak | `architecture-decision`, `core-rebrand`, `tests-ci` | State-leak detection test |
| 10. Skill auto-load vs. command flow | `architecture-decision`, `core-rebrand`, `tests-ci` | Auto-trigger regression test |
| 11. Personal-use overengineering | All milestone closes | PROJECT.md cost-ceiling re-read; MVP-first ordering enforced |
| 12. Branch-pinned installs drift | `distribution` | Tags + version-self-check; documented install instruction |
| 13. Deprecated upstream features carried | `inventory`, `core-rebrand` | Per-surface deprecation status during inventory |
| 14. Runtime path detection wrong | `runtime-adapters`, `distribution` | Centralized path resolver; per-runtime install CI |
| 15. Identity strings in hook injections | `core-rebrand`, `tests-ci` | SessionStart-output snapshot fixture |
| 16. `package.json` `bin` collisions | `distribution` | Distinct bin names; clean-prefix install test |
| 17. `model: inherit` semantics drift | `runtime-adapters` | Frontmatter schema validation in CI |
| 18. Translated READMEs | `inventory` | Drop list documented |
| 19. OpenCode artifacts | `inventory` | Scrub list documented |
| 20. Bash hook version tokens | `core-rebrand` | Installer token-substitution path tested |
| 21. `code-reviewer` agent collision | `inventory`, `architecture-decision` | Decision logged; one canonical version chosen |
| 22. CJS vs SDK migration moving target | `architecture-decision` | Single decision: fork CJS path OR follow SDK migration |
| 23. Brainstorm server vendoring | `inventory` | Pin to v5.0.7+ explicitly noted |

---

## Sources

- `foundation-frameworks/get-shit-done-main/CHANGELOG.md` — direct inspection, especially v1.32.0–v1.38.5 release notes documenting recent bugs and refactors (#2697, #2402, #2400, #2406, #2441, #2453, #2623, #2179, #2122, #2118, #2136, #2206, #2209, #2210, #2212, #2361, #2363, #2368, #2517).
- `foundation-frameworks/superpowers-main/RELEASE-NOTES.md` — v3.0.0–v5.0.7 documenting skill system migration, OpenCode→native skills shift, brainstorm server zero-dep refactor, multi-runtime hook fixes (#572, #571, #553, #700, #737, #677, #565, #404, #413, #518, #285, #243, #226, #232, #331).
- `foundation-frameworks/get-shit-done-main/bin/install.js` lines 1-120 — Codex sandbox map, Copilot tool mapping, runtime flag parsing.
- `foundation-frameworks/get-shit-done-main/hooks/gsd-phase-boundary.sh` — concrete `.planning/` hardcoding evidence.
- `foundation-frameworks/superpowers-main/hooks/session-start` — concrete `<EXTREMELY_IMPORTANT>` and `superpowers:using-superpowers` literal-string injection evidence.
- `foundation-frameworks/superpowers-main/hooks/hooks.json` — `CLAUDE_PLUGIN_ROOT` env-var dependency.
- `foundation-frameworks/get-shit-done-main/package.json` — `prepublishOnly` build step, `engines.node`, bin names.
- `foundation-frameworks/superpowers-main/package.json` — OpenCode plugin shape (`main: ".opencode/plugins/superpowers.js"`, `type: module`).
- LICENSE files of both upstreams — copyright strings to preserve.
- `.planning/PROJECT.md` — personal-use cost ceiling, runtime scope, "production-grade" definition.

---
*Pitfalls research for: oto-hybrid-framework — Pitfalls dimension*
*Researched: 2026-04-27*
