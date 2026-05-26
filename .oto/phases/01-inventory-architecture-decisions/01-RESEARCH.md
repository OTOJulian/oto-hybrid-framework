# Phase 1: Inventory & Architecture Decisions - Research

**Researched:** 2026-04-27
**Domain:** Documentation-only phase — produce inventory + ADR set + rebrand-map schema before any code touches the rebranded tree
**Confidence:** HIGH (every count and identifier below verified by direct filesystem inspection of `foundation-frameworks/get-shit-done-main/` v1.38.5 and `foundation-frameworks/superpowers-main/` v5.0.7)

---

## Summary

Phase 1 is a pure documentation/decision phase. CONTEXT.md already locks 23 architectural decisions (D-01..D-23) covering state-root, env-var prefix, skill-vs-command routing, SessionStart consolidation, agent collisions, internal namespace, rename-map schema, license attribution, and inventory scope. **Research's job is not to revisit those** — it is to surface the concrete filesystem reality the decisions will be applied against, so plans don't fail at execution time on missed identifiers, undercounts, or unclassified files.

The most important findings:

1. **CONTEXT.md's env-var list (D-04) is incomplete.** GSD upstream uses **37 distinct `GSD_*` env-var names**, not 5. The rename-map must enumerate all 37 (or use a prefix rule with documented exceptions) — otherwise post-rebrand strings like `GSD_INSTALL_DIR`, `GSD_PLUGIN_ROOT`, `GSD_COPILOT_INSTRUCTIONS_MARKER` survive into oto's runtime.
2. **GSD has 86 commands, not 89.** The 89-figure in research/SUMMARY.md included a few count-style discrepancies (`/gsd-extract_learnings` underscore vs hyphen, missing some). Verified count: `commands/gsd/*.md` = 86 files.
3. **GSD has 86 workflows, not 88.** `get-shit-done/workflows/*.md` = 86 (including 8 workflow-only files that have no command shim). Two directory entries (`discuss-phase`, `execute-phase`) are subdirectories, not files — the count was inflated by counting directory entries rather than markdown files.
4. **The agent count is exactly 33.** D-12's keep/drop math (drop 4 AI agents + 2 doc agents + 4 niche agents = 10; keep 23) is consistent with the actual file list.
5. **Internal-ID surface is larger than expected.** 97 `subagent_type=` references across the GSD tree (76 in `agents/` + workflows; 21 unrelated `general-purpose`/`generalPurpose` references in `bin/install.js` documentation strings that should NOT be renamed). Plus a hardcoded `gsd_state_version` frontmatter key in STATE.md and `state.cjs`.
6. **Translated/runtime drops are concrete:** 4 translated READMEs in GSD; full `.opencode/` + `.opencode-plugin/` (Superpowers does NOT have `.opencode-plugin/` but DOES have `.opencode/` with the load-bearing `.opencode/plugins/superpowers.js`); `.cursor-plugin/` in Superpowers; GSD's `assets/gsd-logo-*` (4 files).
7. **No CHANGELOG-marked deprecation auto-detector exists.** D-23 mandates `deprecation_status` per inventory entry, but identifying deprecated upstream surfaces requires reading CHANGELOG/RELEASE-NOTES manually. Plan must include a discrete CHANGELOG-scan task.
8. **License source texts confirmed verbatim.** GSD: `Copyright (c) 2025 Lex Christopherson` (LICENSE line 3). Superpowers: `Copyright (c) 2025 Jesse Vincent` (LICENSE line 3). Both LICENSE files are 1075 / 1070 bytes, identical MIT body except for copyright line.

**Primary recommendation:** Plan 13 ADRs + 1 agent-audit + 1 inventory (JSON+MD) + 1 rename-map JSON-schema spec + 2 license files = **18 deliverable artifacts**, organized in 3 plans (decisions, inventory generation, rename-map+licenses).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

User delegated all gray-area choices to Claude ("you decide on all of these gray areas"). Decisions below are LOCKED. Planner treats each as a fact unless the user explicitly revisits.

**State Directory & Path Renaming (ARCH-01, Pitfall 3, Pitfall 9)**
- **D-01:** Canonical state root is `.oto/` (replaces GSD's `.planning/`). Single root subsumes both upstreams' state notions; Superpowers' parallel `docs/superpowers/specs/` is dropped.
- **D-02:** `.planning/` → `.oto/` is a `path` rule, not a bare-word rule. Match only path-shaped occurrences (`\.planning/`, `^\.planning$`, quoted variants). Bare word "planning" is left untouched.

**Identifier & Env-Var Renaming Policy (Pitfall 1)**
- **D-03:** Full rebrand depth — `GSD_*` env vars rename to `OTO_*` in lockstep with `/gsd-*` → `/oto-*` and identifier renames.
- **D-04:** Specific env-var renames: `GSD_VERSION` → `OTO_VERSION`, `GSD_PORTABLE_HOOKS` → `OTO_PORTABLE_HOOKS`, `GSD_RUNTIME` → `OTO_RUNTIME`, `GSD_AGENTS_DIR` → `OTO_AGENTS_DIR`, `GSD_TOOLS_PATH` → `OTO_TOOLS_PATH`, **plus any others surfaced by inventory grep** (this research surfaces 32 additional names — see §Env-Var & Identifier Surface). Hook version token `{{GSD_VERSION}}` → `{{OTO_VERSION}}`. Runtime-detection env vars owned by Claude/Codex/Gemini themselves (`CLAUDE_PLUGIN_ROOT`, `CODEX_HOME`, `GEMINI_CONFIG_DIR`) on do-not-rename allowlist.

**Skill-vs-Command Routing (ARCH-02)**
- **D-05:** `/oto-<cmd>` is user-typed slash command surface. `oto:<skill-name>` reserved for `Skill()` calls inside agents.
- **D-06:** Workflow wins for in-progress work. `using-oto` bootstrap defers to `.oto/STATE.md`. Concrete overlap table in `decisions/skill-vs-command.md`.

**Internal Skill Namespace (ARCH-05)**
- **D-07:** Internal namespace is `oto:<skill-name>` (colon separator).

**SessionStart Hook Consolidation (ARCH-03, Pitfall 8)**
- **D-08:** Single SessionStart entrypoint: oto consolidates GSD's `gsd-session-state` and Superpowers' `session-start` into one hook (`oto-session-start`). Emits exactly one identity block per session.
- **D-09:** SessionStart-output snapshot fixture is the regression baseline (locked in Phase 5/10; *contract* — exactly one identity block, no upstream-identity leakage — decided here).

**Agent Collision Resolution (ARCH-04, AGT-02, Pitfall 21)**
- **D-10:** Drop Superpowers' `code-reviewer` example agent. Keep `gsd-code-reviewer` (rebranded to `oto-code-reviewer`).
- **D-11:** Other collisions during inventory get one canonical version.

**Agent Trim Depth (AGT-01)**
- **D-12:** Moderate trim — target 23 retained agents from GSD's 33. Drop policy:
  - **Drop AI/eval (4):** `gsd-ai-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-framework-selector`
  - **Drop redundant doc (2):** `gsd-doc-classifier`, `gsd-doc-synthesizer`
  - **Drop niche/v2 (4):** `gsd-pattern-mapper`, `gsd-intel-updater`, `gsd-user-profiler`, `gsd-debug-session-manager`
  - **Keep phase spine (16):** `oto-planner`, `oto-executor`, `oto-verifier`, `oto-debugger`, `oto-project-researcher`, `oto-phase-researcher`, `oto-roadmapper`, `oto-research-synthesizer`, `oto-plan-checker`, `oto-code-reviewer`, `oto-code-fixer`, `oto-codebase-mapper`, `oto-doc-writer`, `oto-doc-verifier`, `oto-integration-checker`, `oto-nyquist-auditor`
  - **Keep audits (2):** `oto-security-auditor`, `oto-assumptions-analyzer`
  - **Keep researchers (2):** `oto-advisor-researcher`, `oto-domain-researcher`
  - **Keep UI (3):** `oto-ui-researcher`, `oto-ui-checker`, `oto-ui-auditor`
  - Final keep count: **23 agents.**

**File Inventory Format (ARCH-06)**
- **D-13:** Dual format — `decisions/file-inventory.json` (machine-readable, source of truth) + `decisions/file-inventory.md` (generated index). Schema: `{path, upstream: "gsd"|"superpowers", verdict: "keep"|"drop"|"merge", reason, target_path?, deprecation_status?}`.

**Decision File Format (DOC-05)**
- **D-14:** Lightweight ADR format. Numbered sequentially `ADR-NN-<kebab-slug>.md`. Sections: `# ADR-NN: <Title>`, `Status:`, `Date:`, `Context:`, `Decision:`, `Rationale:`, `Consequences:`. Deferred ideas get `Status: Deferred`.

**Rename Map Schema (REB-02)**
- **D-15:** `rename-map.json` at repo root, rule-typed with rules block (`identifier`, `path`, `command`, `skill_ns`, `package`, `url`, `env_var`), `do_not_rename` allowlist, `deprecated_drop` list. Phase 2 builds engine + JSON-Schema validator.

**GitHub Distribution & Bin Names**
- **D-16:** GitHub owner `julianisaac`, repo `oto-hybrid-framework`. Provisional — confirm GitHub username before Phase 2 closes.
- **D-17:** Bin command for v1: `oto` only. No `oto-sdk`.

**SDK Strategy (Pitfall 5, Pitfall 22)**
- **D-18:** Drop `sdk/` subpackage from v1. Fork GSD's pre-existing CJS path (`get-shit-done/bin/gsd-tools.cjs`) as `oto/bin/lib/oto-tools.cjs`. Zero TypeScript at top level for v1.
- **D-19:** SDK is v2. Logged as `decisions/ADR-NN-sdk-deferred.md` with `Status: Deferred`.

**License & Attribution (FND-06, Pitfall 6)**
- **D-20:** `LICENSE` at repo root: MIT, `Copyright (c) 2026 Julian Isaac`.
- **D-21:** `THIRD-PARTY-LICENSES.md` at repo root: both upstream MIT licenses verbatim, with `Copyright (c) 2025 Lex Christopherson` (GSD) and `Copyright (c) 2025 Jesse Vincent` (Superpowers) preserved exactly. Both files added to `do_not_rename` allowlist.
- **D-22:** Inline upstream copyright comments in any ported source file: preserve unmodified.

**Inventory Scope (Pitfall 13, 18, 19)**
- **D-23:** File inventory covers every file under both `foundation-frameworks/` upstreams. Translated READMEs marked `drop`. OpenCode artifacts marked `drop`. Cursor/Windsurf/etc. plugin manifests marked `drop`. Upstream-deprecated surfaces marked with `deprecation_status` populated.

### Claude's Discretion
User said "you decide on all of these gray areas." Decisions D-03, D-12, D-13, D-14, D-15, D-16, D-17, D-18 reflect Claude's judgment grounded in research. User retains override during planning.

### Deferred Ideas (OUT OF SCOPE)
- **`oto-sdk` programmatic API** — v2 (SDK-01..03)
- **Three-way merge in upstream sync** — v2
- **Codex/Gemini parity hardening** — Phase 8
- **Windows support** — Out of scope (REQUIREMENTS.md)
- **GitHub owner verification** — D-16 assumes `julianisaac`. Update before Phase 2 closes if differs.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Canonical state directory name decided and locked (`.oto/`) | D-01, D-02 — research confirms `.planning/` appears in 90+ files; `.oto/` is the chosen replacement; ADR-01 captures choice |
| ARCH-02 | Skill-vs-command routing policy documented in `decisions/skill-vs-command.md` | D-05, D-06 — research confirms 76 `superpowers:` namespaced refs upstream and the 14 overlapping conceptual pairs from FEATURES.md §3.3 that need explicit routing; ADR-03 + skill-vs-command.md |
| ARCH-03 | Single consolidated SessionStart hook decided (replaces both upstreams') | D-08, D-09 — research confirms GSD has `gsd-session-state.sh` and Superpowers has `hooks/session-start` (extensionless) — both register on SessionStart with non-deduped `additionalContext`. ADR-04 |
| ARCH-04 | Agent ID collision resolution documented | D-10, D-11 — only confirmed collision is `code-reviewer` (Superpowers) vs `gsd-code-reviewer` (GSD); ADR-05 |
| ARCH-05 | Internal skill namespace decided (`oto:<skill-name>`) | D-07 — research confirms 76 `superpowers:<skill>` references upstream; namespace must be renamed; ADR-06 |
| ARCH-06 | File inventory complete | D-13, D-23 — research provides exact file counts (982 files in GSD upstream, 146 in Superpowers); inventory generation task |
| AGT-01 | Audit GSD's 33 agents — keep, drop, or merge each, in `decisions/agent-audit.md` | D-12 — research confirms exact 33 agents, lists each, validates D-12's drop math (4+2+4=10 drop / 23 keep) |
| REB-02 | `rename-map.json` schema with explicit before/after for every internal ID, command name, agent name, skill namespace | D-15 — research provides full env-var list (37 names), full command list (86), full agent list (33), full skill list (14), full namespace ref list (76) — all inputs to schema design |
| DOC-05 | `decisions/` directory containing architecture decisions | D-14 — research provides ADR template; recommends 13 ADRs (see §Decision File Count Recommendation) |
| FND-06 | License attribution preserved | D-20, D-21, D-22 — research extracts exact copyright lines verbatim |
</phase_requirements>

---

## Inventory Counts (concrete, from filesystem)

All counts verified via `ls`/`find` against the in-repo upstream copies.

### GSD v1.38.5 (`foundation-frameworks/get-shit-done-main/`)

| Category | Count | Path |
|----------|-------|------|
| **Total files (excl. node_modules)** | **982** | `find . -type f -not -path './node_modules/*'` |
| Agents (`gsd-*.md`) | **33** | `agents/` |
| Slash commands | **86** | `commands/gsd/*.md` (NOT 89 as in SUMMARY.md) |
| Workflows | **86** | `get-shit-done/workflows/*.md` (incl. 8 workflow-only entries) |
| References | **52** | `get-shit-done/references/` |
| Templates | **46** | `get-shit-done/templates/` (recursive — includes `codebase/` and `research-project/` subdirs) |
| Contexts | **3** | `get-shit-done/contexts/` (`dev.md`, `research.md`, `review.md`) |
| Hooks | **11** | `hooks/` |
| Library `.cjs` | **31** | `get-shit-done/bin/lib/` (D-18 forks `gsd-tools.cjs` from this layer) |
| Scripts | **9** | `scripts/` (build-hooks, fix-slash-commands, gen-inventory-manifest, lint-no-source-grep, run-tests, base64-scan, prompt-injection-scan, secret-scan, verify-tarball-sdk-dist) |
| Tests | **299** | `tests/*.test.cjs` |
| SDK files | **189** | `sdk/` (full subpackage — D-18 drops entire `sdk/` from v1) |
| Translated READMEs | **4** | `README.{ja-JP,ko-KR,pt-BR,zh-CN}.md` (D-23 drop) |
| Logo assets | **5** | `assets/gsd-logo-*` (4 files) + `terminal.svg` (D-23 drop logos; keep `terminal.svg` review-required) |

### Superpowers v5.0.7 (`foundation-frameworks/superpowers-main/`)

| Category | Count | Path |
|----------|-------|------|
| **Total files (excl. node_modules)** | **146** | `find . -type f -not -path './node_modules/*'` |
| Skills | **14** | `skills/` (each is a directory with `SKILL.md` + optional refs/scripts) |
| Agents | **1** | `agents/code-reviewer.md` (D-10 drop) |
| Slash commands | **3** | `commands/{brainstorm,execute-plan,write-plan}.md` (all deprecated stubs — drop) |
| Hook files | **4** | `hooks/{hooks.json, hooks-cursor.json, run-hook.cmd, session-start}` |
| Plugin manifests | **5** | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.opencode/plugins/superpowers.js` |
| Plugin install docs | **2** | `.codex/INSTALL.md`, `.opencode/INSTALL.md` |
| Tests | **48** | `tests/` (skill-eval pressure tests, opencode tests, brainstorm-server tests — D-23 drop) |
| Docs | **17** | `docs/` (16 markdown + 1 `README.codex.md` + `README.opencode.md`) |

### Translated/Deprecated/Runtime Drops (concrete D-23 inputs)

| Drop set | Path(s) | Count | Reason |
|----------|---------|-------|--------|
| Translated READMEs (GSD) | `README.{ja-JP,ko-KR,pt-BR,zh-CN}.md` | 4 | Personal use, English only |
| Logo assets (GSD) | `assets/gsd-logo-2000-transparent.png/svg`, `assets/gsd-logo-2000.png/svg` | 4 | Branding artifacts; `terminal.svg` review-required (may be reusable) |
| Superpowers logo | `assets/superpowers-small.svg`, `assets/app-icon.png` | 2 | Branding artifacts |
| OpenCode (Superpowers) | `.opencode/INSTALL.md`, `.opencode/plugins/superpowers.js` | 2 | OpenCode runtime out of scope (Pitfall 19) |
| Cursor plugin (Superpowers) | `.cursor-plugin/plugin.json` | 1 | Cursor runtime out of scope |
| Marketplace manifests | `.claude-plugin/marketplace.json` | 1 | Marketplace distribution out of scope (we use `npm install -g github:`) |
| Plugin install docs (Superpowers) | `.codex/INSTALL.md`, `.opencode/INSTALL.md` | 2 | Manual symlink instructions; oto uses installer |
| Contributor docs (Superpowers) | `CLAUDE.md`, `CODE_OF_CONDUCT.md`, `RELEASE-NOTES.md`, `CONTRIBUTING.md` (if present) | 4 | Repo-maintainer-facing, not runtime guidance |
| Test harnesses (Superpowers) | `tests/` (48 files) | 48 | Maintainer skill-eval infrastructure |
| Test harness (GSD) | `tests/*.test.cjs` (299 files) | 299 | Will be re-derived under oto's own surface in Phase 10; all 299 tests inventoried as `drop` for v1 (note: GSD-bug-NNNN tests are upstream-specific) |
| GSD docs translation | `docs/zh-CN/` (if present) | varies | Translated reference docs, drop |
| Polyglot Windows wrapper | `superpowers-main/hooks/run-hook.cmd` | 1 | Windows out of scope (REQUIREMENTS.md) |
| Cursor hooks config | `superpowers-main/hooks/hooks-cursor.json` | 1 | Cursor runtime out of scope |
| GSD CHANGELOG-marked deprecated commands (require manual CHANGELOG scan) | TBD — see §Open Questions Q1 | — | Pitfall 13 |

**Total estimated drop count:** ~370 files (heavily skewed by GSD's 299-file test suite). **Total keep+merge target:** ~750 files from upstream → ~250–300 files in oto/ tree after the trim.

---

## Concrete File Lists (for inventory generation)

### GSD Agents (33 total — verified)

```
gsd-advisor-researcher.md       gsd-domain-researcher.md         gsd-plan-checker.md
gsd-ai-researcher.md            gsd-eval-auditor.md              gsd-planner.md
gsd-assumptions-analyzer.md     gsd-eval-planner.md              gsd-project-researcher.md
gsd-code-fixer.md               gsd-executor.md                  gsd-research-synthesizer.md
gsd-code-reviewer.md            gsd-framework-selector.md        gsd-roadmapper.md
gsd-codebase-mapper.md          gsd-integration-checker.md       gsd-security-auditor.md
gsd-debug-session-manager.md    gsd-intel-updater.md             gsd-ui-auditor.md
gsd-debugger.md                 gsd-nyquist-auditor.md           gsd-ui-checker.md
gsd-doc-classifier.md           gsd-pattern-mapper.md            gsd-ui-researcher.md
gsd-doc-synthesizer.md          gsd-phase-researcher.md          gsd-user-profiler.md
gsd-doc-verifier.md             gsd-plan-checker.md              gsd-verifier.md
gsd-doc-writer.md
```

D-12 verdict mapping (33 → 23):

| Verdict | Count | Agents |
|---------|-------|--------|
| **DROP — AI/eval** | 4 | `gsd-ai-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-framework-selector` |
| **DROP — redundant doc** | 2 | `gsd-doc-classifier`, `gsd-doc-synthesizer` |
| **DROP — niche/v2** | 4 | `gsd-pattern-mapper`, `gsd-intel-updater`, `gsd-user-profiler`, `gsd-debug-session-manager` |
| **KEEP — phase spine** | 16 | `gsd-planner`, `gsd-executor`, `gsd-verifier`, `gsd-debugger`, `gsd-project-researcher`, `gsd-phase-researcher`, `gsd-roadmapper`, `gsd-research-synthesizer`, `gsd-plan-checker`, `gsd-code-reviewer`, `gsd-code-fixer`, `gsd-codebase-mapper`, `gsd-doc-writer`, `gsd-doc-verifier`, `gsd-integration-checker`, `gsd-nyquist-auditor` |
| **KEEP — audits** | 2 | `gsd-security-auditor`, `gsd-assumptions-analyzer` |
| **KEEP — researchers** | 2 | `gsd-advisor-researcher`, `gsd-domain-researcher` |
| **KEEP — UI** | 3 | `gsd-ui-researcher`, `gsd-ui-checker`, `gsd-ui-auditor` |
| **TOTAL DROP** | 10 | |
| **TOTAL KEEP → rename to oto-***| 23 | |

D-12 math is internally consistent: 33 = 10 (drop) + 23 (keep). Every agent has a verdict; **no agent is unclassified**.

**Confirmed collision:** Superpowers `agents/code-reviewer.md` (frontmatter `name: code-reviewer`) collides on rename with rebranded `gsd-code-reviewer` → `oto-code-reviewer`. D-10 resolves: drop Superpowers' version. **No other collisions** found by cross-checking the two agent lists (Superpowers has only 1 agent file).

### GSD Slash Commands (86 total — verified)

Full list (alphabetical, by `commands/gsd/` filename, drop `.md`):

```
add-backlog              docs-update              note                     review
add-phase                edit-phase               pause-work               scan
add-tests                eval-review              plan-milestone-gaps      secure-phase
add-todo                 execute-phase            plan-phase               session-report
ai-integration-phase     explore                  plan-review-convergence  set-profile
analyze-dependencies     extract_learnings        plant-seed               settings
audit-fix                fast                     pr-branch                settings-advanced
audit-milestone          forensics                profile-user             settings-integrations
audit-uat                from-gsd2                progress                 ship
autonomous               graphify                 quick                    sketch
check-todos              health                   reapply-patches          sketch-wrap-up
cleanup                  help                     remove-phase             spec-phase
code-review              import                   remove-workspace         spike
code-review-fix          inbox                    research-phase           spike-wrap-up
complete-milestone       ingest-docs              resume-work              stats
debug                    insert-phase             review-backlog           sync-skills
discuss-phase            intel                    next                     thread
do                       join-discord             new-milestone            ui-phase
                         list-phase-assumptions   new-project              ui-review
                         list-workspaces          new-workspace            ultraplan-phase
                         manager                                            undo
                         map-codebase                                       update
                         milestone-summary                                  validate-phase
                                                                            verify-work
                                                                            workstreams
```

**Total = 86.** REQUIREMENTS.md WF-* lists 30 `/oto-*` commands explicitly (WF-01..WF-30), implying ~56 commands in this list will be DROPPED or DEFERRED to v2 (NICH-V2-* covers some — `intel`, `profile-user`, `thread`, `import`, `graphify`, `inbox`). The inventory must classify each of 86 commands as keep / drop / merge / v2-defer.

**Anti-feature drops (concrete):** `join-discord` (community), `from-gsd2` (GSD-2 migration), `ultraplan-phase` (BETA), `node-repair`, `inbox`, `graphify`, `intel`, `thread`, `profile-user`, `reapply-patches` (GSD-update-specific; oto has its own sync pipeline). Per FEATURES.md §3.4 and CONTEXT.md deferred ideas.

### GSD Workflows (86 total — verified)

Workflow files match commands 1:1 except for **8 workflow-only files** (no command shim):

```
diagnose-issues.md       graduation.md           resume-project.md
discovery-phase.md       node-repair.md          transition.md
execute-plan.md          verify-phase.md
```

These are sub-workflows invoked by other workflows — the inventory must NOT mark them `drop` solely because they lack a command. They're called from inside other workflows. (Per FEATURES.md: "84 workflow `.md` files" — actual count is 86; minor discrepancy, planner uses 86.)

### GSD `bin/lib/*.cjs` (31 files — D-18's fork target)

```
agents.cjs            domain-probes.cjs      profile.cjs            templates.cjs
agentsKnowledge.cjs   exec.cjs               progress.cjs           thinking-models.cjs
commands.cjs          gates.cjs              quick.cjs              uniqueId.cjs
config.cjs            init.cjs               registry.cjs           validation.cjs
contexts.cjs          install-profiles.cjs   roadmap.cjs            workflow.cjs
core.cjs              io.cjs                 router.cjs             workstream.cjs
checkpoints.cjs       milestone.cjs          state.cjs
debug.cjs             model-profiles.cjs     summary.cjs
                      phase.cjs              support.cjs
```

Plus `gsd-tools.cjs` itself (D-18: forked as `oto/bin/lib/oto-tools.cjs`). The whole `bin/lib/` directory has the rebrand applied uniformly in Phase 4. **No SDK port** (D-18) means none of `sdk/src/*.ts` is touched.

### Superpowers Skills (14 total — verified)

```
brainstorming              receiving-code-review        using-git-worktrees
dispatching-parallel-agents  requesting-code-review     using-superpowers
executing-plans              subagent-driven-development verification-before-completion
finishing-a-development-branch systematic-debugging     writing-plans
                             test-driven-development     writing-skills
```

**Keep/drop matched against research SUMMARY.md ("7 keep / 7 drop"):**

| Skill | Verdict | Rationale (from research/SUMMARY.md + REQUIREMENTS.md SKL-01..07) |
|-------|---------|---------------------|
| `test-driven-development` | **KEEP → `oto:test-driven-development`** | SKL-01 |
| `systematic-debugging` | **KEEP → `oto:systematic-debugging`** | SKL-02 |
| `verification-before-completion` | **KEEP → `oto:verification-before-completion`** | SKL-03 |
| `dispatching-parallel-agents` | **KEEP → `oto:dispatching-parallel-agents`** | SKL-04 |
| `using-git-worktrees` | **KEEP → `oto:using-git-worktrees`** | SKL-05 |
| `writing-skills` | **KEEP → `oto:writing-skills`** | SKL-06 |
| `using-superpowers` | **KEEP (rename) → `oto:using-oto`** | SKL-07 (renamed; bootstrap retuned per D-06) |
| `brainstorming` | **DROP** | Overlaps `/oto-discuss-phase` (FEATURES.md O1) — workflow wins per D-05/D-06 |
| `writing-plans` | **DROP** | Overlaps `/oto-plan-phase` (O2) — workflow wins; SP's "exact paths + complete code" rigor folds into `oto-planner` agent prompt |
| `executing-plans` | **DROP** | Overlaps `/oto-execute-phase` (O3) — workflow wins |
| `subagent-driven-development` | **DROP** | Overlaps GSD wave engine (O3) — folded into `oto-executor` |
| `requesting-code-review` | **DROP** | Overlaps `/oto-code-review` (O4) — workflow wins |
| `receiving-code-review` | **DROP (consider keep as v2)** | Unique discipline content but no v1 invocation point. Could be added later. |
| `finishing-a-development-branch` | **DROP** | Overlaps `/oto-ship` (O8) |

**Final keep count: 7 skills.** Matches REQUIREMENTS.md SKL-01..07 and research/SUMMARY.md.

### Hooks Fleet (15 total: 11 GSD + 4 Superpowers)

| Hook (file) | Source | Event | Verdict | Notes |
|-------------|--------|-------|---------|-------|
| `gsd-check-update.js` | GSD | SessionStart (background) | DROP | oto has its own update via `npm install -g github:...#vX.Y.Z` |
| `gsd-check-update-worker.js` | GSD | (background helper) | DROP | Pair with above |
| `gsd-context-monitor.js` | GSD | PostToolUse | KEEP → `oto-context-monitor.js` | HK-03 |
| `gsd-statusline.js` | GSD | Statusline | KEEP → `oto-statusline.js` | HK-02 |
| `gsd-session-state.sh` | GSD | SessionStart | **MERGE → `oto-session-start`** | Consolidate with Superpowers per D-08 |
| `gsd-prompt-guard.js` | GSD | PreToolUse | KEEP → `oto-prompt-guard.js` | HK-04 |
| `gsd-read-guard.js` | GSD | PreToolUse | DROP (review) | "Nudge non-Claude models to Read-before-Write" — likely redundant once Claude is daily-use stable. Inventory recommends DROP, planner can flip. |
| `gsd-read-injection-scanner.js` | GSD | PostToolUse | KEEP → `oto-read-injection-scanner.js` | HK-05 |
| `gsd-validate-commit.sh` | GSD | PreToolUse | KEEP → `oto-validate-commit.sh` | HK-06 |
| `gsd-workflow-guard.js` | GSD | PreToolUse | DROP (review) | "Soft warning when editing outside `/gsd-*`" — opt-in, low-value for solo dev who's already disciplined |
| `gsd-phase-boundary.sh` | GSD | PostToolUse | DROP (review) | Opt-in reminder; redundant with statusline |
| `superpowers/hooks/session-start` | Superpowers | SessionStart | **MERGE → `oto-session-start`** | D-08 — content "use a skill on 1% suspicion" gets retuned per D-06 |
| `superpowers/hooks/hooks.json` | Superpowers | (config) | DROP (replaced) | Oto's installer writes its own hooks config |
| `superpowers/hooks/hooks-cursor.json` | Superpowers | (config) | DROP | Cursor out of scope |
| `superpowers/hooks/run-hook.cmd` | Superpowers | (Windows wrapper) | DROP | Windows out of scope |

**oto hook fleet target: 6 hooks** (HK-01..06) + 1 added (`oto-prompt-guard`'s read-injection-scanner is HK-05) = 6 hooks per REQUIREMENTS.md HK-01..06, plus HK-07 is "every hook source file carries `# oto-hook-version: {{OTO_VERSION}}` token" (cross-cutting policy, not a separate hook).

**SessionStart consolidation contract (D-08, ADR-04 input):**
- Input 1: `gsd-session-state.sh` — emits project-state reminder (current phase, recent activity)
- Input 2: `superpowers/hooks/session-start` — emits `<EXTREMELY_IMPORTANT>You have superpowers...` block + `using-superpowers` SKILL.md content
- Output: single `oto-session-start` (extensionless, polyglot like Superpowers' or `.sh` like GSD's — Phase 5 decides) that emits ONE identity block per session, gated on `.oto/STATE.md` for workflow-active deferral
- Critical: existing `<EXTREMELY_IMPORTANT>You have superpowers.` literal in Superpowers' hook (line 35 of `hooks/session-start`) MUST be rebranded to oto identity; `using-superpowers` SKILL.md path → `using-oto` SKILL.md path

---

## Env-Var & Identifier Surface

### GSD_* Env Vars Found in Upstream (37 names — VERIFIED via `grep -rohE '\bGSD_[A-Z_]+\b'`)

```
GSD_AGENTS_DIR                    GSD_HOME                          GSD_RUNTIME
GSD_ARGS                          GSD_INSTALL_DIR                   GSD_RUNTIME_PROFILE_MAP
GSD_CACHE_FILE                    GSD_LOG_UNUSED_HANDLERS           GSD_SDK_SHIM
GSD_CODEX_HOOKS_OWNERSHIP_PREFIX  GSD_MANAGED_DIRS                  GSD_SESSION_KEY
GSD_CODEX_MARKER                  GSD_MARKER                        GSD_SKIP_SCHEMA_CHECK
GSD_CONFIG_PATH                   GSD_MODEL_PROFILES                GSD_TEMPLATES_DIR
GSD_COPILOT_INSTRUCTIONS_CLOSE_MARKER GSD_PLUGIN_ROOT               GSD_TEMP_DIR
GSD_COPILOT_INSTRUCTIONS_MARKER   GSD_PORTABLE_HOOKS                GSD_TEST_MODE
GSD_GLOBAL_VERSION_FILE           GSD_PROJECT                       GSD_TOOLS
                                  GSD_PROJECT_VERSION_FILE          GSD_TOOLS_PATH
                                  GSD_QUERY_FALLBACK                GSD_TOOLS_SRC
                                  GSD_ROOT                          GSD_TTY_MARKER
                                                                    GSD_VERSION
                                                                    GSD_WORKSTREAM
                                                                    GSD_WS
```

**Critical finding:** D-04 lists 5 names. Reality is 37. The rename-map MUST cover all 37 — or use a single `env_var` rule with prefix `GSD_` and document any allowlisted exceptions explicitly. **Recommendation:** use a prefix rule (`{from: "GSD_", to: "OTO_", apply_to_pattern: "^GSD_[A-Z_]+$"}`) with NO exceptions, since none of these env-var names are owned by external runtimes (verified — `CLAUDE_*`, `CODEX_*`, `GEMINI_*`, `COPILOT_*`, `CURSOR_*` are the externally-owned ones; not in this list).

**Some names need attention:**
- `GSD_CODEX_*` (2 names): Codex-specific markers in `bin/install.js`. Renamed to `OTO_CODEX_*` per D-03 — they're oto-internal markers, not Codex-owned identifiers.
- `GSD_COPILOT_INSTRUCTIONS_{CLOSE_,}MARKER` (2 names): markers oto writes into Copilot's instruction file. Copilot CLI is out of scope (REQUIREMENTS.md WF-* doesn't list it; INS-01 drops 11 runtimes including Copilot). **These 2 env vars become dead code in trimmed installer (Phase 3).**
- `GSD_SDK_SHIM`: SDK-related; D-18 drops SDK from v1, so this becomes dead code too.
- `GSD_TEST_MODE`: used in test fixtures. Renamed in lockstep but kept in any retained tests (most tests dropped per inventory).

**Hook version token:** `{{GSD_VERSION}}` appears in 11 GSD hook files (verified via `grep -l "gsd-hook-version\|GSD_VERSION" hooks/*.sh hooks/*.js`). The installer's token-substitution path rewrites it. After rename, becomes `{{OTO_VERSION}}` per D-04 + HK-07.

### `/gsd-*` Slash Command References (98 unique forms — VERIFIED via `grep -rohE '/gsd-[a-z-]+' --include='*.md'`)

The 98 hits include:
- 86 actual `commands/gsd/*.md` filenames (the canonical command set)
- ~12 doc/CHANGELOG references to: `/gsd-alternative-`, `/gsd-comando` (Spanish doc), `/gsd-command-name` (placeholder), `/gsd-context-monitor` (hook ref, not command), `/gsd-build`, `/gsd-begin`, `/gsd-init-`, `/gsd-pristine`, `/gsd-debug-session-manager` (agent ref, not command), etc.

The 12 non-command refs are largely in CHANGELOG, docs, or example/placeholder text. The rebrand `command` rule must match `/gsd-` followed by command-name lowercase chars at start-of-token (after whitespace, code-fence, etc.) — but NOT match these placeholder/translated/agent-name forms. **Suggest:** the `command` rule renames literally `/gsd-` → `/oto-` and lets the `keep/drop` inventory verdict handle which actual commands survive (i.e., don't try to be clever — rename them all, then drop the 50+ commands that aren't in REQUIREMENTS.md WF-*).

### Internal Identifier Patterns (Pitfall 2 inputs)

| Pattern | Count | Surface | Treatment |
|---------|-------|---------|-----------|
| `subagent_type="gsd-*"` | **76** | Workflows (`get-shit-done/workflows/*.md`), commands (`commands/gsd/*.md`), agent files cross-reference each other | `identifier` rule with `\b` boundary |
| `subagent_type="general-purpose"`, `"general"`, `"X"` | **21** | `bin/install.js` (documentation strings, examples) | **Do-not-rename** (these are example values, not gsd-* names) |
| `superpowers:<skill>` | **76** | Superpowers' own RELEASE-NOTES, CLAUDE.md, docs/plans/, tests/, skill cross-references | `skill_ns` rule: `superpowers:` → `oto:` |
| Frontmatter `name: gsd-<x>` | **33** | Each `agents/gsd-*.md` has `name: gsd-...` in frontmatter | `identifier` rule, but inventory marks dropped agent files for delete-not-rename |
| Frontmatter `name: <skill>` (Superpowers, no namespace) | **14** | Each `skills/*/SKILL.md` (e.g., `name: test-driven-development`) | NOT renamed — frontmatter stays bare; the namespace `oto:` is applied at install time when the skill is registered |
| `gsd_state_version` (frontmatter key) | **2 in lib + 8 in tests** | `get-shit-done/bin/lib/state.cjs`, `tests/state.test.cjs`, generated STATE.md | `identifier` rule: `gsd_state_version` → `oto_state_version` |
| `Copyright (c) 2025 Lex Christopherson` | 1 (LICENSE) | GSD `LICENSE` line 3 | DO-NOT-RENAME (Pitfall 6, D-22) |
| `Copyright (c) 2025 Jesse Vincent` | 1 (LICENSE) | Superpowers `LICENSE` line 3 | DO-NOT-RENAME (Pitfall 6, D-22) |
| `github.com/gsd-build/get-shit-done` | many | URLs in README, docs, SDK metadata | `url` rule with `preserve_in_attribution: true` — preserve in THIRD-PARTY-LICENSES.md and explicit attribution sections; rewrite repo-relative anchors |
| `github.com/obra/superpowers` | many | URLs in Superpowers' RELEASE-NOTES, README | Same as above |
| Hook version banner `# gsd-hook-version: {{GSD_VERSION}}` | 11 | `hooks/*.sh`, `hooks/*.js` | Two-step rename: comment text `# gsd-hook-version` → `# oto-hook-version`; token `{{GSD_VERSION}}` → `{{OTO_VERSION}}` |
| Superpowers identity literal `<EXTREMELY_IMPORTANT>You have superpowers.` | 1 (`hooks/session-start` line 35) | Hook injection content | **Hand-rebrand** in D-08 consolidation (Phase 5) — not a `rename-map` rule, this is content the consolidated hook owns |
| `using-superpowers` literal in hook | 2 (`hooks/session-start` lines 18, 35 — `${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md` path + the `'superpowers:using-superpowers'` literal) | Same hook | Hand-rebrand to `using-oto` per D-08 + D-07 |

**Critical for rebrand engine (Phase 2 input from Phase 1 schema):**
- `identifier` rule must use `\b` boundaries to avoid false matches like `gsd_state_version` overshooting into `gsd_states_versioned` (none exist, but defensive anyway).
- The 21 `subagent_type="general-purpose"` references in `bin/install.js` must NOT match the gsd-agent identifier rule. Use a do-not-rename allowlist: any `subagent_type` value that matches `^(general-purpose|generalPurpose|general|X|general_purpose_task|<.*>)$` is exempt.
- `gsd-hook-version` in hook headers needs its OWN `identifier` rule (or fall under the bare `gsd-` prefix rule).

### Codex Sandbox Map (`bin/install.js` lines 26-38)

GSD's `CODEX_AGENT_SANDBOX` map declares per-agent sandbox levels for Codex deployment. After D-12 trims agents to 23, this map needs:
1. Rename keys: `gsd-executor` → `oto-executor`, etc. (23 keys total)
2. Drop entries for the 10 dropped agents
3. Verify each retained agent has the correct sandbox mode (`workspace-write` for executors/writers, `read-only` for reviewers/researchers)

Phase 1 doesn't modify this map (no code changes), but the inventory must:
- **Tag `bin/install.js` as `merge`** (will be heavily edited in Phase 3)
- **Surface that the sandbox map is one of 11 runtime branches** that Phase 3 trims (drop OpenCode, Cursor, Copilot, Kilo, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline)

---

## License Source Texts (verbatim, for D-21)

### GSD `foundation-frameworks/get-shit-done-main/LICENSE` (1075 bytes)

Line 1: `MIT License`
Line 2: (blank)
Line 3: `Copyright (c) 2025 Lex Christopherson`
Line 4: (blank)
Lines 5–22: Standard MIT permission body

### Superpowers `foundation-frameworks/superpowers-main/LICENSE` (1070 bytes)

Line 1: `MIT License`
Line 2: (blank)
Line 3: `Copyright (c) 2025 Jesse Vincent`
Line 4: (blank)
Lines 5–22: Standard MIT permission body (identical body, different copyright line)

**Action items for Phase 1 deliverable `THIRD-PARTY-LICENSES.md`:**
1. Concatenate both licenses verbatim with section headers `## GSD (get-shit-done)` and `## Superpowers`.
2. Preserve every byte of each LICENSE file exactly. CI check (Phase 10, CI-06) verifies both copyright strings present.
3. Add to `do_not_rename` allowlist as glob `LICENSE*`, `THIRD-PARTY-LICENSES.md`, plus exact strings `Lex Christopherson`, `Jesse Vincent`.

---

## Decision File Count Recommendation

CONTEXT.md mentions ~9 distinct architectural areas, but D-XX entries map to several areas per ADR. Recommendation: **13 ADRs total**, organized to give each load-bearing decision its own file (search-grep-able by ADR-NN), while grouping closely-related D-XX entries.

| ADR # | Title | D-XX entries covered | Status | Lines (est.) |
|-------|-------|---------------------|--------|-------------|
| ADR-01 | State root: `.oto/` | D-01, D-02 | Accepted | ~80 |
| ADR-02 | Env-var prefix: full rebrand `GSD_*` → `OTO_*` | D-03, D-04 | Accepted | ~100 (covers 37-name list, exceptions, hook token) |
| ADR-03 | Skill-vs-command routing policy | D-05, D-06, D-07 | Accepted | ~120 (overlap table from FEATURES.md §4) |
| ADR-04 | SessionStart hook consolidation | D-08, D-09 | Accepted | ~80 |
| ADR-05 | Agent collision resolution | D-10, D-11 | Accepted | ~50 |
| ADR-06 | Internal skill namespace | D-07 (also covered in ADR-03 — cross-reference) | Accepted | ~40 (or merge into ADR-03) |
| ADR-07 | Agent trim depth | D-12 | Accepted | ~80 (verdict per agent — full table from §Concrete File Lists) |
| ADR-08 | File inventory format | D-13 | Accepted | ~60 (schema spec) |
| ADR-09 | ADR format | D-14 | Accepted | ~40 (template) |
| ADR-10 | Rename-map schema | D-15 | Accepted | ~120 (full schema definition with rule-type explanations) |
| ADR-11 | GitHub distribution & bin names | D-16, D-17 | Accepted | ~50 |
| ADR-12 | SDK strategy | D-18 | Accepted | ~70 |
| ADR-13 | SDK deferred (companion to ADR-12) | D-19 | **Deferred** | ~40 |
| ADR-14 | License & attribution | D-20, D-21, D-22 | Accepted | ~60 |
| ADR-15 | Inventory scope | D-23 | Accepted | ~80 |

**Final count:** 15 ADRs (numbered 01..15). ADR-06 might collapse into ADR-03 (skill-vs-command routing covers internal namespace), bringing it to **14 ADRs**. Planner picks one approach; recommend **15 ADRs** for clean 1-ADR-per-D-XX-cluster grep-ability.

**Plus non-ADR documents:**
- `decisions/skill-vs-command.md` (overlap routing table from FEATURES.md §4 — not an ADR, it's the routing reference)
- `decisions/agent-audit.md` (the per-agent verdict table — not an ADR, it's the AGT-01 deliverable)
- `decisions/file-inventory.json` (D-13)
- `decisions/file-inventory.md` (generated index)

**Total `decisions/` artifacts:** 15 ADRs + 1 routing table + 1 audit + 2 inventory files = **19 files in `decisions/`**.

**Plus repo-root artifacts:**
- `rename-map.json` (D-15)
- `LICENSE` (D-20)
- `THIRD-PARTY-LICENSES.md` (D-21)

**Phase 1 grand total: 22 deliverable files.**

---

## rename-map.json Schema Design

This is the **most important Phase 1 output** for downstream consumption. Phase 2 builds the engine + a JSON-Schema validator; Phase 1 ships the schema spec.

### Top-level shape (JSON Schema 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/julianisaac/oto-hybrid-framework/schema/rename-map.json",
  "type": "object",
  "required": ["version", "rules", "do_not_rename"],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "const": "1" },
    "rules": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "identifier": { "type": "array", "items": { "$ref": "#/$defs/identifier_rule" } },
        "path":       { "type": "array", "items": { "$ref": "#/$defs/path_rule" } },
        "command":    { "type": "array", "items": { "$ref": "#/$defs/command_rule" } },
        "skill_ns":   { "type": "array", "items": { "$ref": "#/$defs/skill_ns_rule" } },
        "package":    { "type": "array", "items": { "$ref": "#/$defs/package_rule" } },
        "url":        { "type": "array", "items": { "$ref": "#/$defs/url_rule" } },
        "env_var":    { "type": "array", "items": { "$ref": "#/$defs/env_var_rule" } }
      }
    },
    "do_not_rename": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string", "description": "Exact-match string OR glob pattern" },
          { "type": "object", "properties": { "pattern": { "type": "string" }, "reason": { "type": "string" } }, "required": ["pattern", "reason"] }
        ]
      }
    },
    "deprecated_drop": {
      "type": "array",
      "items": { "type": "string", "description": "Path to file dropped (not renamed)" }
    }
  },
  "$defs": {
    "identifier_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string", "description": "Source identifier or prefix" },
        "to":   { "type": "string", "description": "Target identifier or prefix" },
        "boundary": { "enum": ["word", "prefix", "exact"], "default": "word" },
        "case_variants": {
          "type": "array",
          "items": { "enum": ["upper", "lower", "title", "kebab", "snake"] },
          "description": "Generate case variants automatically"
        },
        "do_not_match": { "type": "array", "items": { "type": "string" } }
      }
    },
    "path_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string" },
        "to":   { "type": "string" },
        "match": { "enum": ["segment", "prefix", "exact"], "default": "segment" }
      }
    },
    "command_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string", "pattern": "^/[a-z][a-z0-9-]*-?$" },
        "to":   { "type": "string", "pattern": "^/[a-z][a-z0-9-]*-?$" }
      }
    },
    "skill_ns_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string", "pattern": ":$" },
        "to":   { "type": "string", "pattern": ":$" }
      }
    },
    "package_rule": {
      "type": "object",
      "required": ["from", "to", "fields"],
      "properties": {
        "from":   { "type": "string" },
        "to":     { "type": "string" },
        "fields": { "type": "array", "items": { "enum": ["name", "bin", "main", "exports", "repository.url"] } }
      }
    },
    "url_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string" },
        "to":   { "type": "string" },
        "preserve_in_attribution": { "type": "boolean", "default": false }
      }
    },
    "env_var_rule": {
      "type": "object",
      "required": ["from", "to"],
      "properties": {
        "from": { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*_?$" },
        "to":   { "type": "string", "pattern": "^[A-Z][A-Z0-9_]*_?$" },
        "apply_to_pattern": { "type": "string", "description": "Optional regex bounding which env-var names this rule applies to" }
      }
    }
  }
}
```

### Pitfall 1 (substring collision) prevention rules in the schema

1. **Boundary defaults to `word`** for `identifier_rule` — engine MUST use `\b` regex boundary unless `boundary: "prefix"` or `"exact"` explicitly overrides. Schema enforces via `default: "word"`.
2. **`do_not_match` array** on `identifier_rule` lets the rule list strings that match the pattern but should NOT be renamed (e.g., `subagent_type="general-purpose"` exempt from `gsd-` identifier rules — though in practice this is in the do_not_rename allowlist, not on a per-rule basis).
3. **`do_not_rename` allowlist** is top-level and applies regardless of which rule would otherwise match. Glob patterns supported (`LICENSE*`, `foundation-frameworks/**`).
4. **`url_rule.preserve_in_attribution: true`** specifically addresses Pitfall 6 — upstream URLs in `README` attribution sections, `THIRD-PARTY-LICENSES.md`, and copyright headers stay verbatim; URLs in repo-internal anchors get rewritten.
5. **No regex `from` patterns** on identifier/path rules — engine derives the regex internally from `from` + `boundary`. Prevents users from authoring foot-guns. (`apply_to_pattern` exists on `env_var_rule` only because that rule type uses prefix matching.)

### Concrete entries (sample — full file in Phase 1 deliverable)

```json
{
  "version": "1",
  "rules": {
    "identifier": [
      { "from": "gsd",                "to": "oto",            "boundary": "word", "case_variants": ["lower", "upper", "title"] },
      { "from": "get-shit-done",      "to": "oto",            "boundary": "word" },
      { "from": "get-shit-done-cc",   "to": "oto",            "boundary": "exact" },
      { "from": "Get Shit Done",      "to": "oto",            "boundary": "exact" },
      { "from": "gsd_state_version",  "to": "oto_state_version", "boundary": "word" },
      { "from": "gsd-hook-version",   "to": "oto-hook-version",  "boundary": "word" }
    ],
    "path": [
      { "from": ".planning",          "to": ".oto",           "match": "segment" },
      { "from": "get-shit-done/",     "to": "oto/",           "match": "prefix" }
    ],
    "command": [
      { "from": "/gsd-",              "to": "/oto-" }
    ],
    "skill_ns": [
      { "from": "superpowers:",       "to": "oto:" }
    ],
    "package": [
      { "from": "get-shit-done-cc",   "to": "oto",            "fields": ["name", "bin"] },
      { "from": "gsd-sdk",            "to": "oto-sdk",        "fields": ["bin"] }
    ],
    "url": [
      { "from": "github.com/gsd-build/get-shit-done", "to": "github.com/julianisaac/oto-hybrid-framework", "preserve_in_attribution": true },
      { "from": "github.com/obra/superpowers",         "to": "github.com/julianisaac/oto-hybrid-framework", "preserve_in_attribution": true }
    ],
    "env_var": [
      { "from": "GSD_",               "to": "OTO_",           "apply_to_pattern": "^GSD_[A-Z][A-Z0-9_]*$" }
    ]
  },
  "do_not_rename": [
    "LICENSE", "LICENSE.md", "THIRD-PARTY-LICENSES.md",
    "foundation-frameworks/**",
    "Lex Christopherson", "Jesse Vincent",
    "CLAUDE_PLUGIN_ROOT", "CLAUDE_CONFIG_DIR",
    "CODEX_HOME", "GEMINI_CONFIG_DIR",
    "CURSOR_PLUGIN_ROOT", "COPILOT_CLI",
    { "pattern": "subagent_type=\"(general-purpose|generalPurpose|general|X|general_purpose_task)\"", "reason": "Generic agent-type values in install.js example/documentation strings" }
  ],
  "deprecated_drop": [
    "_TODO_populated_by_inventory_phase_"
  ]
}
```

**Critical:** `deprecated_drop` is empty in Phase 1's first draft — populated by the file-inventory generation task (which traverses `foundation-frameworks/` and emits a list).

---

## file-inventory.json Schema Design

D-13 specifies entry shape `{path, upstream, verdict, reason, target_path?, deprecation_status?}`. **Research recommends adding 4 fields** for downstream consumers (Phase 2 rebrand engine, Phase 4 bulk port, Phase 9 sync pipeline):

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `path` | string | yes | Source path relative to upstream root (e.g., `agents/gsd-planner.md`) |
| `upstream` | enum (`gsd`, `superpowers`) | yes | Which upstream the file comes from |
| `verdict` | enum (`keep`, `drop`, `merge`) | yes | What happens to this file |
| `reason` | string | yes | Why this verdict (free-text, planner-readable) |
| `target_path` | string | when verdict ∈ {keep, merge} | Path in oto/ tree after rebrand (e.g., `agents/oto-planner.md`) |
| `deprecation_status` | enum (`active`, `deprecated`, `removed-upstream`) | no | Pitfall 13 — flags upstream-deprecated surfaces |
| **`rebrand_required`** (NEW) | boolean | yes when `verdict: keep` | True if rename-map applies; false for binary files (assets) and license files |
| **`merge_source_files`** (NEW) | array of strings | when `verdict: merge` | Other files this one merges with (e.g., `oto-session-start` merges `gsd-session-state.sh` + `superpowers/hooks/session-start`) |
| **`phase_owner`** (NEW) | integer (1..10) | yes | Which phase actually performs the keep/drop/merge action — most are Phase 4, hooks are Phase 5, skills are Phase 6 |
| **`category`** (NEW) | enum (see below) | yes | Coarse category for grouping in the markdown index |

`category` enum values: `agent`, `command`, `workflow`, `reference`, `template`, `context`, `hook`, `lib`, `script`, `test`, `sdk`, `manifest`, `doc`, `license`, `asset`, `config`, `installer`, `skill`, `meta`.

**Why these additions matter:**
- `rebrand_required: false` lets Phase 2's engine skip binary files (logos, .png, .svg) instead of attempting text-substitution on them.
- `merge_source_files` makes the SessionStart consolidation (D-08) machine-readable for Phase 5.
- `phase_owner` enables Phase 4/5/6/7's plan agents to query "give me every file with `phase_owner: 4 AND verdict ∈ {keep, merge}`" to scope their bulk port.
- `category` powers the generated `file-inventory.md` index (grouped by category, sorted by path within category).

### JSON Schema for `file-inventory.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/julianisaac/oto-hybrid-framework/schema/file-inventory.json",
  "type": "object",
  "required": ["version", "generated_at", "entries"],
  "properties": {
    "version": { "type": "string", "const": "1" },
    "generated_at": { "type": "string", "format": "date-time" },
    "upstream_versions": {
      "type": "object",
      "properties": {
        "gsd": { "type": "string" },
        "superpowers": { "type": "string" }
      }
    },
    "entries": {
      "type": "array",
      "items": { "$ref": "#/$defs/entry" }
    }
  },
  "$defs": {
    "entry": {
      "type": "object",
      "required": ["path", "upstream", "verdict", "reason", "rebrand_required", "phase_owner", "category"],
      "additionalProperties": false,
      "properties": {
        "path":            { "type": "string" },
        "upstream":        { "enum": ["gsd", "superpowers"] },
        "verdict":         { "enum": ["keep", "drop", "merge"] },
        "reason":          { "type": "string", "minLength": 1 },
        "target_path":     { "type": "string" },
        "deprecation_status": { "enum": ["active", "deprecated", "removed-upstream"] },
        "rebrand_required":{ "type": "boolean" },
        "merge_source_files":{ "type": "array", "items": { "type": "string" } },
        "phase_owner":     { "type": "integer", "minimum": 1, "maximum": 10 },
        "category":        { "enum": ["agent", "command", "workflow", "reference", "template", "context", "hook", "lib", "script", "test", "sdk", "manifest", "doc", "license", "asset", "config", "installer", "skill", "meta"] }
      },
      "allOf": [
        { "if": { "properties": { "verdict": { "enum": ["keep", "merge"] } } }, "then": { "required": ["target_path"] } },
        { "if": { "properties": { "verdict": { "const": "merge" } } }, "then": { "required": ["merge_source_files"] } }
      ]
    }
  }
}
```

### Generation strategy (Phase 1 implementation)

Inventory generation is mechanical:

1. `find foundation-frameworks/get-shit-done-main -type f` → 982 entries
2. `find foundation-frameworks/superpowers-main -type f` → 146 entries
3. **Total: 1,128 entries.**
4. Each entry classified via a deterministic ruleset:
   - Path matches `tests/*.test.cjs` AND upstream=gsd → `verdict: drop, reason: "Upstream test harness; oto re-derives in Phase 10"`
   - Path matches `agents/gsd-(ai-researcher|eval-auditor|eval-planner|framework-selector|doc-classifier|doc-synthesizer|pattern-mapper|intel-updater|user-profiler|debug-session-manager).md` → `verdict: drop, reason: "D-12 trim — <category>"`
   - Path matches `agents/gsd-*.md` AND not in drop list → `verdict: keep, target_path: agents/oto-<rest>.md, rebrand_required: true, phase_owner: 4`
   - … (~30 such rules cover most of the tree)
5. Hand-classified entries: license files, manifests, scripts requiring inspection — perhaps 50 manual entries, the rest mechanical.

**Implementation note for plan:** A small Node script (`scripts/gen-inventory.cjs`) walks both trees, applies the ruleset, and emits both `file-inventory.json` and `file-inventory.md`. ~150 LOC of CJS. Phase 1 ships the script + the generated outputs. Note: `gen-inventory-manifest.cjs` already exists in GSD's scripts/ — reference it for shape inspiration but do NOT copy (it serves a different purpose).

---

## Validation Architecture

> Phase 1 is documentation-only. Validation = schema-checking the JSON outputs + grep-checking the markdown ADRs for required structure.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in) per CLAUDE.md / STACK.md prescription |
| Config file | none (no test framework config needed for v1; Phase 10 adds CI-01..03 for the test surface) |
| Quick run command | `node --test tests/phase-01-*.test.cjs` |
| Full suite command | `node scripts/run-tests.cjs` (mirrors GSD's pattern) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | `decisions/ADR-01-state-root.md` exists with required ADR sections | unit | `node --test tests/phase-01-adr-structure.test.cjs` | ❌ Wave 0 |
| ARCH-02 | `decisions/ADR-03-skill-vs-command.md` + `decisions/skill-vs-command.md` both present | unit | same suite | ❌ Wave 0 |
| ARCH-03 | `decisions/ADR-04-sessionstart.md` present | unit | same suite | ❌ Wave 0 |
| ARCH-04 | `decisions/ADR-05-agent-collisions.md` present | unit | same suite | ❌ Wave 0 |
| ARCH-05 | `decisions/ADR-06-skill-namespace.md` (or merged into ADR-03) present | unit | same suite | ❌ Wave 0 |
| ARCH-06 | `decisions/file-inventory.json` validates against `schema/file-inventory.json`; row count matches `find foundation-frameworks/ -type f \| wc -l`; no `verdict: unclassified`; every `verdict ∈ {keep,merge}` has `target_path` | integration | `node --test tests/phase-01-inventory.test.cjs` | ❌ Wave 0 |
| AGT-01 | `decisions/agent-audit.md` present, contains all 33 GSD agent names from filesystem, each has a verdict + rationale | integration | `node --test tests/phase-01-agent-audit.test.cjs` | ❌ Wave 0 |
| REB-02 | `rename-map.json` validates against `schema/rename-map.json`; required rule types present; do-not-rename allowlist contains license names + Lex/Jesse strings | integration | `node --test tests/phase-01-rename-map.test.cjs` | ❌ Wave 0 |
| DOC-05 | `decisions/` directory exists with all 15 ADR files + 1 routing table + 1 audit + 2 inventory files (19 files) | integration | `node --test tests/phase-01-decisions-dir.test.cjs` | ❌ Wave 0 |
| FND-06 | `LICENSE` (with `Julian Isaac`) and `THIRD-PARTY-LICENSES.md` (with both `Lex Christopherson` and `Jesse Vincent` strings verbatim) exist at repo root | unit | `node --test tests/phase-01-licenses.test.cjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-01-*.test.cjs` (~10 tests, runs in <2s — pure file-existence + schema-validation)
- **Per wave merge:** same (no integration surface — phase is pure docs)
- **Phase gate:** Full suite green; manual review of ADRs by user before phase close

### Wave 0 Gaps

All test files are missing. Wave 0 must create:

- [ ] `tests/phase-01-adr-structure.test.cjs` — covers ARCH-01..05, DOC-05 (validates each ADR file has Status/Date/Context/Decision/Rationale/Consequences sections via regex)
- [ ] `tests/phase-01-inventory.test.cjs` — covers ARCH-06 (loads JSON, validates against schema, asserts row count matches filesystem)
- [ ] `tests/phase-01-agent-audit.test.cjs` — covers AGT-01 (asserts all 33 agent names present, every line has verdict+rationale)
- [ ] `tests/phase-01-rename-map.test.cjs` — covers REB-02 (validates against schema, asserts allowlist contents)
- [ ] `tests/phase-01-licenses.test.cjs` — covers FND-06 (asserts two copyright strings present in THIRD-PARTY-LICENSES.md)
- [ ] `tests/phase-01-decisions-dir.test.cjs` — counts files in decisions/, asserts ≥19
- [ ] `schema/file-inventory.json` — JSON Schema (Wave 0 dependency for inventory test)
- [ ] `schema/rename-map.json` — JSON Schema (Wave 0 dependency for rename-map test)
- [ ] `tests/helpers/load-schema.cjs` — small AJV wrapper utility (or use `node:test` with hand-rolled validation if AJV adds dep weight)

**Framework install:** `node:test` is built into Node 22+ — no install needed. **AJV** for JSON Schema validation: `npm install --save-dev ajv@^8` if used; alternatively, hand-roll required-field/enum checks in the test files (~50 LOC) to keep zero deps.

**Recommendation:** Hand-roll validation (no AJV dep) to match CLAUDE.md "zero-deps" rigor. Schema files still ship as design artifacts; tests just check the specific properties that matter for Phase 1.

---

## Risks & Pitfalls Specific to This Phase

Beyond what PITFALLS.md already covers, three Phase-1-specific risks emerged from the inventory walk:

### Risk A: D-04's 5-name env-var list is incomplete vs reality (37 names)

**What goes wrong:** Planner authors `rename-map.json` with only the 5 listed env vars. Phase 2 engine misses 32 names. After rebrand, `GSD_INSTALL_DIR`, `GSD_PLUGIN_ROOT`, etc. survive into oto's runtime, and the framework announces upstream identity through env-var inspection.

**Mitigation:** The recommended `env_var` rule uses prefix matching (`from: "GSD_"`, `apply_to_pattern: "^GSD_[A-Z][A-Z0-9_]*$"`) instead of enumerating each name. ADR-02 documents this choice explicitly with the 37-name list as evidence.

### Risk B: 8 workflow-only files have no command shim — easy to miss in inventory

**What goes wrong:** Inventory rule "every workflow has a command, every command has a workflow" misses `diagnose-issues.md`, `discovery-phase.md`, `execute-plan.md`, `graduation.md`, `node-repair.md`, `resume-project.md`, `transition.md`, `verify-phase.md`. These get `verdict: drop` because no command points to them — but they're called from inside other workflows.

**Mitigation:** Inventory generation must NOT use "matches a command shim" as a keep-criterion for workflows. Use "is referenced from another workflow file" via grep instead, OR hand-classify the 8 workflow-only files. Recommend: hand-classify all 8 with explicit reason notes.

### Risk C: GitHub username assumption (D-16) blocks URL rebrand rules

**What goes wrong:** `rename-map.json`'s `url` rule rewrites `github.com/gsd-build/get-shit-done` → `github.com/julianisaac/oto-hybrid-framework`. If the user's actual GitHub username is not `julianisaac`, every URL post-rebrand is wrong, and `npm install -g github:julianisaac/...` fails.

**Mitigation:** Phase 1 plan must include an explicit user-confirmation step before writing the URL rule with a literal owner name. Alternatively, use a placeholder `{{GITHUB_OWNER}}` token in `rename-map.json` and resolve at Phase 2 engine load time. **Recommendation:** placeholder approach — keeps rename-map authoritative without baking in an unverified assumption.

### Risk D: Translated docs in GSD's `docs/` aren't enumerated yet

**What goes wrong:** `find foundation-frameworks/get-shit-done-main/docs/ -type d` may show `docs/zh-CN/`, `docs/ja-JP/`, etc. The inventory must classify all such directories as drop. (Inspection above showed `docs/zh-CN/references/model-profile-resolution.md` as one example — confirming `docs/zh-CN/` exists.)

**Mitigation:** Include a wildcard rule in inventory generation: any path matching `^docs/[a-z]{2}-[A-Z]{2}/` is `verdict: drop, category: doc, reason: "Translated docs out of scope per D-23"`.

### Risk E: `gsd-tools.cjs` deprecation status (Pitfall 22) is ambiguous in v1.38.5

**What goes wrong:** GSD CHANGELOG 1.38.5 marks `gsd-tools.cjs` deprecated in favor of `gsd-sdk query`. D-18 forks `gsd-tools.cjs` (not the SDK), so oto inherits the deprecated path. Future GSD upstream may delete `gsd-tools.cjs` entirely, which Phase 9 sync would surface as "file deleted upstream" — needs handling.

**Mitigation:** Inventory entry for `get-shit-done/bin/gsd-tools.cjs` gets `deprecation_status: "deprecated"` AND `verdict: merge` AND `target_path: oto/bin/lib/oto-tools.cjs` AND a reason that explicitly notes "Pitfall 22 — fork accepts the deprecated path; if upstream deletes, oto carries forward independently per ADR-12." This gives Phase 9 a clear signal.

---

## Open Questions for the Planner

### Q1: How aggressive is CHANGELOG-deprecation detection in Phase 1?

D-23 mandates `deprecation_status` per file. Reading GSD's 152KB CHANGELOG.md and Superpowers' 58KB RELEASE-NOTES.md to flag every `**Deprecated:**` mention is non-trivial. Three options:

(a) **Manual grep + curate** — `grep -i 'deprecat' CHANGELOG.md`, hand-classify each hit. ~30 minutes of human effort.
(b) **Algorithmic** — script extracts `**Deprecated:**` blocks and looks up the named file/command in inventory. May miss prose-form deprecations.
(c) **Defer** — populate `deprecation_status: "active"` for everything in Phase 1, address in a Phase 9-specific scan later.

**Recommendation: (a)** — 30 min manual scan is cheap and gives the most accurate result. Documented in ADR-15.

### Q2: Should `decisions/skill-vs-command.md` ship the full 14-row overlap table from FEATURES.md §4?

The CONTEXT.md mentions "Concrete overlap table" but doesn't specify scope. Options:

(a) Copy verbatim from FEATURES.md §4 (14 rows). User-facing contract.
(b) Trim to the 5 overlaps active in v1 (TDD, debugging, verification, parallel-dispatch, worktrees) — the rest are deferred or dropped.
(c) Both — full table + a "v1-active subset" callout.

**Recommendation: (c)** — full table makes future decisions traceable, v1 callout makes today's surface clear.

### Q3: How does ADR-13 (SDK Deferred) differ from ADR-12 (SDK Strategy)?

D-18 is "drop SDK, fork CJS path" — that's the v1 decision. D-19 is "if/when SDK happens in v2, follow GSD's pattern." Two ADRs or one?

**Recommendation:** One ADR (ADR-12) titled "SDK Strategy" with `Status: Accepted` covering both decisions. Status reflects v1 acceptance; "Consequences" section spells out the v2 deferral. Drop ADR-13. Reduces 15 ADRs to **14 ADRs**.

### Q4: Phase 1 commit cadence?

`commit_docs: true` in `.planning/config.json`. Each ADR + each major artifact = separate commit, or one mega-commit per plan? Recommendation: per-ADR commit (15 ADR commits + 1 inventory commit + 1 rename-map commit + 1 license commit = ~18 commits in Phase 1). Keeps git history clean and lets `/oto-undo` selectively revert single decisions.

### Q5: Schema file storage location

`schema/rename-map.json` and `schema/file-inventory.json` — repo root `schema/` directory? Or `.oto-meta/schemas/`? Or co-located with the JSON files (`rename-map.schema.json` next to `rename-map.json`)?

**Recommendation:** Repo-root `schema/` directory. Mirrors common convention (`schema/`, `schemas/` are standard). Path is short, grep-able, and matches the implicit `$id` URLs in the schema definitions above.

---

## State of the Art

(Not applicable — Phase 1 is decision documentation, not technology evaluation. State-of-the-art for the *technology stack* is captured in research/STACK.md and not duplicated here.)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GitHub username is `julianisaac` (D-16) | User Constraints | URL rebrand rules write wrong owner; `npm install` fails. **Mitigation: placeholder token in rename-map.** |
| A2 | All 37 found `GSD_*` env vars rename to `OTO_*` | Env-Var & Identifier Surface | Some name might be a Codex/Copilot-owned name we missed; inspection showed all 37 are oto-internal, but didn't grep external runtime sources to triple-check. **Mitigation: spot-check `GSD_PLUGIN_ROOT` against Claude/Codex/Gemini docs before locking ADR-02.** |
| A3 | The 8 workflow-only files (`diagnose-issues.md` etc.) are still actually used by other workflows in v1.38.5 | Concrete File Lists | If they're orphaned, marking them `keep` carries dead code. **Mitigation: planner's inventory generation grep-checks each for inbound references.** |
| A4 | Superpowers v5.0.7 has no `.opencode-plugin/` directory (confirmed: only `.opencode/` exists). Other research mentioned `.opencode-plugin/` in error | Concrete File Lists | None — this corrects research/SUMMARY.md misimpression. |
| A5 | The recommended 14 ADR count (after collapsing ADR-13 into ADR-12) is the right granularity | Decision File Count | If too coarse, future grep-by-decision becomes harder; if too fine, planning overhead. **Mitigation: planner can split or collapse before phase close — choice is reversible.** |
| A6 | Inventory generation script is ~150 LOC, mechanical | file-inventory.json Schema Design | If hand-classification need exceeds expected ~50 entries (e.g., translated docs, weird `.gitignore`-style files, etc.), generation runs longer. **Mitigation: budget 2 hours for inventory generation in plan estimate.** |
| A7 | All 11 GSD hooks classified per the table in §Hooks Fleet | Hooks Fleet | Some hooks marked `DROP (review)` may surprise the user — `gsd-read-guard.js`, `gsd-workflow-guard.js`, `gsd-phase-boundary.sh`. **Mitigation: planner surfaces these in agent-audit / hook-audit for explicit user confirmation.** |
| A8 | `gen-inventory-manifest.cjs` (existing in GSD's scripts/) does NOT generate the same artifact as oto's needed inventory generator | file-inventory.json Schema Design | If reusable, save effort. **Mitigation: planner inspects it during Wave 1; if reusable, fork it.** |

**If this table is empty:** It's not. 8 assumptions need user/planner confirmation before they harden into Phase 1 deliverables. Most are LOW risk; A1 (GitHub owner) is HIGH risk because it cascades into URL rebrand rules used by every downstream phase.

---

## Code Examples

(Not applicable — Phase 1 produces no source code. Phase 2 builds the rebrand engine using the schema designs above.)

---

## Project Constraints (from CLAUDE.md)

These directives bind Phase 1 deliverables:

1. **Node.js >= 22.0.0, CommonJS top-level, no top-level TypeScript.** ANY tooling Phase 1 ships (e.g., `scripts/gen-inventory.cjs`) is plain `.cjs` with `require()`. (`node:test` for any test files.)
2. **Markdown payload otherwise.** ADRs, audit, inventory.md are all markdown. JSON schemas are plain JSON files.
3. **Zero-deps preferred.** Hand-roll JSON validation (~50 LOC) before reaching for AJV. (See Validation Architecture §Wave 0 Gaps.)
4. **No build step at top level.** Phase 1 deliverables are raw `.md`/`.json` — no transpilation, no minification, no bundling.
5. **`prepare`-script discipline (FND-03 in Phase 2).** Phase 1 doesn't ship `package.json` (Phase 2 does), but if Phase 1's `scripts/gen-inventory.cjs` is added, Phase 2's `package.json` must list it under `scripts.prepare` along with `build-hooks` if regenerated content is required at install time. **Recommendation:** inventory generation is a build-time activity, not install-time — output committed to git, not regenerated on `npm install`. So `scripts/gen-inventory.cjs` is run manually during Phase 1, output committed, no `prepare`-hook needed.
6. **Personal-use cost ceiling (Pitfall 11).** Phase 1 must not over-engineer the inventory schema. The 4 added fields above (`rebrand_required`, `merge_source_files`, `phase_owner`, `category`) carry their weight — each unblocks a specific downstream phase. No additional fields without similar justification.
7. **Markdown-with-frontmatter as the unit.** ADR files have no frontmatter (they're per CONTEXT.md format, not a frontmatter spec) — the spec is body sections. This is consistent with CONTEXT.md.
8. **GSD Workflow Enforcement (CLAUDE.md):** All file-changing tools MUST happen inside `/gsd-execute-phase` (or eventually `/oto-execute-phase`). For Phase 1, this means: research/planning happens in this phase; execution is in `/gsd-execute-phase` for Phase 1 once plans exist.

---

## Sources

### Primary (HIGH confidence — direct filesystem inspection 2026-04-27)

- `foundation-frameworks/get-shit-done-main/` — full directory walk; counts verified via `ls`/`find -type f`
- `foundation-frameworks/get-shit-done-main/agents/` — all 33 agent files enumerated
- `foundation-frameworks/get-shit-done-main/commands/gsd/` — all 86 command files enumerated
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/` — all 86 workflow files enumerated
- `foundation-frameworks/get-shit-done-main/hooks/` — all 11 hook files enumerated
- `foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/` — all 31 `.cjs` library files enumerated
- `foundation-frameworks/get-shit-done-main/LICENSE` — copyright line verified
- `foundation-frameworks/get-shit-done-main/package.json` — `bin` declarations verified (`get-shit-done-cc`, `gsd-sdk`)
- `foundation-frameworks/get-shit-done-main/` env-var grep — 37 `GSD_*` names verified via `grep -rohE '\bGSD_[A-Z_]+\b' --include='*.js' --include='*.cjs' --include='*.sh' --include='*.md' --include='*.json' --include='*.ts'`
- `foundation-frameworks/superpowers-main/` — full directory walk; counts verified
- `foundation-frameworks/superpowers-main/skills/` — all 14 skill directories enumerated, sub-files spot-checked
- `foundation-frameworks/superpowers-main/agents/code-reviewer.md` — single-agent collision confirmed
- `foundation-frameworks/superpowers-main/hooks/` — 4 hook files verified (`hooks.json`, `hooks-cursor.json`, `run-hook.cmd`, `session-start`)
- `foundation-frameworks/superpowers-main/hooks/session-start` — full content read; `<EXTREMELY_IMPORTANT>` literal at line 35 verified, `using-superpowers` literal at lines 18 + 35 verified
- `foundation-frameworks/superpowers-main/LICENSE` — copyright line verified
- `foundation-frameworks/superpowers-main/.opencode/` — confirmed presence (`INSTALL.md` + `plugins/superpowers.js`); `.opencode-plugin/` confirmed ABSENT
- `foundation-frameworks/superpowers-main/.{claude,codex,cursor}-plugin/` — manifest files verified

### Secondary (HIGH confidence — pre-existing project research)

- `.planning/research/SUMMARY.md` (2026-04-27)
- `.planning/research/PITFALLS.md` (2026-04-27) — 23 pitfalls
- `.planning/research/ARCHITECTURE.md` (2026-04-27) — Option A justification
- `.planning/research/STACK.md` (2026-04-27) — tech stack rationale
- `.planning/research/FEATURES.md` (2026-04-27) — full upstream inventory + 14 overlap pairs (§4)
- `.planning/REQUIREMENTS.md` (2026-04-27) — 100 v1 requirements
- `.planning/ROADMAP.md` (2026-04-27) — Phase 1 success criteria
- `.planning/PROJECT.md` (2026-04-27) — vision, constraints, anti-features
- `CLAUDE.md` — project tech-stack prescription
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` (2026-04-27) — 23 locked decisions

### Tertiary (REFERENCED, not re-verified)

- npm docs on git URL install lifecycle (`prepare` runs, `prepublishOnly` does not) — referenced in PITFALLS.md Pitfall 5
- JSON Schema 2020-12 spec — referenced for schema designs

---

## Metadata

**Confidence breakdown:**
- Inventory counts: **HIGH** — direct filesystem inspection, exact counts
- Env-var surface: **HIGH** — exhaustive grep against upstream source
- Identifier patterns: **HIGH** — exhaustive grep + pattern verification
- License source texts: **HIGH** — verbatim reads of LICENSE files
- Decision file count recommendation: **MEDIUM** — judgment call (15 vs 14 vs fewer ADRs); planner can adjust
- rename-map schema: **HIGH** — derived from rule-typing prescription in Pitfall 1 + JSON Schema 2020-12 conventions
- file-inventory schema: **MEDIUM** — 4 added fields are recommendations, not user-locked
- Validation architecture: **HIGH** — derived from CLAUDE.md + node:test prescription

**Research date:** 2026-04-27
**Valid until:** Phase 1 completion. Inventory counts re-verify against upstream at Phase 9 sync time (per CONTEXT.md §specifics: "do not pull fresh upstream during this phase").
