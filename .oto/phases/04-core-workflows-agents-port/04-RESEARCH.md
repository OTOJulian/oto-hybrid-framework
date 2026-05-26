# Phase 4: Core Workflows & Agents Port - Research

**Researched:** 2026-04-29
**Domain:** Bulk-port of GSD spine (workflows + retained agents) through the rebrand engine, plus Claude-stable MR-01 dogfood
**Confidence:** HIGH

## Summary

Phase 4 is a bounded *content port* — `scripts/rebrand.cjs --apply` takes the keep-rows in `decisions/file-inventory.json` and emits a rebranded tree under `oto/`. The engine, inventory, agent-audit verdicts, rename-map, schema, and installer plumbing are all already shipped (Phases 1–3); Phase 4 adds no new engine code. What Phase 4 *does* contribute is (a) the curated post-rebrand patches that the engine cannot produce mechanically — most importantly rewriting `Task(subagent_type="gsd-<dropped>")` calls in retained workflows, (b) Phase-4-specific verifications (frontmatter schema, agent reference graph, sandbox map, generic-agent allowlist, shipped-payload `.planning/` leak grep, command→workflow existence), (c) the Codex `CODEX_AGENT_SANDBOX` map population for AGT-04, and (d) the disposable MR-01 dogfood evidence.

The reference graph collected from upstream is concrete: 22 distinct `Task(subagent_type=)` values appear across the 88 KEEP workflows; 21 of them resolve to retained agents after rebrand; **one** resolves to a dropped agent (`gsd-pattern-mapper` invoked at line 685 of `plan-phase.md`); `general-purpose` appears as a generic example which must be allowlisted; and **the upstream `commands/gsd/debug.md`** invokes the dropped `gsd-debug-session-manager` twice. The upstream `ai-integration-phase.md` workflow + command pair references 3 dropped AI/eval agents (`gsd-framework-selector`, `gsd-ai-researcher`, `gsd-eval-planner`); `eval-review.md` references `gsd-eval-auditor`; `ingest-docs.md` references both dropped doc-* agents; `profile-user.md` references `gsd-user-profiler`. Each of these is a hard fixup in Phase 4 scope — they cannot ship as-is per D-09.

**Primary recommendation:** Run the rebrand engine's apply mode against `foundation-frameworks/get-shit-done-main/` into a working tree under `oto/`, then layer five categories of curated fixups (dropped-agent rewrites, deferred-phase TODO markers, generic-agent allowlist comments, AI-integration scaffold rewrite, sandbox-map population). Validate via 7 focused `node:test` files and one disposable MR-01 dogfood transcript. Do not touch `scripts/rebrand/` or `bin/lib/install.cjs`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bulk Port Shape**
- **D-01:** Use the rebrand engine to generate the Phase 4 baseline, then apply curated fixups. Do not hand-copy the full port as the primary path.
- **D-02:** `decisions/file-inventory.json` is the source of truth for inclusion, but ROADMAP Phase 4 defines the phase boundary. Inventory rows that belong to Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, or Phase 10 are not pulled forward just because they are keep/merge rows.
- **D-03:** Within the Phase 4 boundary, port all keep/merge inventory rows in workflow, command, agent, context, template, and required helper classes needed for end-to-end Claude use.
- **D-04:** If generated rebrand output conflicts with prior ADRs, prior CONTEXT.md decisions, or this context file, the prior decision wins and the generated output is patched.

**Claude Stability Gate**
- **D-05:** MR-01 is proven by both automated smoke coverage and one real dogfood flow. Automated checks alone are not enough.
- **D-06:** The dogfood flow runs in a disposable temp/sample project, not this repo and not a separate real project.
- **D-07:** Blocking dogfood failures are limited to the core spine: `/oto-new-project`, `/oto-plan-phase`, `/oto-execute-phase`, `/oto-verify-work`, `/oto-progress`, `/oto-pause-work`, `/oto-resume-work`. Other command issues can become follow-up tasks unless they break those core flows.
- **D-08:** Record MR-01 evidence in both `04-HUMAN-UAT.md` and `04-VERIFICATION.md`: UAT captures operator approval and transcript summary; verification captures technical evidence.

**Agent & Workflow Reference Policy**
- **D-09:** Every executable `Task(subagent_type=...)` reference must point to a retained `oto-*` agent. References to dropped agents are blockers.
- **D-10:** Generic agent references from upstream examples are hard failures unless explicitly allowlisted as inert docs/examples.
- **D-11:** Workflow references to Phase 5/6/8 capabilities must remain visibly deferred or TODO-marked. Commands must not pretend unavailable hooks, skills, or runtime parity behavior exists.
- **D-12:** Every installed command must point to an existing rebranded workflow file. Do not install commands that reference missing workflows, and do not replace workflow files with inline command logic.

**`.planning` Leak Enforcement**
- **D-13:** Enforce zero path-like `.planning/` leaks in shipped/runtime payload only: `oto/`, installed `commands/`, `agents/`, `bin/`, `hooks/`, and `skills/`.
- **D-14:** `.planning/` remains allowed in this repo's GSD planning artifacts because those files are not shipped oto runtime content.
- **D-15:** Implement leak enforcement with both a focused `node:test` grep-style test and a verification command recorded in `04-VERIFICATION.md`.
- **D-16:** Leave ordinary prose using the word "planning" alone. Only path-like `.planning` references are leaks.

**AI Integration Scaffolding**
- **D-17:** Port `/oto-ai-integration-phase` as a useful workflow using retained agents only.
- **D-18:** If the upstream AI-integration workflow references dropped AI/eval agents, Phase 4 must hard-fail and rewrite those references to retained agents or explicit deferred text before closeout.
- **D-19:** Do not resurrect dropped AI/eval agents in Phase 4. Preserve the Phase 1 trim decision unless it is intentionally reopened in a later decision.
- **D-20:** Treat WF-28 as a bounded exception: keep the command useful, but make unsupported internals explicit and leave no broken runtime references.

### Claude's Discretion
- Exact plan slicing, helper-file grouping, verification test filenames, and command transcript format.
- The planner may choose the concrete smoke-test harness shape as long as it proves the decisions above and keeps the MR-01 dogfood flow disposable.

### Deferred Ideas (OUT OF SCOPE)
- Phase 5 owns hook registration and SessionStart implementation.
- Phase 6 owns Superpowers skill payloads and agent-to-skill canonical invocations.
- Phase 7 owns workstreams and workspace isolation.
- Phase 8 owns Codex/Gemini runtime parity and full frontmatter/tool transform hardening.
- Phase 10 owns release CI/docs hardening beyond Phase 4's focused verification.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WF-01 | `/oto-new-project` works end-to-end on Claude | Inventory keeps `commands/gsd/new-project.md` + `workflows/new-project.md`; rebrand engine emits both at expected paths; no dropped-agent refs in either file |
| WF-02 | `/oto-discuss-phase` ditto | Inventory keeps `discuss-phase.md` + the `discuss-phase/modes/` and `discuss-phase/templates/` subdirs (10 files total); engine handles subdir paths |
| WF-03 | `/oto-plan-phase` ditto | KEEP, but contains the **single dropped-agent reference** in workflows: `gsd-pattern-mapper` at line 685 of upstream `plan-phase.md` — must be rewritten in Phase 4 |
| WF-04 | `/oto-execute-phase` ditto | KEEP + the `execute-phase/steps/` subdir (3 step files); no dropped-agent refs |
| WF-05 | `/oto-verify-work` ditto | KEEP; references `oto-verifier`; clean |
| WF-06 | `/oto-ship` | KEEP; clean |
| WF-07 | progress, next, resume-work, pause-work | All 4 KEEP; clean |
| WF-08 | help, update, health, stats, settings (+ settings-advanced, settings-integrations) | All KEEP; meta-commands; `update.md` mentions `npm install -g github:` install path which the rebrand engine handles via `package` rule |
| WF-09 | `/oto-undo` | KEEP; clean |
| WF-10 | `/oto-debug` | KEEP, but **command** file `commands/gsd/debug.md` invokes dropped `gsd-debug-session-manager` twice — must be rewritten to use only `oto-debugger` (audit/agent confirms `oto-debugger` "absorbs debug-session-manager responsibilities") |
| WF-11 | `/oto-fast`, `/oto-quick` | KEEP; clean |
| WF-12 | `/oto-do` | KEEP; clean |
| WF-13 | `/oto-spike`, `/oto-spike-wrap-up` | KEEP; clean |
| WF-14 | `/oto-sketch`, `/oto-sketch-wrap-up` | KEEP; clean |
| WF-15 | `/oto-explore` | KEEP; clean |
| WF-16 | note, add-todo, check-todos, plant-seed | All KEEP; clean |
| WF-17 | new-milestone, complete-milestone, milestone-summary | All KEEP; clean |
| WF-18 | add-phase, insert-phase, remove-phase, analyze-dependencies | All KEEP; clean (note: upstream filename is `edit-phase.md` for the underlying edit workflow that some of these front) |
| WF-19 | secure-phase, validate-phase | KEEP; reference retained `oto-security-auditor`; clean |
| WF-20 | code-review, code-review-fix | KEEP; reference `oto-code-reviewer` + `oto-code-fixer`; clean |
| WF-21 | ui-phase, ui-review | KEEP; reference 3 retained UI agents; clean |
| WF-22 | add-tests | KEEP; clean |
| WF-23 | map-codebase, scan | KEEP; reference `oto-codebase-mapper`; clean |
| WF-24 | docs-update | KEEP; references `oto-doc-writer`/`oto-doc-verifier`; clean (the dropped doc-* agents are referenced by `ingest-docs.md`, NOT by `docs-update.md`) |
| WF-25 | review | KEEP; clean |
| WF-28 | AI-integration scaffolding | Upstream `commands/gsd/ai-integration-phase.md` + `workflows/ai-integration-phase.md` reference 3 dropped agents; **bounded rewrite required per D-17/D-18/D-20** |
| WF-29 | autonomous | KEEP; cross-references many other commands; clean for retained agents |
| WF-30 | set-profile | KEEP (note: file inventory lists this under one of the meta groups; needs verification — upstream has it as a top-level command file) |
| AGT-02 | Drop Superpowers `code-reviewer` | Inventory row already DROP; engine respects file-inventory verdicts via walker; need explicit verification (file absent in `oto/agents/`) |
| AGT-03 | Retained agents pass schema validation; refs resolve | 23 retained agents per `decisions/agent-audit.md`; need a frontmatter validator + reference resolver test |
| AGT-04 | `CODEX_AGENT_SANDBOX` covers all retained agents | Currently empty in `bin/lib/runtime-codex.cjs`; populate with sandbox modes derived from agent tool sets (see Agent sandbox map section) |
| MR-01 | Claude daily-use stable | Disposable dogfood flow + transcript; recorded in 04-HUMAN-UAT.md + 04-VERIFICATION.md |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These directives are mandatory. The plan must not contradict them.

| Constraint | Implication for Phase 4 |
|------------|--------------------------|
| Node 22+ CommonJS top-level, no TypeScript | All Phase 4 verification scripts/tests are `.cjs`. |
| No top-level dependencies; use Node 22+ built-ins | Frontmatter parsing is hand-rolled (split on `---` lines), not `js-yaml` or `gray-matter`. |
| `node:test` is the test runner | Verification harness is `tests/phase-04-*.test.cjs` per Phase 1/2/3 precedent. |
| Files copied (not symlinked) at install time | Already handled by Phase 3 installer — Phase 4 only fills the source `oto/` tree. |
| No `prepublishOnly`; `prepare` not used either; `postinstall` runs `scripts/build-hooks.js` | Untouched by Phase 4. |
| Per-runtime adapters at install time, no runtime conditionals in `bin/install.js` | AGT-04's sandbox map lives in `runtime-codex.cjs` (descriptor field), NOT in `install.js`. |
| `npm install -g github:owner/repo[#vX.Y.Z]` distribution | MR-01 dogfood uses `npm pack` → local install of the tarball into a tmp prefix. |
| GSD Workflow Enforcement | Phase 4 work runs through `/gsd-execute-phase`. |

## Standard Stack

### Core (already shipped, reused as-is)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `scripts/rebrand.cjs` | shipped Phase 2 | Entry point: `--apply --target <upstream> --out <oto-tree>` | Engine is verdict-agnostic; respects `do_not_rename`; round-trip-safe |
| `scripts/rebrand/lib/engine.cjs` | shipped Phase 2 | Orchestrator; consumes `rename-map.json` and `decisions/file-inventory.json` | Already produces the baseline; produces `reports/coverage-manifest.{pre,post}.json` |
| `rename-map.json` | shipped Phase 1 | Rule-typed rename instructions | Already locks `path` rule for `.planning` → `.oto`, identifier `gsd` → `oto`, command `/gsd-` → `/oto-`, agent path `agents/gsd-` → `agents/oto-`, command path `commands/gsd/` → `commands/oto/` |
| `decisions/file-inventory.json` | shipped Phase 1 | Per-file `verdict` + `target_path` | Walker references inventory; KEEP rows produce output, DROP rows are skipped |
| `bin/lib/runtime-codex.cjs` | shipped Phase 3 | Codex adapter (descriptor + lifecycle hooks) | AGT-04 extends descriptor with `agentSandboxes` field; no new module needed |
| `node:test` | Node 22+ built-in | Verification harness | Project test runner; matches `phase-01..03` precedent |

### Supporting (Node 22+ built-ins; zero deps)

| Built-in | Purpose | Use Case |
|----------|---------|----------|
| `fs/promises` | Filesystem ops | Read/write rebranded files; walk `oto/` for verification tests |
| `child_process.spawnSync` | Spawn external commands | MR-01 dogfood: `npm pack`, `npm install -g <tarball> --prefix <tmp>`, `oto install --claude --config-dir <tmp>` |
| `os.tmpdir()` + `fs.mkdtempSync` | Disposable test dirs | Dogfood project root; matches Phase 3 integration-test pattern |
| `node:util.parseArgs` | CLI parsing in any Phase 4 helper script | Already used in `bin/lib/args.cjs` and `scripts/rebrand.cjs` |

### Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Engine-driven port | Hand-copy each KEEP file into `oto/` | D-01 explicitly forbids hand-copy as primary path; engine is round-trip-safe and handles 200+ files in seconds |
| `gray-matter`/`js-yaml` for frontmatter | Hand-rolled `---`/`---` split | Pitfall 11 (rigor inflation); zero-dep stack constraint from CLAUDE.md; frontmatter is a fenced YAML block — parse with `text.split(/^---$/m).slice(1, 2)[0]` and a tiny `key: value` scanner |
| New rebrand engine modes for "Phase 4 fixups" | Curated post-rebrand patches | D-04 (prior decisions win, generated output is patched); fixups are file-specific edits, not new rule classes |
| Real-runtime install for MR-01 (`~/.claude` clobber) | Disposable temp project + `--config-dir` | D-06: dogfood is disposable; matches Phase 3 D-23 integration-smoke pattern that already uses `oto install --claude --config-dir <tmp>` |

**Installation:** No new dependencies. Phase 4 installs nothing.

**Version verification:** No new packages, so no `npm view` checks needed.

## Architecture Patterns

### Recommended Project Structure

```
oto/                                  # NEW — populated by Phase 4
├── commands/oto/                     # 78 ported command files (KEEP rows)
│   ├── new-project.md
│   ├── plan-phase.md
│   ├── execute-phase.md
│   ├── ...
│   └── ai-integration-phase.md       # rewritten per D-17/D-18/D-20
├── agents/                           # 23 ported agent files
│   ├── oto-planner.md
│   ├── oto-executor.md
│   ├── ...
│   └── oto-verifier.md
├── workflows/                        # 88 workflow files (incl. subdirs)
│   ├── new-project.md
│   ├── plan-phase.md                 # patched: gsd-pattern-mapper -> deferred TODO
│   ├── ai-integration-phase.md       # patched per D-17/D-18/D-20
│   ├── discuss-phase/
│   │   ├── modes/...
│   │   └── templates/...
│   └── execute-phase/steps/...
├── contexts/                         # 3 files: dev.md, research.md, review.md
├── templates/                        # 43 templates (AI-SPEC.md, VALIDATION.md, etc.)
└── references/                       # 51 reference files (gates.md, agent-contracts.md, etc.)

bin/lib/runtime-codex.cjs             # MODIFIED — adds agentSandboxes descriptor field

tests/                                # NEW Phase 4 tests
├── phase-04-frontmatter-schema.test.cjs
├── phase-04-task-refs-resolve.test.cjs
├── phase-04-no-dropped-agents.test.cjs
├── phase-04-generic-agent-allowlist.test.cjs
├── phase-04-codex-sandbox-coverage.test.cjs
├── phase-04-superpowers-code-reviewer-removed.test.cjs
├── phase-04-planning-leak.test.cjs
├── phase-04-command-to-workflow.test.cjs
└── phase-04-rebrand-smoke.test.cjs   # runs the engine against foundation-frameworks/, asserts oto/ shape

.planning/phases/04-core-workflows-agents-port/
├── 04-CONTEXT.md (exists)
├── 04-RESEARCH.md (this file)
├── 04-VALIDATION.md (planner generates from template)
├── 04-PLAN.md (planner generates)
├── 04-VERIFICATION.md (executor generates)
└── 04-HUMAN-UAT.md (executor generates from MR-01 dogfood)
```

### Pattern 1: Engine-driven port + targeted patch list

**What:** Phase 4's first-wave action is a single engine invocation:
```bash
node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --out oto/ --force
```
The engine consumes `rename-map.json` + `decisions/file-inventory.json` (verdicts) and writes the rebranded tree to `oto/`. Subsequent waves apply file-specific patches that the engine cannot mechanically produce.

**When to use:** Always — D-01 locks this as the primary path.

**Example:** The engine already handles
- `commands/gsd/<x>.md` → `commands/oto/<x>.md` (path rule)
- `agents/gsd-<x>.md` → `agents/oto-<x>.md` (path rule)
- `gsd-` identifier → `oto-` (identifier rule with word boundary)
- `Task(subagent_type="gsd-planner")` → `Task(subagent_type="oto-planner")` (identifier rule, since `gsd-planner` has no boundary issues)
- `.planning/` → `.oto/` (path rule, segment match)
- `subagent_type="general-purpose"` is masked by the existing `do_not_rename` `pattern` entry — already allowlisted but not enforced as "must remain"; needs Phase 4 test for D-10
- License blocks and attribution URLs are masked by `maskPreservedUrls` in `engine.cjs:107`

### Pattern 2: Inventory-bounded port (D-02 phase boundary enforcement)

**What:** The engine produces output for every KEEP/MERGE inventory row. Phase 4 consumes only the rows that fall within the Phase 4 boundary; the rest stay in inventory but are not under Phase 4's verification scope.

**When to use:** When deciding what to verify vs. defer. Phase 4 verifies the populated `oto/commands/`, `oto/agents/`, `oto/workflows/`, `oto/contexts/`, `oto/templates/`, `oto/references/`. Hooks files (in `oto/hooks/` source tree) and skill files (in `oto/skills/`) are inventory KEEP rows but Phase 5 / Phase 6 own them — Phase 4 does NOT verify them. Workstream/workspace command files (`workstreams.md`, `list-workspaces.md`, `new-workspace.md`, `remove-workspace.md`) are inventory KEEP rows but Phase 7 owns them; Phase 4 ports the markdown so commands resolve to a workflow file (D-12) but does not certify they actually work end-to-end.

### Pattern 3: Dual marker for the install + file-inventory verdict (already locked)

**What:** Phase 3 D-08 set up `<configDir>/oto/.install.json` as the per-runtime install manifest. The Phase 3 installer iterates `adapter.sourceDirs` (`oto/commands`, `oto/agents`, `oto/skills`, `oto/hooks/dist`) — Phase 4 fills the first two. **No installer changes are needed.**

### Anti-Patterns to Avoid

- **Hand-copying KEEP files instead of running the engine.** Bypasses round-trip safety (Phase 2 SC#4) and forces a re-fork at every upstream sync. Forbidden by D-01.
- **Resurrecting dropped agents to satisfy upstream references.** D-19 explicit. The fix is to rewrite the references, not the trim verdict.
- **Inlining workflow logic into command files.** D-12 forbids it; the Phase 3 installer copies both `commands/oto/` and `workflows/` and the commands `@`-include workflows.
- **Adding rebrand-engine special cases for Phase 4.** The engine is verdict-agnostic by design (Phase 2 D-03). Curated patches live as scripted edits or hand-applied diffs, not new rule classes.
- **Treating `subagent_type="general-purpose"` as a violation.** It is intentionally allowlisted in `rename-map.json:55` as inert example syntax. The verification test must mark it OK (D-10).
- **Editing `bin/install.js` to add the sandbox map.** AGT-04's sandbox map belongs to `runtime-codex.cjs` (Phase 3 D-12 explicitly says Codex adapter receives it). Inline in `install.js` would violate Phase 3 SC#2 ("no runtime-conditional branches outside adapter modules").
- **Running the dogfood inside this repo.** D-06 forbids it; clobbers our `.planning/` tree.
- **Letting `.planning/` leak into `oto/`.** The path rule `{ "from": ".planning", "to": ".oto", "match": "segment" }` already rebrands path-shaped occurrences during the engine run. Phase 4 verifies the result is clean.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk file rename + content rewrite | Per-file `sed` / hand-edit | `scripts/rebrand.cjs --apply` | Engine is round-trip-safe, allowlist-aware, license-preserving; tested with synthetic + real-tree fixtures (Phase 2) |
| Frontmatter validation library | Add `gray-matter` | Hand-rolled `---/---` split + key/value scan | Frontmatter shape is fixed: `name:`, `description:`, `tools:`, `model:`?, `color:`?. Total parser ~30 lines |
| YAML parser | `js-yaml` | n/a — flat key/value list per agent | All `tools:` values are comma-separated lists; no nested YAML |
| Glob matching | `minimatch`/`fast-glob` | `node:fs.readdirSync` + path-prefix checks | Phase 2 D-15: zero-dep precedent; engine already uses `node:fs.glob` where needed |
| TOML manipulation for sandbox map | Port the 800-line upstream TOML suite into Phase 4 | Just an in-memory descriptor field on the Codex adapter | Phase 3 D-12: TOML manipulation is Phase 5's problem. Phase 4 only registers the **data** (sandbox modes per agent name); reading/writing TOML happens in Phase 5 |
| Test reporter / CI integrator | Custom dashboard | `node:test` default reporter | Pitfall 11 |
| MR-01 dogfood orchestration framework | Bash test harness library | `node:test` integration-style file using `spawnSync` | Mirrors `tests/phase-03-install-claude.integration.test.cjs` |

**Key insight:** Phase 4 inherits a finished engine, finished installer, finished schemas. The risk is *over*-building Phase-4-specific tooling. The job is data + curated patches + verification, not new infrastructure.

## Phase 4 inclusion set

These inventory rows are within the Phase 4 boundary. Counts derived from grepping `decisions/file-inventory.md`. Target paths come straight from inventory `target` column.

### Commands (78 KEEP rows)

All `commands/gsd/<name>.md` rows where `verdict=KEEP` map to `commands/oto/<name>.md`. The list is the 78 KEEP rows in the inventory's `## command` section. Notable inclusions for the success-criteria-1 list of "28 listed `/oto-*` workflows":

| Requirement | Command file |
|-------------|--------------|
| WF-01 | `commands/oto/new-project.md` |
| WF-02 | `commands/oto/discuss-phase.md` |
| WF-03 | `commands/oto/plan-phase.md` |
| WF-04 | `commands/oto/execute-phase.md` |
| WF-05 | `commands/oto/verify-work.md` |
| WF-06 | `commands/oto/ship.md` |
| WF-07 | `commands/oto/progress.md`, `next.md`, `resume-work.md`, `pause-work.md` |
| WF-08 | `commands/oto/help.md`, `update.md`, `health.md`, `stats.md`, `settings.md`, `settings-advanced.md`, `settings-integrations.md` |
| WF-09 | `commands/oto/undo.md` |
| WF-10 | `commands/oto/debug.md` (PATCH: drop debug-session-manager refs) |
| WF-11 | `commands/oto/fast.md`, `quick.md` |
| WF-12 | `commands/oto/do.md` |
| WF-13 | `commands/oto/spike.md`, `spike-wrap-up.md` |
| WF-14 | `commands/oto/sketch.md`, `sketch-wrap-up.md` |
| WF-15 | `commands/oto/explore.md` |
| WF-16 | `commands/oto/note.md`, `add-todo.md`, `check-todos.md`, `plant-seed.md` |
| WF-17 | `commands/oto/new-milestone.md`, `complete-milestone.md`, `milestone-summary.md` |
| WF-18 | `commands/oto/add-phase.md`, `insert-phase.md`, `remove-phase.md`, `analyze-dependencies.md` |
| WF-19 | `commands/oto/secure-phase.md`, `validate-phase.md` |
| WF-20 | `commands/oto/code-review.md`, `code-review-fix.md` |
| WF-21 | `commands/oto/ui-phase.md`, `ui-review.md` |
| WF-22 | `commands/oto/add-tests.md` |
| WF-23 | `commands/oto/map-codebase.md`, `scan.md` |
| WF-24 | `commands/oto/docs-update.md` |
| WF-25 | `commands/oto/review.md` |
| WF-28 | `commands/oto/ai-integration-phase.md` (REWRITE per D-17/D-18/D-20) |
| WF-29 | `commands/oto/autonomous.md` |
| WF-30 | `commands/oto/set-profile.md` |

The other ~50 KEEP commands (e.g., `add-backlog.md`, `audit-fix.md`, `audit-milestone.md`, `audit-uat.md`, `cleanup.md`, `eval-review.md`, `forensics.md`, `import.md`, `ingest-docs.md`, `manager.md`, `pr-branch.md`, `plan-milestone-gaps.md`, `plan-review-convergence.md`, `research-phase.md`, `review-backlog.md`, `secure-phase.md`, `session-report.md`, `sync-skills.md`, `transition.md`, `ultraplan-phase.md`*, etc.) ride along — they ship as files because the engine ports all KEEP rows; they are NOT part of the success-criteria #1 verification set, but they MUST resolve to a workflow file (D-12) and MUST NOT contain dropped-agent references (D-09).

> *Note: `ultraplan-phase.md` appears in upstream commands and is listed in inventory as KEEP, but the user's `.planning/REQUIREMENTS.md` "Out of Scope" line says "`/gsd-ultraplan-phase` (BETA) — Upstream BETA; defer until proven." The inventory may need a one-row reconciliation; flag for planner to confirm. Per D-04 the prior decision wins, which means inventory should be fixed-up and `ultraplan-phase.md` should land as DROP. Action: planner adds an inventory patch step or carries an explicit drop in Phase 4.

### Agents (23 KEEP rows)

| Agent path (after rebrand) | Source agent | Tools (from upstream frontmatter) |
|----------------------------|--------------|------------------------------------|
| `agents/oto-advisor-researcher.md` | gsd-advisor-researcher | Read, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__* |
| `agents/oto-assumptions-analyzer.md` | gsd-assumptions-analyzer | Read, Bash, Grep, Glob |
| `agents/oto-code-fixer.md` | gsd-code-fixer | Read, Edit, Write, Bash, Grep, Glob |
| `agents/oto-code-reviewer.md` | gsd-code-reviewer | Read, Write, Bash, Grep, Glob |
| `agents/oto-codebase-mapper.md` | gsd-codebase-mapper | Read, Bash, Grep, Glob, Write |
| `agents/oto-debugger.md` | gsd-debugger | Read, Write, Edit, Bash, Grep, Glob, WebSearch |
| `agents/oto-doc-verifier.md` | gsd-doc-verifier | Read, Write, Bash, Grep, Glob |
| `agents/oto-doc-writer.md` | gsd-doc-writer | Read, Bash, Grep, Glob, Write |
| `agents/oto-domain-researcher.md` | gsd-domain-researcher | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__* |
| `agents/oto-executor.md` | gsd-executor | Read, Write, Edit, Bash, Grep, Glob, mcp__context7__* |
| `agents/oto-integration-checker.md` | gsd-integration-checker | Read, Bash, Grep, Glob |
| `agents/oto-nyquist-auditor.md` | gsd-nyquist-auditor | (empty `tools:`) |
| `agents/oto-phase-researcher.md` | gsd-phase-researcher | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*, mcp__firecrawl__*, mcp__exa__* |
| `agents/oto-plan-checker.md` | gsd-plan-checker | Read, Bash, Glob, Grep |
| `agents/oto-planner.md` | gsd-planner | Read, Write, Bash, Glob, Grep, WebFetch, mcp__context7__* |
| `agents/oto-project-researcher.md` | gsd-project-researcher | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*, mcp__firecrawl__*, mcp__exa__* |
| `agents/oto-research-synthesizer.md` | gsd-research-synthesizer | Read, Write, Bash |
| `agents/oto-roadmapper.md` | gsd-roadmapper | Read, Write, Bash, Glob, Grep |
| `agents/oto-security-auditor.md` | gsd-security-auditor | (empty `tools:`) |
| `agents/oto-ui-auditor.md` | gsd-ui-auditor | Read, Write, Bash, Grep, Glob |
| `agents/oto-ui-checker.md` | gsd-ui-checker | Read, Bash, Glob, Grep |
| `agents/oto-ui-researcher.md` | gsd-ui-researcher | Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*, mcp__firecrawl__*, mcp__exa__* |
| `agents/oto-verifier.md` | gsd-verifier | Read, Write, Bash, Grep, Glob |

### Workflows (88 KEEP rows + subdirs)

All `get-shit-done/workflows/<x>.md` and the two nested directories:
- `oto/workflows/discuss-phase/modes/{advisor,all,analyze,auto,batch,chain,default,power,text}.md` (8 mode files + 1 = 9 modes per inventory rows; 8 files visible)
- `oto/workflows/discuss-phase/templates/{context,discussion-log}.md`
- `oto/workflows/execute-phase/steps/{codebase-drift-gate,per-plan-worktree-gate,post-merge-gate}.md`

Total ~95 workflow paths.

### Contexts (3 KEEP rows)

`oto/contexts/dev.md`, `oto/contexts/research.md`, `oto/contexts/review.md` (from `get-shit-done/contexts/`).

### Templates (43 KEEP rows)

All `get-shit-done/templates/*.md`, `templates/codebase/*.md` (7 files), `templates/research-project/*.md` (5 files), `templates/config.json`. Includes the load-bearing `phase-prompt.md`, `planner-subagent-prompt.md`, `VALIDATION.md`, `AI-SPEC.md`, `UI-SPEC.md`, `UAT.md`, `SECURITY.md`, `DEBUG.md`, `state.md`, `roadmap.md`, `requirements.md`, `project.md`, `claude-md.md`, `copilot-instructions.md`, `discovery.md`, `discussion-log.md`, `milestone.md`, `milestone-archive.md`, `verification-report.md`, `retrospective.md`, `research.md`, `spec.md`, `summary.md`, `summary-{minimal,standard,complex}.md`, `user-profile.md`, `user-setup.md`, `dev-preferences.md`, `continue-here.md`, `context.md`, `debug-subagent-prompt.md`. Drop: `templates/README.md` (per inventory).

### References (51 KEEP rows)

All `get-shit-done/references/*.md` plus `references/few-shot-examples/{plan-checker,verifier}.md`. Of particular cross-reference importance:
- `references/agent-contracts.md` — defines the agent-frontmatter contract; Phase 4 frontmatter validation should align
- `references/gates.md`, `references/gate-prompts.md` — gate-text references used by workflows
- `references/mandatory-initial-read.md` — `@`-included by many agents
- `references/planner-*` (7 files), `references/executor-examples.md`, `references/verification-patterns.md` — load-bearing for retained agents

### Codex sandbox map (AGT-04)

Populated as a descriptor field on `bin/lib/runtime-codex.cjs`. Not a file in `oto/`, but Phase-4 deliverable. See "Agent sandbox map" section below.

## Phase 4 exclusion set

These inventory rows or paths are **NOT** ported by Phase 4 (or are explicit no-ops). The deferring phase is noted.

### Hooks payload — Phase 5

| Path | Inventory verdict | Phase 4 action |
|------|-------------------|----------------|
| `oto/hooks/oto-context-monitor.js` | KEEP (HK-03) | Engine produces `oto/hooks/<file>` paths in apply mode, but Phase 4 does **not** verify hook source files. Phase 5 owns content + `scripts/build-hooks.js` integration |
| `oto/hooks/oto-prompt-guard.js` | KEEP (HK-04) | Same |
| `oto/hooks/oto-read-injection-scanner.js` | KEEP (HK-05) | Same |
| `oto/hooks/oto-statusline.js` | KEEP (HK-02) | Same |
| `oto/hooks/oto-session-start` | MERGE (HK-01, D-08) | Phase 5 builds the consolidated hook from sources |

Note: the rebrand engine emits these into the `oto/hooks/` source tree if the inventory `target` rows say so, but they will not have content rewrites Phase 5 wants. Phase 4 may explicitly choose to apply only the Phase-4-relevant subset, or apply everything and let Phase 5 reshape. **Recommendation:** Apply everything (engine respects KEEP), and have Phase 4 verification only assert on `oto/{commands,agents,workflows,contexts,templates,references}/` — leave hook payload as Phase 5's verification surface.

### Skills payload — Phase 6

| Path | Inventory verdict | Phase 4 action |
|------|-------------------|----------------|
| `oto/skills/test-driven-development/SKILL.md` | KEEP (SKL-01) | Engine emits files; Phase 4 does NOT verify skills |
| ...the other 6 retained skills | KEEP | Same |

### Workstream/workspace — Phase 7

| Path | Inventory verdict | Phase 4 action |
|------|-------------------|----------------|
| `commands/oto/workstreams.md` | KEEP | Ported (D-12: command must resolve to a workflow file). Phase 4 does NOT certify it works end-to-end. Phase 7 owns. |
| `commands/oto/list-workspaces.md` | KEEP | Same |
| `commands/oto/new-workspace.md` | KEEP | Same |
| `commands/oto/remove-workspace.md` | KEEP | Same |
| `workflows/list-workspaces.md`, `new-workspace.md`, `remove-workspace.md` | KEEP | Same |

### Codex/Gemini parity — Phase 8

| Concern | Phase 4 action |
|---------|----------------|
| Codex `transformAgent` (frontmatter conversion) | Stays identity in `runtime-codex.cjs`. Sandbox-map data is added; transform is not |
| Codex TOML hooks/agents config | Phase 5 / Phase 8 |
| Gemini tool-name remapping | Phase 8 |
| Single-source-of-truth instruction-file template | Phase 8 (MR-02) |

### Release CI/docs — Phase 10

| Concern | Phase 4 action |
|---------|----------------|
| `commands/INDEX.md` auto-gen | Phase 10 (DOC-06) |
| README.md content | Phase 10 (DOC-01) |
| `release.yml`, `install-smoke.yml` workflows | Phase 10 (CI-02, CI-03) |
| `scripts/sync-upstream/*` | Phase 9 (SYN-01..07) |
| `tests/agent-frontmatter.test.cjs` upstream port | DROP per inventory; Phase 4 ships its own targeted frontmatter test |

### Inventory rows whose target paths flag known DROPs

These never enter `oto/` because the engine respects DROP verdicts:

- `agents/code-reviewer.md` (Superpowers) — AGT-02
- `agents/gsd-{ai-researcher,debug-session-manager,doc-classifier,doc-synthesizer,eval-auditor,eval-planner,framework-selector,intel-updater,pattern-mapper,user-profiler}.md` — ADR-07 trim
- `commands/gsd/{from-gsd2,graphify,inbox,intel,join-discord,profile-user,reapply-patches,thread,extract_learnings}.md` — anti-features / v2-deferred
- All translated READMEs and `docs/` entries — ADR-14
- `hooks/{gsd-check-update*,gsd-check-update-worker.js}` — oto distributes via npm/github
- `hooks/{gsd-phase-boundary.sh,gsd-read-guard.js,gsd-workflow-guard.js}` — DROP-review per agent-audit "Hooks subject to user confirmation"

## Workflow→agent reference graph

Built by grepping `subagent_type=` across upstream `get-shit-done/workflows/*.md` and `commands/gsd/*.md`. After rebrand, every `gsd-` becomes `oto-`. The engine handles the rename mechanically.

### Subagent values found in workflows (22 distinct + 1 generic)

| Source `subagent_type` | After rebrand | Audit verdict | Files referencing it |
|------------------------|---------------|---------------|----------------------|
| `gsd-assumptions-analyzer` | `oto-assumptions-analyzer` | KEEP | various |
| `gsd-code-fixer` | `oto-code-fixer` | KEEP | code-review-fix.md |
| `gsd-code-reviewer` | `oto-code-reviewer` | KEEP | code-review.md |
| `gsd-codebase-mapper` | `oto-codebase-mapper` | KEEP | map-codebase.md, scan.md |
| `gsd-debugger` | `oto-debugger` | KEEP | debug.md |
| `gsd-doc-writer` | `oto-doc-writer` | KEEP | docs-update.md |
| `gsd-executor` | `oto-executor` | KEEP | execute-phase.md, execute-plan.md |
| `gsd-integration-checker` | `oto-integration-checker` | KEEP | various audit workflows |
| `gsd-nyquist-auditor` | `oto-nyquist-auditor` | KEEP | various |
| `gsd-phase-researcher` | `oto-phase-researcher` | KEEP | discuss-phase.md, research-phase.md |
| `gsd-plan-checker` | `oto-plan-checker` | KEEP | plan-phase.md, plan-review-convergence.md |
| `gsd-planner` | `oto-planner` | KEEP | plan-phase.md (×6 invocations) |
| `gsd-project-researcher` | `oto-project-researcher` | KEEP | new-project.md (×4) |
| `gsd-research-synthesizer` | `oto-research-synthesizer` | KEEP | new-project.md, plan-phase.md |
| `gsd-roadmapper` | `oto-roadmapper` | KEEP | new-project.md (×2) |
| `gsd-security-auditor` | `oto-security-auditor` | KEEP | secure-phase.md |
| `gsd-ui-auditor` | `oto-ui-auditor` | KEEP | ui-review.md |
| `gsd-ui-checker` | `oto-ui-checker` | KEEP | ui-phase.md, ui-review.md |
| `gsd-ui-researcher` | `oto-ui-researcher` | KEEP | ui-phase.md |
| `gsd-verifier` | `oto-verifier` | KEEP | verify-work.md, verify-phase.md |
| **`gsd-pattern-mapper`** | **`oto-pattern-mapper`** | **DROP (ADR-07)** | **plan-phase.md:685 — BLOCKER** |
| `general-purpose` | `general-purpose` | (allowlisted generic) | examples in templates / planning artifacts |

### Subagent values found in commands (D-09 + D-12 scope)

Most commands `@`-include their workflow file rather than inline `Task()` calls. The exceptions:

| Command file | `subagent_type` | Verdict | Action |
|--------------|-----------------|---------|--------|
| `commands/gsd/debug.md` | `gsd-debug-session-manager` (×2) | DROP per ADR-07 | **REWRITE** to use `oto-debugger` (which "absorbs debug-session-manager responsibilities" per agent-audit.md) |
| `commands/gsd/debug.md` | `gsd-phase-researcher` | KEEP | engine-rebrands cleanly |

### Workflows referencing dropped agents in prose (Spawn `<name>`, even without `subagent_type=` syntax)

These are not Task-call invocations but they are still references that, after rebrand, would point at non-existent agent files. Per D-11 + D-19, these need rewrite or visible-deferred markers.

| Workflow | Dropped agent reference | Action |
|----------|--------------------------|--------|
| `workflows/ai-integration-phase.md` | `gsd-framework-selector`, `gsd-ai-researcher`, `gsd-eval-planner` (in headings, prose, `gsd-sdk query resolve-model` calls, "Spawn …" instructions) | Rewrite per D-17/D-18/D-20 (see "AI-integration scaffolding" below) |
| `workflows/eval-review.md` | `gsd-eval-auditor` (in Spawn heading + body) | Rewrite or mark explicitly deferred (the inventory KEEPs the workflow, but every functional path goes through a dropped agent — recommend marking the workflow body as "deferred until eval agents return"; keep file present so `commands/oto/eval-review.md` resolves per D-12) |
| `workflows/ingest-docs.md` | `gsd-doc-classifier`, `gsd-doc-synthesizer` | Rewrite to use `oto-doc-writer` per agent-audit "consolidated into oto-doc-writer + oto-doc-verifier" — or mark ingest-docs as bounded-deferred similar to WF-28. Recommend bounded-deferred since classifier + synthesizer pipeline semantics differ from doc-writer |
| `workflows/profile-user.md` | `gsd-user-profiler` | The corresponding command `commands/gsd/profile-user.md` is DROP (v2 NICH-V2-03), and `workflows/profile-user.md` is KEEP. Recommend: also mark workflow file as deferred per ADR-07; or treat as inert because no command references it |
| `workflows/settings.md` | grep finds dropped-agent string but NOT a Task call — likely a config-key/doc reference; verify before patching | Inspect; treat as documentation reference unless it's a Task call |

## Expected fixup categories

Five categories of post-rebrand patches the planner should expect, ordered by risk:

### Category A — Dropped-agent invocations (BLOCKERS)

Files whose **post-rebrand content** still references dropped agent names. These are D-09 hard failures.

1. `oto/workflows/plan-phase.md` (line 685) — `subagent_type="oto-pattern-mapper"` (will be the rebranded name; `oto-pattern-mapper.md` does not exist)
   - **Fix:** Either delete the optional `gsd-pattern-mapper` step (it is documented as "Optional" in upstream §7.8) or rewrite to call `oto-codebase-mapper` (which has overlapping codebase-exploration role per audit). Recommend: convert to optional/deferred TODO with clear comment, since `gsd-codebase-mapper` is currently not the pattern-mapping role.
2. `oto/commands/oto/debug.md` (lines 30, 163, 220, 241, 260) — `oto-debug-session-manager` references
   - **Fix:** Rewrite to invoke `oto-debugger` directly. `oto-debugger` audit explicitly says it "absorbs debug-session-manager responsibilities"; the command logic should fold the session-manager indirection.
3. `oto/workflows/ai-integration-phase.md` — `oto-framework-selector`, `oto-ai-researcher`, `oto-eval-planner` (headings, body, Spawn instructions, `oto-sdk query resolve-model` env-var lookups)
   - **Fix:** See "AI-integration scaffolding rewrite" below.
4. `oto/commands/oto/ai-integration-phase.md` — `oto-framework-selector → oto-ai-researcher → oto-domain-researcher → oto-eval-planner` orchestration line in `<objective>`
   - **Fix:** Rewrite objective to describe deferred state per D-20.
5. `oto/workflows/eval-review.md` — `oto-eval-auditor` in step heading + body
   - **Fix:** Mark workflow body as "Deferred — eval agents are deferred per ADR-07" with TODO; keep file so `commands/oto/eval-review.md` (KEEP) resolves per D-12.
6. `oto/workflows/ingest-docs.md` — `oto-doc-classifier`, `oto-doc-synthesizer`
   - **Fix:** Bounded-deferred similar to WF-28: keep the entry usable for "ingest a single doc against `oto-doc-writer`" or mark whole workflow deferred. Recommend deferred since pipeline semantics don't transfer cleanly.
7. `oto/workflows/profile-user.md` — `oto-user-profiler`
   - **Fix:** No corresponding command (DROP), so the file is inert. Either delete the workflow file (it's KEEP in inventory but the command is DROP — flag for inventory reconciliation) or mark deferred. Recommend delete; flag for planner.
8. **Inventory reconciliation pass** for `commands/gsd/ultraplan-phase.md` if planner agrees with PROJECT.md "Out of Scope" line (see commands list note above).

### Category B — Deferred-phase TODO markers (non-blocking)

References to capabilities owned by Phase 5/6/8 that workflows mention but don't actually invoke during a Phase 4 dogfood. Per D-11, these stay visibly deferred.

- Workflows that reference `oto:<skill>` invocations (Phase 6): leave as-is in workflow text, since the routing rule (`decisions/skill-vs-command.md`) says workflow wins when active. The `oto:` namespace will silently no-op because the skills aren't installed yet.
- Workflows that mention hooks (e.g., `oto-statusline`, `oto-session-start`): leave as-is; hooks are inert until Phase 5.
- Workflows that mention Codex/Gemini-specific behavior: leave as-is; only Claude is being dogfooded.

### Category C — Generic-agent allowlist (D-10)

`subagent_type="general-purpose"` appears as inert example syntax in upstream files (and is already in `rename-map.json`'s `do_not_rename` patterns at line 55). Phase 4 needs a positive verification test (`phase-04-generic-agent-allowlist.test.cjs`) that asserts these exact occurrences are tolerated and any *other* unrecognized `subagent_type` value would fail.

The generic allowlist contents are exactly: `general-purpose`, `generalPurpose`, `general`, `X`, `general_purpose_task`. Phase 4 hard-codes this list in the Task-refs-resolve test as the explicit waiver.

### Category D — Codex sandbox map population (AGT-04)

`bin/lib/runtime-codex.cjs` currently has no `agentSandboxes` field. Phase 4 adds it as a descriptor (data-only):

```js
agentSandboxes: {
  'oto-planner': 'workspace-write',
  'oto-executor': 'workspace-write',
  // ...all 23 retained agents
}
```

Sandbox modes derived from upstream `CODEX_AGENT_SANDBOX` (foundation-frameworks/get-shit-done-main/bin/install.js:26-38) plus per-agent tool-set inference for the 12 retained agents not in upstream map. See "Agent sandbox map" section.

### Category E — Inventory `target` glitches (engine output corrections)

A few inventory rows have target paths the planner should sanity-check after the engine runs:

- Workflow `discuss-phase/modes/default.md` and `discuss-phase/modes/all.md` are siblings of the rest under `oto/workflows/discuss-phase/modes/` — confirm engine produces the directory shape correctly (it should via the path rule; spot-check).
- Templates `research-project/SUMMARY.md` etc. — spot-check directory shape.
- `commands/oto/audit-uat.md`, `audit-fix.md`, `audit-milestone.md` are KEEP commands but NOT in the success-criteria-1 list of 28; verify they don't break (D-12) but don't certify daily-use.

## Agent sandbox map

Recommended `agentSandboxes` field for `bin/lib/runtime-codex.cjs`. Rationale per agent: agents that have `Write` or `Edit` tools or write to `.oto/` filesystem state need `workspace-write`; pure-read agents need `read-only`. Upstream map covers 11 agents; the remaining 12 retained agents are inferred from agent-audit.md role + the per-agent `tools:` field.

| Agent | Sandbox mode | Source |
|-------|--------------|--------|
| `oto-advisor-researcher` | `read-only` | Tools: Read,Bash,Grep,Glob,WebSearch,WebFetch,context7. No Write/Edit |
| `oto-assumptions-analyzer` | `read-only` | Tools: Read,Bash,Grep,Glob. Audit role; emits text not files |
| `oto-code-fixer` | `workspace-write` | Tools: Read,Edit,Write,Bash,Grep,Glob. Edits code |
| `oto-code-reviewer` | `workspace-write` | Tools: Read,Write,Bash,Grep,Glob. Writes review docs to `.oto/` |
| `oto-codebase-mapper` | `workspace-write` | Upstream map. Writes analysis to `.oto/codebase/` |
| `oto-debugger` | `workspace-write` | Upstream map. Tools include Edit,Write |
| `oto-doc-verifier` | `workspace-write` | Tools: Read,Write,Bash,Grep,Glob. Writes verification reports |
| `oto-doc-writer` | `workspace-write` | Tools: Read,Bash,Grep,Glob,Write. Authors docs |
| `oto-domain-researcher` | `workspace-write` | Tools: Read,Write,Bash,Grep,Glob,WebSearch,WebFetch,context7. Writes RESEARCH.md fragments |
| `oto-executor` | `workspace-write` | Upstream map. Implements code |
| `oto-integration-checker` | `read-only` | Upstream map. Tools: Read,Bash,Grep,Glob. Read-only check |
| `oto-nyquist-auditor` | `workspace-write` | Tools field is empty (defaults broad). Audit-role, but writes VALIDATION.md per Nyquist; safer to grant write |
| `oto-phase-researcher` | `workspace-write` | Upstream map. Writes RESEARCH.md |
| `oto-plan-checker` | `read-only` | Upstream map. Read-only review of plan |
| `oto-planner` | `workspace-write` | Upstream map. Writes PLAN.md |
| `oto-project-researcher` | `workspace-write` | Upstream map. Writes research artifacts |
| `oto-research-synthesizer` | `workspace-write` | Upstream map. Writes SUMMARY.md |
| `oto-roadmapper` | `workspace-write` | Upstream map. Writes ROADMAP.md |
| `oto-security-auditor` | `workspace-write` | Tools field empty; audit role; writes SECURITY.md per template; grant write |
| `oto-ui-auditor` | `workspace-write` | Tools: Read,Write,Bash,Grep,Glob |
| `oto-ui-checker` | `read-only` | Tools: Read,Bash,Glob,Grep |
| `oto-ui-researcher` | `workspace-write` | Tools: Read,Write,Bash,Grep,Glob,WebSearch,WebFetch,context7,firecrawl,exa |
| `oto-verifier` | `workspace-write` | Upstream map. Writes verification report |

**Default for absent keys:** Upstream uses `read-only` as the fallback (`install.js:2018`). Phase 4 explicitly enumerates all 23, so the fallback is never hit. AGT-04 verification asserts `Object.keys(agentSandboxes).length === 23` and that the set matches the retained-agent list from `decisions/agent-audit.md`.

## AI-integration scaffolding rewrite (D-17/D-18/D-20)

The upstream `ai-integration-phase.md` orchestrates `gsd-framework-selector → gsd-ai-researcher → gsd-domain-researcher → gsd-eval-planner` with a 4-step flow. Three of the four agents are dropped; only `oto-domain-researcher` survives.

**Recommended rewrite strategy:**

1. **Preserve the `commands/oto/ai-integration-phase.md` file entry** so `/oto-ai-integration-phase` resolves to a workflow per D-12 and remains discoverable in `/oto-help`.
2. **Rewrite `<objective>` and `<process>` blocks in the command** to describe the bounded state explicitly: "Generate an AI design contract (AI-SPEC.md) for AI-feature phases. v0.1.0 ships only the Domain Research step (via `oto-domain-researcher`); framework selection and evaluation strategy are deferred until eval agents return in v2 (see ADR-07)."
3. **Rewrite `oto/workflows/ai-integration-phase.md`** to:
   - Keep step 6 (Domain Research) and run it through `oto-domain-researcher`.
   - Replace steps 5, 7, 9 (Framework Selection, AI Research, Eval Planning) with explicit DEFERRED blocks that print a message to the user explaining what's missing and how to manually fill `AI-SPEC.md` until eval agents return. Do NOT silently skip — print so the user knows.
   - Drop `gsd-sdk query resolve-model gsd-{framework-selector,ai-researcher,eval-planner}` env-var lookups (these would resolve to `null` at runtime).
4. **`AI-SPEC.md` template** (`oto/templates/AI-SPEC.md`) — keep as-is; the template is purely documentary and survives the rebrand engine cleanly. Verify post-rebrand it has no `gsd-` references.

This satisfies D-17 (useful-but-bounded), D-18 (no broken refs), D-19 (no resurrection), and D-20 (explicit unsupported internals).

## `.planning/` leak enforcement

### Path-like-leak grep regex

Path occurrences look like `.planning/`, `'.planning'`, `".planning"`, `\.planning/`, `(.planning/)`, `^.planning$`. Bare prose `planning` in a sentence must NOT match. Recommend regex:

```js
// Match .planning followed by a path separator OR enclosed in path-like delimiters
const PLANNING_LEAK_RE = /(?<![A-Za-z0-9_])\.planning(?=\/|["'`)\s$]|$)/g;
```

Where:
- `(?<![A-Za-z0-9_])` — left boundary: must not be inside an identifier
- `\.planning` — literal `.planning`
- `(?=\/|["'`)\s$]|$)` — right context: a slash, a quote/backtick, a closing paren, whitespace, or end-of-line

This matches:
- `.planning/STATE.md` ✓
- `'.planning'` ✓
- `".planning/"` ✓
- `cd .planning/foo` ✓
- `(.planning/)` ✓

But not:
- `the planning is hard` ✗ (no leading dot)
- `myAppPlanning.txt` ✗ (no `.planning` literal)
- `planning.md` ✗ (no leading dot)

### Shipped-payload paths to scan

```js
const SHIPPED_PAYLOAD_DIRS = [
  'oto/commands',
  'oto/agents',
  'oto/workflows',
  'oto/contexts',
  'oto/templates',
  'oto/references',
  'oto/skills',     // empty in Phase 4 but include for forward-compat
  'oto/hooks',      // empty in Phase 4
  'bin',
  'hooks',
];
```

The test walks these paths under repo root and applies the regex. **Excluded:** `foundation-frameworks/`, `.planning/`, `decisions/`, `tests/`, `scripts/`, anything under `node_modules/`, `reports/`, `.oto-rebrand-out/`.

### Why this enforcement is more conservative than success-criterion-5

Success criterion 5 says "grep for `.planning/` (excluding `foundation-frameworks/`) returns zero hits." That's broader than D-13. **Use D-13's narrower scope** (shipped payload only) since `.planning/` rightly appears in this repo's GSD planning artifacts. The Phase 4 planner should reconcile the two by interpreting SC#5 as "in shipped payload" — confirm with user if ambiguous.

## Runtime State Inventory

> Phase 4 is a content port over a fresh `oto/` tree. There is no rename of an in-place runtime, no migration of stored data, and no service that registers the old name. The only "runtime state" concerns are the inventory contents Phase 3 placed under runtime config dirs (e.g., `~/.claude/oto/.install.json`) — these are wiped/rewritten on next `oto install`.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | None — there is no oto database, no Mem0, no ChromaDB. The `.oto/STATE.md` file lives per-project and is content not stored elsewhere. | None |
| Live service config | None — n8n/Datadog/etc. not in this stack | None |
| OS-registered state | None — no Task Scheduler, launchd, pm2 entries reference `oto` agent identifiers | None |
| Secrets/env vars | `OTO_VERSION`, `OTO_RUNTIME`, etc. are read from `package.json` at install time; no secret rotation needed. Phase 4 doesn't change env-var semantics. | None |
| Build artifacts | The Phase 3 `<configDir>/oto/.install.json` install marker holds a sha256 manifest of files at last-install time. After Phase 4 fills `oto/commands/` and `oto/agents/`, the next `oto install --claude` re-walks the source dirs and regenerates `.install.json`. The Phase 3 install-state diff (install.cjs:84-90) handles file additions/removals correctly. | None (verified by reading `bin/lib/install.cjs:84-90`) |

## Common Pitfalls

### Pitfall 1: Engine output assumed clean — but dropped-agent rewrites are required

**What goes wrong:** Treat `node scripts/rebrand.cjs --apply` as "the port is done" and ship.
**Why it happens:** Engine renames `gsd-pattern-mapper` to `oto-pattern-mapper` mechanically; it has no inventory awareness of which agents survived the trim.
**How to avoid:** Mandatory post-rebrand verification (`tests/phase-04-no-dropped-agents.test.cjs`) that walks `oto/{commands,workflows}/` and asserts every `subagent_type=` value is in the retained-23 set OR in the generic allowlist.
**Warning signs:** Any `oto-pattern-mapper`, `oto-doc-classifier`, `oto-debug-session-manager`, `oto-ai-researcher`, `oto-eval-auditor`, `oto-eval-planner`, `oto-framework-selector`, `oto-intel-updater`, `oto-user-profiler` substring after rebrand.

### Pitfall 2: Inventory rows that are KEEP but Phase-deferred get verified by Phase 4

**What goes wrong:** Phase 4 verification harness scans `oto/skills/` (empty/sparse in Phase 4) and fails because Skill files don't exist yet.
**Why it happens:** D-02 explicitly bounds Phase 4 by the ROADMAP, not by the inventory.
**How to avoid:** Verification tests scope their walk to `oto/{commands,agents,workflows,contexts,templates,references}/` only.

### Pitfall 3: Hand-touching `oto/` undermines round-trip safety

**What goes wrong:** Manual edits to `oto/workflows/foo.md` make the next engine `--verify-roundtrip` fail or the next `--apply` clobber the patch.
**Why it happens:** Engine is the source of truth; patches live in `rename-map.json` or post-engine scripted edits.
**How to avoid:** Either codify patches as scripted post-engine edits in a Phase 4 patch script, or document them as deltas applied AFTER `--apply` and before commit. Track each fixup as a planner task with the explicit before/after snippet so re-running the engine + replaying the patch script is deterministic.
**Warning signs:** Engine round-trip mode starts failing in Phase 9 sync; investigate Phase 4 hand-edits.

### Pitfall 4: Sandbox-map drift from agent-audit

**What goes wrong:** The sandbox map in `runtime-codex.cjs` lists 22 entries; the 23rd retained agent silently defaults to `read-only` and breaks.
**Why it happens:** Easy off-by-one when transcribing from `decisions/agent-audit.md`.
**How to avoid:** `tests/phase-04-codex-sandbox-coverage.test.cjs` reads the retained set from `decisions/agent-audit.md` (parse the `KEEP` rows) and asserts `Object.keys(adapter.agentSandboxes)` matches exactly.

### Pitfall 5: Generic agent value `general-purpose` flagged as a violation

**What goes wrong:** `tests/phase-04-no-dropped-agents.test.cjs` over-fires on `subagent_type="general-purpose"` (which is a Claude/Codex platform built-in, not a dropped oto agent).
**Why it happens:** Conflating "agent name not in retained set" with "violation."
**How to avoid:** Bake the generic allowlist (`general-purpose`, `generalPurpose`, `general`, `X`, `general_purpose_task`) explicitly into the test and assert *every* generic occurrence is in this exact list. Match the rename-map's `do_not_rename` pattern.

### Pitfall 6: Dogfood inside the project repo clobbers `.planning/`

**What goes wrong:** Running `/oto-new-project` in this repo overwrites `.planning/STATE.md`, blows away the milestone record.
**Why it happens:** `oto-new-project` writes `.oto/STATE.md` (the rebranded path) — which would NOT clobber `.planning/`. But careless test invocations might still touch it.
**How to avoid:** D-06 — disposable temp dir. Use `mktemp -d` (or `fs.mkdtempSync(path.join(os.tmpdir(), 'oto-mr01-'))`) and `cd` into it for the entire MR-01 session. Document the temp path in `04-HUMAN-UAT.md` for traceability.

### Pitfall 7: Workflow→agent reference graph misses commands

**What goes wrong:** Phase 4 verifies workflows but not commands, missing the `commands/oto/debug.md` references to `oto-debug-session-manager`.
**Why it happens:** Most commands `@`-include their workflow file, so it's tempting to think Task() calls only live in workflows.
**How to avoid:** Verification tests scan BOTH `oto/commands/oto/*.md` and `oto/workflows/**/*.md` for `subagent_type=`. The grep at the top of this RESEARCH.md confirmed `commands/gsd/debug.md` has TWO `subagent_type="gsd-debug-session-manager"` invocations.

### Pitfall 8: Frontmatter `tools:` field empty causes false-fail

**What goes wrong:** `oto-nyquist-auditor` and `oto-security-auditor` have empty `tools:` lines upstream. A naive frontmatter validator that requires `tools` to be non-empty would reject them.
**Why it happens:** Empty `tools` is intentional — Claude treats it as "all tools allowed."
**How to avoid:** Validator checks `tools` is *present* (key exists) but allows empty value. Spec the validator behavior in the test comment.

## Code Examples

### Example 1: Run rebrand engine apply against upstream

```bash
# From repo root
node scripts/rebrand.cjs --apply \
  --target foundation-frameworks/get-shit-done-main \
  --out oto/ \
  --force \
  --owner OTOJulian
# Source: scripts/rebrand.cjs (Phase 2 shipped)
```

### Example 2: Frontmatter parser (zero-dep)

```js
// tests/phase-04-frontmatter-schema.test.cjs (sketch)
'use strict';
const fs = require('node:fs');

function parseFrontmatter(text) {
  // Source: hand-rolled per CLAUDE.md zero-dep constraint
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const body = text.slice(4, end);
  const out = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
```

### Example 3: Task-ref resolver test (sketch)

```js
const SUBAGENT_RE = /subagent_type\s*[:=]\s*["']([a-zA-Z0-9_-]+)["']/g;
const GENERIC_ALLOWLIST = new Set(['general-purpose', 'generalPurpose', 'general', 'X', 'general_purpose_task']);
const RETAINED = new Set(/* read decisions/agent-audit.md, KEEP rows */);

for (const file of walk('oto/workflows')) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(SUBAGENT_RE)) {
    const agent = m[1];
    if (GENERIC_ALLOWLIST.has(agent)) continue;
    assert.ok(RETAINED.has(agent), `${file}: subagent_type="${agent}" not in retained set`);
  }
}
```

### Example 4: Codex agent sandbox descriptor (drop-in for `runtime-codex.cjs`)

```js
// bin/lib/runtime-codex.cjs (added field; unchanged surrounding code)
module.exports = {
  name: 'codex',
  // ...existing fields...
  agentSandboxes: {
    'oto-advisor-researcher': 'read-only',
    'oto-assumptions-analyzer': 'read-only',
    'oto-code-fixer': 'workspace-write',
    'oto-code-reviewer': 'workspace-write',
    'oto-codebase-mapper': 'workspace-write',
    'oto-debugger': 'workspace-write',
    'oto-doc-verifier': 'workspace-write',
    'oto-doc-writer': 'workspace-write',
    'oto-domain-researcher': 'workspace-write',
    'oto-executor': 'workspace-write',
    'oto-integration-checker': 'read-only',
    'oto-nyquist-auditor': 'workspace-write',
    'oto-phase-researcher': 'workspace-write',
    'oto-plan-checker': 'read-only',
    'oto-planner': 'workspace-write',
    'oto-project-researcher': 'workspace-write',
    'oto-research-synthesizer': 'workspace-write',
    'oto-roadmapper': 'workspace-write',
    'oto-security-auditor': 'workspace-write',
    'oto-ui-auditor': 'workspace-write',
    'oto-ui-checker': 'read-only',
    'oto-ui-researcher': 'workspace-write',
    'oto-verifier': 'workspace-write',
  },
  // ...existing transformAgent identity stub, etc...
};
```

### Example 5: MR-01 dogfood transcript skeleton

```bash
# Disposable temp project
TMP=$(mktemp -d /tmp/oto-mr01-XXXXXX)
cd "$TMP"
git init -q
echo "# scratch project for oto MR-01" > README.md
git add README.md && git commit -q -m "init"

# Install oto from current source via tarball (no global pollution)
cd /Users/Julian/Desktop/oto-hybrid-framework
TARBALL=$(npm pack --json | head -50 | grep '"filename"' | head -1 | cut -d'"' -f4)
TARGET=/tmp/oto-bin-prefix-$$
mkdir -p "$TARGET"
npm install -g "$TARBALL" --prefix "$TARGET"
PATH="$TARGET/bin:$PATH"

# Install for Claude into a disposable config dir
CLAUDE_DIR="$TMP/.claude"
oto install --claude --config-dir "$CLAUDE_DIR"

# (User runs Claude Code with CLAUDE_CONFIG_DIR=$CLAUDE_DIR pointing at $TMP project)
# (User exercises core spine: /oto-new-project, /oto-plan-phase, /oto-execute-phase, /oto-verify-work, /oto-progress, /oto-pause-work, /oto-resume-work)
# (User captures transcript or summary in 04-HUMAN-UAT.md)

# Cleanup
oto uninstall --claude --config-dir "$CLAUDE_DIR"
rm -rf "$TMP" "$TARGET"
```

## State of the Art

| Old approach | Current approach | When changed | Impact for Phase 4 |
|--------------|-------------------|--------------|---------------------|
| Hand-edited rebrand of forked content | Rule-typed rebrand engine + inventory | Phase 2 shipped | Phase 4 is engine-driven; minimal hand-edits |
| 33 GSD agents | 23 retained agents | Phase 1 ADR-07 | Phase 4 must not resurrect any of the dropped 10 |
| Two competing `code-reviewer` identities | Single `oto-code-reviewer` | Phase 1 ADR-05 | Phase 4 verifies Superpowers' `code-reviewer.md` is absent |
| `.planning/` state root | `.oto/` state root | Phase 1 ADR-01 | Phase 4 verifies no `.planning/` leaks in shipped payload |
| `gsd-debug-session-manager` separate agent | Folded into `oto-debugger` | Phase 1 ADR-07 | Phase 4 rewrites `commands/oto/debug.md` Task calls |
| Inline runtime conditionals in installer | Per-runtime adapters | Phase 3 D-01 | Phase 4's sandbox map lives in `runtime-codex.cjs`, not `bin/install.js` |

**Deprecated/outdated:**
- Upstream's `gsd-from-gsd2.md` migration command — out of scope, dropped
- `gsd-ultraplan-phase` — flagged BETA upstream and out-of-scope per PROJECT.md
- 11 unwanted runtime branches in installer — already removed in Phase 3

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Inventory `commands/gsd/ultraplan-phase.md` should be DROP per REQUIREMENTS.md "Out of Scope" | Phase 4 inclusion set | Wasted port effort + a runtime command pointing at a deferred-BETA workflow |
| A2 | `oto-pattern-mapper` step in `plan-phase.md` is "Optional" and can be safely deleted/marked-deferred | Category A fixups | If actually load-bearing, plan-phase verification gaps |
| A3 | `oto-debugger` truly "absorbs debug-session-manager responsibilities" — i.e., rewriting `subagent_type="oto-debug-session-manager"` to `subagent_type="oto-debugger"` is a viable mechanical patch | Category A fixups | `oto-debugger` agent prompt may not handle session-management semantics; needs spot-check during execution |
| A4 | The 12 retained agents not present in upstream `CODEX_AGENT_SANDBOX` map need new entries; tool-set inference (Write/Edit ⇒ workspace-write) is sufficient | Agent sandbox map | If a research-role agent does writes through Bash (not Write tool), a `read-only` sandbox would block it. Spot-verify by reading each agent's prompt. |
| A5 | `subagent_type="general-purpose"` and the 4 other allowlisted generic strings appear ONLY in inert documentation/example contexts in shipped payload, never as live Task calls | Generic-agent allowlist | If a real workflow Task-call uses `general-purpose`, our verification test would silently approve a real call to a non-`oto-*` agent |
| A6 | `oto/workflows/profile-user.md` is inert because the corresponding command file is DROP — no caller exists in shipped payload | Category A fixups, item 7 | If `autonomous.md` or another retained workflow chains into `profile-user`, the chain breaks |
| A7 | The "28 listed `/oto-*` workflows" in success criterion 1 maps cleanly to the requirement IDs WF-01..WF-25 + WF-28..WF-30 (3 IDs), not literally 28 separate command names | Phase requirements table | If interpretation differs from the user's intent, the success criterion goalposts shift |
| A8 | The Phase 3 install-state file diff (`install.cjs:84-90`) correctly handles the case where Phase 4 introduces 200+ new files into `oto/commands/` and `oto/agents/` for the first time | Runtime state inventory | If diff is buggy, re-install corrupts; mitigated by the dogfood being a fresh disposable install |
| A9 | The user's interpretation of SC#5 ("grep `.planning/` returns zero hits excluding `foundation-frameworks/`") is best read as "in shipped payload only" per D-13 — the broader interpretation is impractical because this repo's `.planning/` planning artifacts are out of scope | `.planning/` leak enforcement | If the user wants a literal repo-wide check, the planner needs to add `decisions/`, `tests/`, and `scripts/` to the scan exclusion set explicitly. |
| A10 | Workspace-isolation D-12 means a command's `<execution_context>`/`@`-include must point to a file that was actually emitted by the engine; engine output is not pre-validated against this constraint | Verification harness | If a command @-includes a workflow file that was DROP per inventory, the dangling reference goes undetected without a Phase 4 test |

## Open Questions

1. **Inventory reconciliation for `ultraplan-phase.md`** (A1)
   - What we know: REQUIREMENTS.md "Out of Scope" lists `/gsd-ultraplan-phase (BETA) — Upstream BETA; defer until proven`; inventory says KEEP.
   - What's unclear: Is this a stale inventory row or is the user choosing to keep the file but not claim it works?
   - Recommendation: Default to keeping per inventory (D-04 — "prior decisions win" interpreted as "the inventory wins unless explicitly overridden"); planner asks user during plan review if `ultraplan-phase.md` should be marked deferred.

2. **`profile-user.md` workflow disposition** (A6)
   - What we know: Workflow KEEP, command DROP, both reference dropped `gsd-user-profiler`.
   - What's unclear: Is the workflow file invoked by anything else?
   - Recommendation: grep `oto/` for `@.+profile-user.md` references; if zero, delete the workflow file or mark it `<deferred>` block. Planner adds an explicit task.

3. **`ingest-docs.md` rewrite vs. defer**
   - What we know: References dropped `gsd-doc-classifier` and `gsd-doc-synthesizer`.
   - What's unclear: Whether `oto-doc-writer` can absorb the classification + synthesis pipeline, or whether the workflow should be marked deferred similar to `ai-integration-phase.md` (WF-28).
   - Recommendation: Mark ingest-docs deferred (bounded similar to AI-integration); the classifier/synthesizer pipeline is materially different from doc-writer's role and forcing the merge would cargo-cult the API.

4. **Phase 5/6 hooks-and-skills empty payload at Phase 4 close**
   - What we know: D-11 says workflow refs to Phase 5/6/8 capabilities stay deferred.
   - What's unclear: Whether the verification tests should check that `oto/skills/` and `oto/hooks/dist/` are empty/absent OR populated with engine output (which would be DROP-marked / placeholder content).
   - Recommendation: Verification tests scope their walk to commands/agents/workflows/contexts/templates/references only and treat skills+hooks as "Phase 5/6 verifies this; Phase 4 ignores."

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js >= 22 | All Phase 4 work | (verify) | (`node --version`) | none — hard requirement per CLAUDE.md |
| `npm` >= 10 | MR-01 dogfood `npm pack` + `npm install -g <tarball>` | (verify) | (`npm --version`) | none |
| `git` | dogfood project init | (verify) | — | manual file creation |
| Claude Code CLI | MR-01 dogfood (the *primary* target) | (verify) | — | none — MR-01 is gated on this; if absent, Phase 4 cannot ship |
| `mktemp` | dogfood disposable dir | macOS/Linux built-in | — | `fs.mkdtempSync` from Node (already used in Phase 3 tests) |
| Codex CLI | Out of scope for Phase 4 (Phase 8 owns parity) | (don't care) | — | n/a |
| Gemini CLI | Out of scope for Phase 4 (Phase 8 owns parity) | (don't care) | — | n/a |

**Missing dependencies with no fallback:**
- Claude Code CLI must be installed and runnable as the user's daily driver for MR-01. If the user can't run it during the dogfood window, Phase 4 cannot close.

**Missing dependencies with fallback:**
- `mktemp` → `fs.mkdtempSync` (already a precedent in Phase 3 integration tests; no operational difference).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22+ built-in) — already used by Phase 1/2/3 tests |
| Config file | none (Node-built-in needs no config) |
| Quick run command | `npm test` (resolves to `node --test --test-concurrency=4 tests/phase-04-*.test.cjs`) |
| Full suite command | `npm test` runs all phases; Phase 4 lives alongside Phase 1/2/3 |
| Phase gate | All Phase 4 tests green + MR-01 transcript present in `04-HUMAN-UAT.md` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|--------------|
| WF-01..WF-25 + WF-28..WF-30 | All 28 listed `/oto-*` commands resolve to a workflow file (D-12) | unit (file existence + @-include parse) | `node --test tests/phase-04-command-to-workflow.test.cjs` | ❌ Wave 0 |
| WF-01..WF-25 + WF-28..WF-30 | Engine produces all expected target paths under `oto/commands/oto/` | unit | `node --test tests/phase-04-rebrand-smoke.test.cjs` | ❌ Wave 0 |
| WF-01..WF-25 + WF-28..WF-30 | Daily-use stable end-to-end | manual UAT | (recorded in `04-HUMAN-UAT.md`) | ❌ Wave 0 |
| AGT-02 | Superpowers `code-reviewer` agent absent in `oto/agents/` | unit | `node --test tests/phase-04-superpowers-code-reviewer-removed.test.cjs` | ❌ Wave 0 |
| AGT-03 (frontmatter) | Every retained agent file has `name:` + `description:` + `tools:` keys; `name:` value matches `oto-<file-stem>` | unit | `node --test tests/phase-04-frontmatter-schema.test.cjs` | ❌ Wave 0 |
| AGT-03 (Task refs) | Every `subagent_type=` in `oto/{commands,workflows}/**/*.md` resolves to a file in `oto/agents/oto-*.md` (or generic allowlist) | unit | `node --test tests/phase-04-task-refs-resolve.test.cjs` | ❌ Wave 0 |
| AGT-03 (no dropped) | No `oto-{pattern-mapper,doc-classifier,doc-synthesizer,debug-session-manager,ai-researcher,eval-auditor,eval-planner,framework-selector,intel-updater,user-profiler}` substring in shipped payload | unit | `node --test tests/phase-04-no-dropped-agents.test.cjs` | ❌ Wave 0 |
| AGT-03 (generic allowlist) | All `subagent_type="general-purpose"`-class refs are in the explicit allowlist | unit | `node --test tests/phase-04-generic-agent-allowlist.test.cjs` | ❌ Wave 0 |
| AGT-04 | `runtime-codex.cjs` exports `agentSandboxes` covering all 23 retained agents (set equality with `decisions/agent-audit.md` KEEPs) | unit | `node --test tests/phase-04-codex-sandbox-coverage.test.cjs` | ❌ Wave 0 |
| MR-01 (auto) | `oto install --claude --config-dir <tmp>` succeeds against a built tarball; install-marker present | integration | `node --test tests/phase-04-mr01-install-smoke.test.cjs` | ❌ Wave 0 (extends Phase 3 install-claude integration test pattern) |
| MR-01 (manual) | One disposable Claude Code session executes core spine end-to-end | manual UAT | recorded in `04-HUMAN-UAT.md` per D-08 | ❌ Wave 0 |
| ARCH-01 leak | Zero path-like `.planning/` references in shipped payload | unit | `node --test tests/phase-04-planning-leak.test.cjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-04-*.test.cjs` (~10s, all unit + small integration)
- **Per wave merge:** `npm test` (full Phase 1+2+3+4 suite)
- **Phase gate:** Full suite green + manual UAT recorded.

### Wave 0 gaps (test files to create)

- [ ] `tests/phase-04-rebrand-smoke.test.cjs` — invoke engine apply against a copy of `foundation-frameworks/get-shit-done-main`, assert expected target files appear under a temp `oto/`
- [ ] `tests/phase-04-frontmatter-schema.test.cjs` — covers AGT-03 (frontmatter)
- [ ] `tests/phase-04-task-refs-resolve.test.cjs` — covers AGT-03 (Task refs)
- [ ] `tests/phase-04-no-dropped-agents.test.cjs` — covers D-09
- [ ] `tests/phase-04-generic-agent-allowlist.test.cjs` — covers D-10
- [ ] `tests/phase-04-codex-sandbox-coverage.test.cjs` — covers AGT-04
- [ ] `tests/phase-04-superpowers-code-reviewer-removed.test.cjs` — covers AGT-02
- [ ] `tests/phase-04-planning-leak.test.cjs` — covers D-13
- [ ] `tests/phase-04-command-to-workflow.test.cjs` — covers D-12
- [ ] `tests/phase-04-mr01-install-smoke.test.cjs` — covers MR-01 (automated portion)
- [ ] Framework install: none — `node:test` is built-in
- [ ] Shared fixtures: `tests/fixtures/phase-04/retained-agents.json` (extracted from `decisions/agent-audit.md` KEEP rows; can be inlined as a JS const)

## Recommended plan slicing

The plan can run as four waves. D-04's "prior decisions win, generated output is patched" rule drives the order: engine first, patches second, verification third, dogfood fourth.

### Wave 0 — Test scaffolds (sequential, optional but matches Phase 3 precedent)

- 04-01-PLAN: Create test scaffolds for all 10 verification tests with `t.todo()` placeholders. Prevents downstream waves from forgetting tests. ~1 plan, ~10 test files.

### Wave 1 — Bulk port (single plan, the primary lift)

- 04-02-PLAN: Run `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --out oto/ --force`. Commit the resulting `oto/` tree. Spot-verify counts (78 commands, 23 agents, 88+ workflows, 3 contexts, 43 templates, 51 references). ~1 plan.

### Wave 2 — Curated fixups (parallelizable per file)

- 04-03-PLAN: Drop-agent rewrites — `oto/workflows/plan-phase.md` (`oto-pattern-mapper` removal/deferral), `oto/commands/oto/debug.md` (debug-session-manager → debugger).
- 04-04-PLAN: AI-integration rewrite per D-17/D-18/D-20 — `oto/commands/oto/ai-integration-phase.md` + `oto/workflows/ai-integration-phase.md`.
- 04-05-PLAN: Other dropped-agent rewrites — `oto/workflows/eval-review.md`, `oto/workflows/ingest-docs.md`, `oto/workflows/profile-user.md` (delete or defer).
- 04-06-PLAN: Codex sandbox map population — extend `bin/lib/runtime-codex.cjs` with `agentSandboxes` field (23 entries).

(04-03 through 04-06 can run in parallel — they touch disjoint files. Each plan corresponds to a single fixup category and ships a small commit.)

### Wave 3 — Verification (parallelizable, depends on Wave 2)

- 04-07-PLAN: Implement the 9 unit/integration verification tests (one plan per test, or one plan for the suite — planner's discretion). Tests should fail before Wave 2 and pass after.
- 04-08-PLAN: Implement `tests/phase-04-mr01-install-smoke.test.cjs` (extends Phase 3 install-claude integration pattern).

### Wave 4 — Dogfood + closeout

- 04-09-PLAN: MR-01 disposable dogfood. Operator runs the core spine in a tmp project, captures transcript summary, populates `04-HUMAN-UAT.md` and `04-VERIFICATION.md`. Single plan, blocking on operator availability.

### Dependencies

- Wave 1 → Wave 2 → Wave 3 → Wave 4 (strict serial across waves).
- Within Wave 2: 04-03/04/05/06 are parallel.
- Within Wave 3: each test plan is independent.
- Wave 0 is optional — can be folded into Wave 3.

### Risk / time estimate (informational)

- Wave 1: 5–10 min (engine runs in seconds; commit is large)
- Wave 2: 30–60 min (curated edits in 6 files)
- Wave 3: 60–90 min (test authoring; reuse Phase 3 patterns)
- Wave 4: 30–60 min operator time + transcript summary (variable; user-driven)

Total: ~half a day of focused work + the dogfood window.

## Sources

### Primary (HIGH confidence)
- `decisions/file-inventory.md` — concrete inclusion/exclusion lists
- `decisions/file-inventory.json` — machine-readable verdicts (1128 entries, KEEP=361, DROP=760, MERGE=7)
- `decisions/agent-audit.md` — retained 23 agents + dropped 10 + per-agent rationale
- `decisions/skill-vs-command.md` — workflow-vs-skill routing rule (Phase 6 input but informs Phase 4 boundary)
- `decisions/ADR-{01,05,07,10}*.md` — locked decisions Phase 4 must honor
- `rename-map.json` — engine input contract
- `scripts/rebrand/lib/engine.cjs` (387 lines) — engine internals; verified output-path conventions, allowlist masking, coverage assertions
- `scripts/rebrand.cjs` — CLI entry; verified flag handling
- `bin/lib/runtime-codex.cjs` — current Codex adapter (no `agentSandboxes` yet)
- `bin/lib/runtime-claude.cjs` — Claude adapter (descriptor + lifecycle hooks)
- `bin/lib/install.cjs` — Phase 3 orchestrator; verified state-diff handles new files
- `foundation-frameworks/get-shit-done-main/bin/install.js:26-38` — upstream `CODEX_AGENT_SANDBOX` map (11 entries)
- `foundation-frameworks/get-shit-done-main/agents/gsd-*.md` — 33 agent files; per-agent `tools:` field harvested above
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/*.md` (88 files) — workflow content; grep harvested 22 distinct subagent names
- `foundation-frameworks/get-shit-done-main/commands/gsd/{ai-integration-phase,debug,help}.md` — confirmed dropped-agent invocations
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — Phase 1 D-01..D-23 locked
- `.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md` — Phase 2 D-01..D-18 locked
- `.planning/phases/03-installer-fork-claude-adapter/03-CONTEXT.md` — Phase 3 D-01..D-24 locked
- `.planning/phases/04-core-workflows-agents-port/04-CONTEXT.md` — Phase 4 D-01..D-20 locked
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- `CLAUDE.md` — tech stack constraints
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- Inferred sandbox modes for the 12 retained agents not in upstream `CODEX_AGENT_SANDBOX` (derived from agent role + tools field; recommend spot-verify during execution)
- Generic-agent allowlist contents (sourced from `rename-map.json:55`; assumes no live-runtime references — verify with the test)

### Tertiary (LOW confidence)
- A1 (`ultraplan-phase.md` should be DROP) — driven by REQUIREMENTS.md text contradicting inventory. Needs user sign-off.
- A3 (`oto-debugger` semantics fully replace `oto-debug-session-manager`) — believed from agent-audit copy but worth a spot-read of both prompts during execution.
- A6 (`profile-user.md` workflow is fully inert) — needs grep across `oto/` after Wave 1 to confirm no inbound references.

## Metadata

**Confidence breakdown:**
- Phase 4 inclusion/exclusion lists: HIGH — directly read from `decisions/file-inventory.md`
- Workflow→agent reference graph: HIGH — grep across upstream verified concrete dropped-agent occurrences
- Agent sandbox map: HIGH for upstream-listed 11; MEDIUM for inferred 12 (planner should spot-verify)
- Expected fixup categories: HIGH — every file mentioned was directly inspected
- AI-integration scaffolding rewrite: HIGH — read upstream workflow + command line-by-line
- `.planning/` leak regex: HIGH — pattern verified against representative inputs
- Validation Architecture: HIGH — directly maps every requirement ID to a concrete test
- Recommended plan slicing: MEDIUM — parallelization assumptions depend on planner's wave model

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days; foundation source is pinned at GSD v1.38.5/Superpowers v5.0.7 in `foundation-frameworks/`, so no upstream-drift risk during this window)

## RESEARCH COMPLETE

**Phase:** 4 — Core Workflows & Agents Port
**Confidence:** HIGH

### Key Findings

- The rebrand engine, inventory, agent-audit, rename-map, and Phase 3 installer plumbing are all already shipped — Phase 4 is **content port + curated patches + verification**, not new infrastructure.
- Concrete dropped-agent invocations (D-09 blockers): `gsd-pattern-mapper` in `plan-phase.md:685`; `gsd-debug-session-manager` (×2) in `commands/gsd/debug.md`; full AI/eval orchestration in `ai-integration-phase.md`; `gsd-eval-auditor` in `eval-review.md`; `gsd-doc-classifier`+`gsd-doc-synthesizer` in `ingest-docs.md`; `gsd-user-profiler` in `profile-user.md`.
- `runtime-codex.cjs` needs an `agentSandboxes` descriptor field with 23 entries (11 from upstream map, 12 inferred from per-agent tool sets).
- 9 focused `node:test` files cover all Phase 4 verification surfaces; one extends Phase 3's install-smoke pattern for the automated half of MR-01.
- MR-01's manual half runs in a disposable temp project via `mktemp -d` + `npm pack` + `npm install -g <tarball> --prefix <tmp>`; transcript captured in `04-HUMAN-UAT.md`, technical evidence in `04-VERIFICATION.md`.
- Plan slicing: 4 waves, 9 plans, ~half a day plus the operator's dogfood window.

### File Created
`/Users/Julian/Desktop/oto-hybrid-framework/.planning/phases/04-core-workflows-agents-port/04-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All assets pre-shipped; Node 22+ built-ins for new tests |
| Architecture | HIGH | D-01..D-20 locked; engine + installer contracts verified by reading source |
| Pitfalls | HIGH | Each pitfall traces to a concrete file/line discovered during research |
| Agent sandbox map | MEDIUM (12/23) | Upstream covers 11 directly; remaining 12 inferred from tool sets and audit roles |

### Open Questions

1. `commands/gsd/ultraplan-phase.md` — keep per inventory or drop per REQUIREMENTS.md "Out of Scope"?
2. `oto/workflows/profile-user.md` — delete or mark deferred? (No command references it after rebrand.)
3. SC#5's literal interpretation of "grep `.planning/` returns zero hits" — narrowed to shipped payload per D-13 in this research; confirm with user if otherwise.

### Ready for Planning

Research complete. Planner can now produce PLAN.md files for Wave 0–4. The `## Validation Architecture` section feeds directly into the VALIDATION.md template.
