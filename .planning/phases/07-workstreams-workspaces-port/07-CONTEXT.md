# Phase 7: Workstreams & Workspaces Port - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify and harden the workstream + workspace surfaces that Phase 4's bulk rebrand already shipped into `oto/`, hand-fix any leakage the engine missed, wire the Phase-6-deferred `oto:using-git-worktrees` ↔ `/oto-new-workspace` workflow deferral per ADR-03, add a focused `node:test` surface (smoke + behavior), and run a lightweight UAT dogfood — so the user can run `/oto-workstreams list|create|switch|status|complete`, `/oto-list-workspaces`, `/oto-new-workspace`, `/oto-remove-workspace` end-to-end on Claude Code with the `${OTO_WS}` routing flag chaining correctly into downstream workflows.

Bounded by ROADMAP Phase 7 and REQUIREMENTS WF-26, WF-27. Scope anchor: the 8 files Phase 4 produced from upstream's workstream/workspace subtree, plus one skill body edit. No new features; no re-port from upstream.

In-scope file surface (verified to already exist in `oto/`):
- `oto/bin/lib/workstream.cjs` (495 lines; CRUD logic; wired into `oto-tools.cjs` line 188 + dispatch at line 1043)
- `oto/workflows/{new-workspace,list-workspaces,remove-workspace}.md` (3 workflow bodies)
- `oto/commands/oto/{workstreams,new-workspace,list-workspaces,remove-workspace}.md` (4 slash-command frontmatters)
- `oto/references/workstream-flag.md` (the `--ws` flag spec; env-var resolution; session-pointer lifecycle)
- `oto/skills/using-git-worktrees/SKILL.md` (target of the Phase-6-deferred deferral directive)

Out of scope (locked by adjacent-phase boundaries and personal-use cost ceiling):
- Codex/Gemini runtime parity for workstream/workspace surfaces — Phase 8 (`runtime-codex.cjs` / `runtime-gemini.cjs` mapping; session-key env-var matrix)
- Live `${OTO_WS}` propagation regression test in CI — Phase 10 (CI-07/CI-08 territory)
- Workstream-complete archive coverage — Phase 10 CI
- New workstream/workspace capabilities (e.g., per-workstream config overrides, workstream cloning, workspace-of-workspaces) — defer; not in REQUIREMENTS
- Re-port from upstream — Phase 4's bulk-rebrand output is the source of truth; only hand-fixups against it
- Plugin-marketplace style workspace distribution — PROJECT.md out-of-scope
- `${OTO_WS}` retrofitting into every existing oto workflow that lacks it — out of Phase 7 scope; downstream workflows that already include the token are unchanged, gaps logged but deferred

</domain>

<decisions>
## Implementation Decisions

### Phase Scope (D-01..D-02)
- **D-01:** Phase 7 is **verify + wire + test** against the existing Phase 4 output, not a re-port. Mirrors Phase 5/6 shape: engine output is the source of truth, Phase 7 layers on hand-fixups + skill wiring + tests + UAT. No invocation of `scripts/rebrand.cjs apply` against upstream's workstream subtree in this phase — Phase 4 already did that.
- **D-02:** All 4 file groups are in verification scope: `oto/bin/lib/workstream.cjs`, the 3 workspace workflows, the 4 slash commands, and `oto/references/workstream-flag.md`. Verification = grep for `gsd-`, `GSD_`, `Get Shit Done`, `superpowers`, `Superpowers`, `.planning/` literals; confirm `oto-sdk query` invocations resolve to existing `oto-tools.cjs` handlers; confirm command frontmatter passes Phase 4's `phase-04-frontmatter-schema.test.cjs`. Hand-fix any failures; do not rewrite working code.

### Skill ↔ Workflow Deferral (D-03..D-04)
- **D-03:** Wire the Phase-6-deferred deferral as **an inline directive in `oto/skills/using-git-worktrees/SKILL.md`**, mirroring Phase 6 D-03's pattern for `oto:using-oto`. Add a "Workflow Deference" section near the top of the skill body that says (planner picks final wording): "For creating an isolated workspace with `.oto/` state isolation, prefer `/oto-new-workspace` over executing `git worktree add` directly. The skill's standalone form remains valid for ad-hoc worktree work outside an oto workspace context."
- **D-04:** Routing target is **always `/oto-new-workspace` for workspace creation**; standalone worktree commands are still permitted by the skill. This preserves the skill's standalone-form usefulness (debugging a single worktree, reviewing a PR via worktree, etc.) while honoring ADR-03 workflow-wins routing for the workspace creation path. No coupling to `.oto/STATE.md` presence — the directive applies universally; ambient STATE.md gate from `oto:using-oto` (Phase 6 D-03/D-04) handles the active-workflow case.

### Test Surface (D-05..D-08)
Phase 7 ships **focused** `node:test` files only — full CI matrix is Phase 10 (continues the Phase 5/6 D-17/D-18 pattern). Smoke + behavior depth, ~7-9 tests, files named `tests/07-*.test.cjs` per the post-Phase-3 convention.

- **D-05: Structure / smoke test (`07-structure.test.cjs`).** Assert: 4 commands exist at `oto/commands/oto/`, 3 workflows at `oto/workflows/`, lib at `oto/bin/lib/workstream.cjs`, reference at `oto/references/workstream-flag.md`; frontmatter parses on each markdown file; no `.planning/` or `gsd-`/`GSD_`/`Get Shit Done` literals in any of the 8 files (Phase 4 leak rule reused). Catches regressions from the Phase 4 bulk-port.
- **D-06: Workstream CRUD behavior test (`07-workstream-crud.test.cjs`).** In a temp `.oto/` fixture with seeded flat-mode files (ROADMAP.md, STATE.md, REQUIREMENTS.md, phases/ stub), drive `oto-tools.cjs workstream` subcommands directly:
  - `workstream create demo` → assert `.oto/workstreams/demo/` exists with the 4 expected files migrated, flat-mode files removed (flat→workstream migration path).
  - `workstream create alt` (second one) → assert no second migration runs, `alt/` is empty/initial state, both demos coexist (workstream isolation foundation).
  - Two-workstream divergence — write distinct STATE.md content into each, `workstream set demo` then read STATE.md → assert demo's content; `workstream set alt` → assert alt's content (workstream isolation).
  - `workstream list`, `workstream get`, `workstream status <name>` return the expected JSON shapes documented in `commands/oto/workstreams.md`.
- **D-07: Session-pointer resolution test (`07-session-pointer.test.cjs`).** Verify the resolution order documented in `oto/references/workstream-flag.md`: `--ws` flag wins over `OTO_WORKSTREAM` env, env wins over session-keyed pointer, session pointer wins over `.oto/active-workstream` legacy file. Drive via `oto-tools.cjs --ws X workstream get` etc. with controlled env. Catches the multi-Claude-instance safety regression class.
- **D-08: Workspace init-handler smoke (`07-workspace-init.test.cjs`).** Drive `oto-tools.cjs init {new-workspace,list-workspaces,remove-workspace}` and assert each returns the JSON keys the corresponding workflow consumes (e.g., `init.new-workspace` returns `default_workspace_base`, `child_repos`, `worktree_available`, `is_git_repo`, `cwd_repo_name`, `project_root` — the exact set the workflow's "Parse JSON for" line lists). Pure handler smoke; no real worktree creation.

Workstream-complete archive coverage and full `${OTO_WS}` propagation regression are intentionally deferred to Phase 10 CI.

### UAT Dogfood (D-09..D-10)
- **D-09: Lightweight UAT dogfood, captured in `07-UAT.md`.** User runs (in a disposable Claude Code session, not the Phase 4 P08 disposable-fork sense — just an ephemeral session in this repo or a sibling test repo):
  1. `/oto-workstreams create demo` → expect new `.oto/workstreams/demo/`
  2. `/oto-workstreams switch demo` → expect active pointer set
  3. `/oto-workstreams list` → expect demo listed with status
  4. `/oto-workstreams complete demo` → expect archive
  5. `/oto-new-workspace --name uat-demo --repos . --strategy worktree` → expect `WORKSPACE.md` + `.oto/` initialized at target
  6. `/oto-list-workspaces` → expect uat-demo listed
  7. `/oto-remove-workspace --name uat-demo` → expect cleanup
  8. **`${OTO_WS}` chaining check (D-10):** After step 2 (`workstream switch demo`), run `/oto-progress` (or any single oto workflow that reads STATE.md). Confirm output reflects the workstream-scoped STATE.md, not the flat-mode one. Catches the silent-fallback bug class where workflows ignore the active workstream.
- **D-10:** UAT success gate is **operator confirmation** (matches Phase 4 P08 pattern), not an automated assertion. Output captured in `.planning/phases/07-workstreams-workspaces-port/07-UAT.md` as a checklist of the 8 steps with pass/fail per step. Failure on any step blocks Phase 7 completion; investigation routes to a hand-fixup plan rather than a rebuild.

### Claude's Discretion
- Exact filenames for the 4 test files (`07-structure.test.cjs`, `07-workstream-crud.test.cjs`, `07-session-pointer.test.cjs`, `07-workspace-init.test.cjs` — names are the recommendation; planner can adjust)
- Exact wording of the D-03 deferral directive sentence in `oto/skills/using-git-worktrees/SKILL.md` — planner picks final phrasing; insertion point is at the top of the skill body, ahead of any procedural content (mirrors Phase 6 D-03 placement of the Workflow Deference section)
- Whether the D-06 CRUD test seeds a real `.planning/`-style fixture or a minimal one — minimal is fine; the goal is to exercise migration logic, not validate every roadmap field
- Whether D-07 covers all 5 levels of the resolution order or only the most likely regressions (top 3: `--ws` flag, env var, session pointer) — planner picks; cost is small either way
- Treatment of `oto:using-git-worktrees` payload files (e.g., any `references/`, examples) — engine should already have rebranded; planner verifies via dry-run report before locking, and hand-fixes only what the engine missed
- Workspace `--strategy` default — keep upstream's `worktree` default unchanged (not discussed; default holds)
- Multi-runtime session-key env var matrix in `workstream-flag.md` — ship as-is from upstream; Codex/Gemini wiring is Phase 8's concern, not Phase 7's
- `workstream create` auto-migration vs. prompt-first — keep upstream's auto-migration behavior; D-06 verifies it's non-destructive
- Whether to hand-fix `oto-tools.cjs` itself if grep finds residual `gsd` literals in its workstream-related code paths — yes, in scope; the lib lives at `oto/bin/lib/oto-tools.cjs` and was already part of Phase 4 verification

### Folded Todos
None — `oto-tools todo match-phase 7` not run in this session; no pending todos in `.planning/todos/pending/` per STATE.md "None yet" line.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project, requirements, and prior phase scope
- `.planning/PROJECT.md` — Personal-use cost ceiling, runtime targets (Claude/Codex/Gemini), workflow-wins routing rule, key decisions for `/oto-*` namespace.
- `.planning/REQUIREMENTS.md` — WF-26 (`/oto-workstreams`) and WF-27 (`/oto-list-workspaces`, `/oto-new-workspace`, `/oto-remove-workspace`) are the active requirements for this phase.
- `.planning/STATE.md` — Phase 6 complete (6/10 phases, 60% milestone progress); Phase 7 ready to plan.
- `.planning/ROADMAP.md` §"Phase 7: Workstreams & Workspaces Port" — Phase goal and 3 success criteria.

### Locked prior decisions
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — Inventory verdicts for the 8 in-scope files (all `verdict: keep`, `phase_owner: 4`, `category: command/workflow/lib/reference`).
- `.planning/phases/04-core-workflows-agents-port/04-CONTEXT.md` — Bulk-rebrand pattern that produced the 8 files; the `phase-04-planning-leak.test.cjs` and `phase-04-frontmatter-schema.test.cjs` rules Phase 7 reuses.
- `.planning/phases/05-hooks-port-consolidation/05-CONTEXT.md` — `node:test` per-phase pattern; smoke + fixture pattern reused by Phase 7's CRUD test.
- `.planning/phases/06-skills-port-cross-system-integration/06-CONTEXT.md` — D-03/D-04 STATE.md gating + inline-directive-in-SKILL.md pattern that D-03/D-04 of this phase mirror; Phase 7 dependency on `oto:using-git-worktrees` ↔ `/oto-new-workspace` deferral was explicitly deferred from Phase 6 to here.

### Architecture decisions and audits
- `decisions/ADR-03-skill-vs-command.md` §Decision, §Consequences — Workflow-wins routing rule that justifies D-03/D-04. Original source for the deferral contract.
- `decisions/ADR-06-skill-namespace.md` — `oto:<skill-name>` namespace; `oto:using-git-worktrees` is the target skill body for D-03's edit.
- `decisions/skill-vs-command.md` — Operational reference for ADR-03; v1-active 5-row table includes the workspace ↔ worktree pair the deferral implements.
- `decisions/file-inventory.json` — Authoritative `verdict: keep`, `phase_owner: 4` rows for the 8 in-scope files. Search for `workstream` and `workspace` paths.

### Operational reference (workstream/workspace contract)
- `oto/references/workstream-flag.md` — **MANDATORY READ.** Defines the `--ws` flag resolution priority (1: flag → 2: `OTO_WORKSTREAM` env → 3: session-scoped pointer → 4: `.oto/active-workstream` legacy → 5: flat mode null), the multi-runtime session-key probe order (`OTO_SESSION_KEY`, `CODEX_THREAD_ID`, `CLAUDE_SESSION_ID`, `CLAUDE_CODE_SSE_PORT`, `OPENCODE_SESSION_ID`, `GEMINI_SESSION_ID`, `CURSOR_SESSION_ID`, `WINDSURF_SESSION_ID`, `TERM_SESSION_ID`, `WT_SESSION`, `TMUX_PANE`, `ZELLIJ_SESSION_NAME`), the `.oto/workstreams/{name}/` directory layout, and the `${OTO_WS}` routing-flag propagation contract. D-07's session-pointer test asserts this resolution order; D-10's chaining check verifies `${OTO_WS}` propagates.

### Pitfall coverage (this phase blocks)
- `.planning/research/PITFALLS.md` — Phase 4 leak rule (no `.planning/` references) and Phase 4/5 frontmatter-schema rule continue to apply; D-05 enforces both.
- Multi-Claude-instance silent-pointer-overwrite class (documented in `workstream-flag.md` "Why session-scoped pointers exist") — D-07 catches this.

### Existing oto code touched / verified by Phase 7
- `oto/bin/lib/workstream.cjs` lines 1-495 — CRUD logic, migration, session-pointer resolution. D-02 verifies; hand-fix only on grep failures.
- `oto/workflows/new-workspace.md`, `oto/workflows/list-workspaces.md`, `oto/workflows/remove-workspace.md` — Each invokes `oto-sdk query init.{new,list,remove}-workspace`; init handlers confirmed present in `oto-tools.cjs` line 911-921 dispatch.
- `oto/commands/oto/workstreams.md`, `oto/commands/oto/new-workspace.md`, `oto/commands/oto/list-workspaces.md`, `oto/commands/oto/remove-workspace.md` — Slash-command bodies; reference `oto-sdk query workstream.<x>` and the `${OTO_WS}` routing flag.
- `oto/skills/using-git-worktrees/SKILL.md` — D-03 edit target; Phase 6 D-01/D-02 already rebranded the skill body; Phase 7 adds the Workflow Deference section.
- `oto/bin/lib/oto-tools.cjs` lines 188 (require), 269 (workstream env override comment), 287-291 (validation), 325 (help line listing `workstream`), 911-921 (init dispatch for new/list/remove-workspace), 1043-1066 (workstream subcommand dispatch) — All wiring already in place; D-02 verifies no `gsd` substrings linger.
- `bin/lib/install.cjs` lines 19-28 — `SRC_KEYS` already covers `commands`, `workflows`, `references`; no installer change needed for Phase 7.
- `bin/lib/runtime-claude.cjs` lines 174-186 — Source/target maps already include `references: 'oto/references'`; no adapter change needed.
- `tests/phase-04-frontmatter-schema.test.cjs`, `tests/phase-04-planning-leak.test.cjs` — Existing tests Phase 7's D-05 leverages by extension, not duplication.

### Upstream sources (read-only diff reference; do not rebrand by hand)
- `foundation-frameworks/get-shit-done-main/get-shit-done/bin/lib/workstream.cjs` — Pre-rebrand counterpart of `oto/bin/lib/workstream.cjs`. 495 lines. Reference for diff-comparison if a behavior bug is suspected.
- `foundation-frameworks/get-shit-done-main/get-shit-done/workflows/{new-workspace,list-workspaces,remove-workspace}.md` — Pre-rebrand workflow bodies.
- `foundation-frameworks/get-shit-done-main/commands/gsd/{workstreams,new-workspace,list-workspaces,remove-workspace}.md` — Pre-rebrand command frontmatters.
- `foundation-frameworks/get-shit-done-main/get-shit-done/references/workstream-flag.md` — Pre-rebrand reference doc.
- `foundation-frameworks/get-shit-done-main/sdk/src/{workstream-utils,query/workstream,query/workspace}.ts` — Dropped (verdict: drop, phase 1) — the SDK paths are NOT being ported; oto's `oto-sdk` is a thin shim over `oto-tools.cjs`. Do not resurrect.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`oto-tools.cjs workstream` dispatch (line 1043)** — All 7 subcommands (`create`, `list`, `status`, `complete`, `set`, `get`, `progress`) already wired. D-06 drives this directly via `node oto/bin/lib/oto-tools.cjs workstream <subcommand>` — no new dispatch code needed.
- **`oto-tools.cjs init` workspace handlers (line 911-921)** — `init new-workspace`, `init list-workspaces`, `init remove-workspace` all return clean JSON. D-08 smoke-tests these directly.
- **`bin/oto-sdk.js` thin shim** — Translates `oto-sdk query workstream.list` to `oto-tools.cjs workstream list` (handler.split('.') logic). The 4 ported workflow/command files invoke `oto-sdk query`; the shim makes that resolve.
- **Phase 4 test patterns** — `tests/phase-04-planning-leak.test.cjs` and `tests/phase-04-frontmatter-schema.test.cjs` already enforce two of D-05's checks across the entire `oto/` tree. D-05's test only adds the Phase 7-specific structure assertions.
- **Phase 6 fixture pattern** (`tests/skills/__fixtures__/`) — Mirror for D-06's `.oto/` temp fixture and D-07's session-pointer fixture.

### Established Patterns
- Engine + targeted hand-fix pattern (Phases 4 D-01..D-04, 5 D-04..D-09, 6 D-01..D-02) — D-02 of this phase reuses the literal-string-scan side without re-running the engine.
- Inline-prose `Skill('oto:<name>')` invocations and Workflow Deference sections in skill bodies (Phase 6 D-03/D-05) — D-03 of this phase mirrors the section style.
- Phase-scoped `node:test` files in `tests/`, full CI in Phase 10 (Phases 5 D-17/D-18, 6 D-07..D-09) — D-05..D-08 follow.
- Operator-driven UAT capture in a phase-local `*-UAT.md` (Phase 4 P08) — D-09 reuses the format with smaller scope.
- ADR-03 routing rule: workflow wins via STATE.md gating; skills fire freely outside an active workflow. Phase 7 implements the workspace-creation slice of this rule (D-03/D-04).

### Integration Points
- **Installer entry**: `bin/install.js` → `bin/lib/install.cjs` (existing `SRC_KEYS` already covers `commands`, `workflows`, `references`) → `runtime-claude.cjs` copy → `<configDir>/{commands,workflows,references}/`. No new installer wiring; D-05 verifies the existing wiring covers the 8 files.
- **Lib entry**: `oto/bin/lib/oto-tools.cjs` is the single dispatcher; `bin/oto-sdk.js` is the user-facing CLI shim. Workflows reach the lib via `oto-sdk query <handler>`.
- **Skill entry**: Claude Code's native `Skill` tool reads `<configDir>/skills/using-git-worktrees/SKILL.md` on suspicion. D-03's directive lives in the body. Subject to Phase 6 D-03 STATE.md gating (when an active workflow is running).
- **Workflow entry — `${OTO_WS}` chaining**: After `workstream switch <name>`, every `oto-tools.cjs` call resolves to the workstream-scoped state files via `planningPaths` / `planningRoot` in `core.cjs`. D-10's chaining check verifies a downstream workflow honors this.
- **Phase 8 dependency**: Multi-runtime session-key env-var matrix (Codex `CODEX_THREAD_ID`, Gemini `GEMINI_SESSION_ID`, etc.) listed in `workstream-flag.md` becomes load-bearing once Codex/Gemini smoke tests run. Phase 7 ships the matrix as documented; Phase 8 adds the runtime-side tests.
- **Phase 10 dependency**: D-09's UAT is precursor to a CI-08 live regression test against a real Claude session; D-07's session-pointer test feeds CI-09 state-leak detection coverage.

</code_context>

<specifics>
## Specific Ideas

- The `oto/skills/using-git-worktrees/SKILL.md` Workflow Deference section should be a single, grep-able paragraph high in the skill body. Suggested form (planner picks final wording): "## Workflow Deference\n\nFor creating an isolated workspace with `.oto/` state isolation, prefer `/oto-new-workspace` over invoking `git worktree add` directly. The skill's standalone form remains valid for ad-hoc worktree work outside an oto workspace context (single-PR review, scratch worktree for debugging, etc.)." Match the imperative, sectioned tone of `oto:using-oto`'s "Workflow Deference" section.

- The D-06 CRUD fixture should seed a minimal flat-mode `.oto/`:
  ```
  .oto/
    PROJECT.md       (one-line stub)
    config.json      ({"version": 1})
    ROADMAP.md       (one-line stub)
    STATE.md         (frontmatter with status: ready_to_plan + body)
    REQUIREMENTS.md  (one-line stub)
    phases/
      01-stub/
        01-CONTEXT.md (one-line stub)
  ```
  After `workstream create demo`:
  ```
  .oto/
    PROJECT.md, config.json, phases/  (unchanged — shared)
    workstreams/
      demo/
        ROADMAP.md, STATE.md, REQUIREMENTS.md  (migrated)
  ```
  Then assert `phases/` migration per `workstream.cjs::migrateToWorkstreams` (line 24-65). Note: `migrateToWorkstreams` moves `phases/` into the workstream too (line 40); the fixture above shows the post-migration shape minus the `phases/` move. Planner verifies against actual migration logic and adjusts the fixture if needed.

- The D-07 session-pointer test should drive `oto-tools.cjs` with controlled `OTO_SESSION_KEY` env values (e.g., `mock-session-A`, `mock-session-B`) and assert that two "sessions" can hold different active workstreams without overwriting each other. Mirrors the multi-Claude-instance scenario `workstream-flag.md` calls out as the original motivation.

- The D-09 UAT should be runnable in this repo (no disposable repo needed) — workstreams/workspaces operate on `.oto/` state, and oto's own `.planning/` is unaffected. Rollback for the UAT: `rm -rf .oto/workstreams/demo` after the dogfood completes (or `workstream complete demo` archives it cleanly).

- The D-10 chaining check should pick a single small downstream workflow that reads STATE.md — `/oto-progress` is the obvious choice. After `workstream switch demo`, running `/oto-progress` should report from the demo workstream's state (likely "no roadmap yet" since the migrated demo's ROADMAP.md is a stub), confirming the routing flag threaded.

- For grep-style verification (D-02 / D-05), the regex set is: `\bgsd-`, `\bGSD_`, `Get Shit Done`, `\bsuperpowers\b`, `\bSuperpowers\b`, `\.planning/` — same set Phase 4 uses, applied to the 8 in-scope files only (Phase 4's tree-wide rule still runs for everything else). Allowlist for `foundation-frameworks/` already in place.

- The Codex `agentSandboxes` map in `bin/lib/runtime-codex.cjs` does NOT need workstream/workspace entries — these are user-invoked workflows + a CLI lib, not subagents. Same is true for any `CODEX_AGENT_SANDBOX` extensions. No Phase 4 D-06-style addition needed in Phase 7.

</specifics>

<deferred>
## Deferred Ideas

- **Workspace `--strategy` clone-by-default override** — Discussed as a possible deviation from upstream; not selected. Keeping `worktree` default. Revisit only if the worktree approach surfaces a real-use bug class.
- **Multi-runtime session-key env-var probe in `workstream-flag.md`** — The reference doc already enumerates Codex/Gemini/OpenCode/Cursor/Windsurf session-key vars from upstream. Phase 7 ships the doc as-is; Codex/Gemini-side wiring is Phase 8's concern.
- **`workstream create` prompt-first migration policy** — Upstream auto-migrates on first `create`. Discussed as a possible UX change; not selected. Keeping auto-migration; D-06 verifies it's non-destructive.
- **Workstream-complete archive coverage** — Mentioned in test discussion; deferred to Phase 10 CI rather than Phase 7 behavior tests.
- **Live `${OTO_WS}` propagation regression test in CI** — Phase 10 (CI-07/CI-08 territory). Phase 7 ships the operator-driven D-10 check as the precursor.
- **Per-workstream config overrides** (e.g., per-workstream `model_profile`, `auto_advance`) — Not in REQUIREMENTS; defer to v2.
- **Workstream cloning** (`workstream clone <src> <dst>`) — Not in REQUIREMENTS; defer.
- **Workspace-of-workspaces** (nested workspaces) — Not in REQUIREMENTS; defer; would require state-shape rework.
- **Retrofitting `${OTO_WS}` into oto workflows that lack it** — Phase 7 doesn't audit every workflow file; downstream workflows that already include the token are unchanged. Gap audit deferred to a Phase 10 CI check or a future Phase X.
- **Plugin-marketplace style workspace distribution** — Out of scope per PROJECT.md (personal-use cost ceiling).
- **`/oto-workspace-switch` separate command** — Currently subcommand of `/oto-workstreams`. Splitting would be a UX-only change, not a v1 concern.
- **Skill ↔ workflow deferrals beyond `using-git-worktrees`** — e.g., adding deferral directives to other Superpowers skills that overlap with oto workflows. SKL-08 contract from Phase 6 covers exactly the four canonical agent invocations; widening would require eval evidence.

### Reviewed Todos (not folded)
None — `oto-tools todo match-phase 7` not run; pending todos are empty per STATE.md.

</deferred>

---

*Phase: 07-workstreams-workspaces-port*
*Context gathered: 2026-05-01*
