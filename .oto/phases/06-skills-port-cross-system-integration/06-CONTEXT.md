# Phase 6: Skills Port & Cross-System Integration - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Port the curated 7-skill subset from upstream Superpowers under `oto/skills/<name>/` in the `oto:` namespace, ship `oto:using-oto` as the bootstrap skill that defers to in-progress workflows via `.oto/STATE.md` gating, and wire the three retained spine agents (`oto-executor`, `oto-verifier`, `oto-debugger`) to invoke specific skills at canonical points in their prompts.

Bounded by ROADMAP Phase 6 and REQUIREMENTS SKL-01..08. The retained skill set is locked in `decisions/file-inventory.json` and `decisions/skill-vs-command.md`:

- **`oto:test-driven-development`** (SKL-01) — TDD enforcement
- **`oto:systematic-debugging`** (SKL-02) — root-cause-tracing methodology with payload (CREATION-LOG, condition-based-waiting docs/example, find-polluter.sh, root-cause-tracing, test-academic, test-pressure-1..3, defense-in-depth)
- **`oto:verification-before-completion`** (SKL-03) — per-claim verification
- **`oto:dispatching-parallel-agents`** (SKL-04) — parallel agent dispatch
- **`oto:using-git-worktrees`** (SKL-05) — worktree workflow patterns
- **`oto:writing-skills`** (SKL-06) — meta-skill with payload (anthropic-best-practices, persuasion-principles, CLAUDE_MD_TESTING example, graphviz-conventions.dot, render-graphs.js, testing-skills-with-subagents)
- **`oto:using-oto`** (SKL-07, renamed from `using-superpowers` per ADR-06) — bootstrap skill loaded inline at SessionStart with cross-runtime tool refs (references/{codex,copilot,gemini}-tools.md)
- **Cross-system wiring** (SKL-08) — `oto-executor` → TDD before / verification after; `oto-verifier` → verification at start; `oto-debugger` → systematic-debugging at start

Out of scope (locked by inventory drop verdicts and adjacent-phase boundaries):

- Seven dropped Superpowers skills (brainstorming, writing-plans, executing-plans, subagent-driven-development, requesting-code-review, receiving-code-review, finishing-a-development-branch) — workflow-wins per ADR-03; do not resurrect
- Codex/Gemini skill discovery parity — Phase 8 (`runtime-codex.cjs` / `runtime-gemini.cjs` skill mapping; v0.1.0 happy path is Claude per MR-01)
- Live skill-auto-trigger conversational regression test — Phase 10 (CI-08)
- License-attribution CI check coverage of skill files — Phase 10 (CI-06)
- Workspace/workstream wiring of `oto:using-git-worktrees` beyond standalone form — Phase 7 (`/oto-new-workspace` workflow integration)
- Plugin-marketplace distribution of skills — PROJECT.md out-of-scope

</domain>

<decisions>
## Implementation Decisions

### Skill Rebrand Strategy (D-01..D-02)
- **D-01:** Run `scripts/rebrand.cjs apply` against the upstream skill subtree at `foundation-frameworks/superpowers-main/skills/` for the 7 retained skill directories (per `decisions/file-inventory.json` `phase_owner: 6` rows). Engine emits to `oto/skills/<name>/`. The existing rule set (`identifier`, `path`, `command`, `URL`, `env_var`, `skill_ns`) covers the bulk of the rewrite — `superpowers:<x>` → `oto:<x>`, `Superpowers` → `oto`, the `using-superpowers` → `using-oto` directory rename, plus path/identifier cascades. After engine apply, hand-fix `oto/skills/using-oto/SKILL.md` only — mirrors Phase 5 D-05 (engine + literal-string scan for SessionStart). Other six skills ship as engine output (verified by inspection during implementation, not rewritten).
- **D-02:** Voice adaptation in `using-oto/SKILL.md` is **minimal**:
  - Replace upstream identity literals: `<EXTREMELY-IMPORTANT>You have superpowers.` → the rebranded sentence already locked in Phase 5 D-05 (`<EXTREMELY_IMPORTANT>You are using oto. ...`); `using-superpowers` skill name → `oto:using-oto`; `Superpowers skills` → `oto skills`.
  - Strip upstream contributor-framing paragraphs that don't apply to a personal-use fork: the "94% PR rejection rate" framing, the fabricated-content warning, and any "your job is to protect your human partner from PR rejection" content.
  - **Preserve verbatim** (do NOT rewrite without eval evidence): the Red Flags rationalization table, the 1% rule, the Instruction Priority hierarchy, the "human partner" phrasing where it shapes behavior, the Skill Priority ordering (process skills before implementation skills), the Red Flags / "I can check git/files quickly" table.
  - Diff-review using-oto end-to-end before lock — highest-visibility skill (loaded inline on every SessionStart).

### `oto:using-oto` Workflow Gating (D-03..D-04)
- **D-03:** `oto:using-oto/SKILL.md` instructs the model to **read `.oto/STATE.md`** before deciding whether to auto-fire other skills. Implementation is prose inside the skill body — a directive sentence that says: "Before suggesting or invoking any other oto skill on suspicion, read `.oto/STATE.md`. If the `status:` frontmatter field shows an active phase (e.g., `execute_phase`, `plan_phase`, `debug`, `verify`), suppress ambient skill auto-fire — only canonical agent invocations and explicit user `Skill()` calls fire." Prose fallback: if `.oto/STATE.md` is missing, malformed, or shows `status: complete`, treat as no active workflow and let skills fire normally.
- **D-04:** Suppression scope when STATE.md shows active workflow = **ambient auto-fire only**. The following continue to fire unaffected:
  - **Canonical agent invocations (SKL-08):** `oto-executor` invoking `oto:test-driven-development`, etc. — explicit `Skill()` calls inside agent prompts.
  - **Explicit user requests:** if the user types `/skill oto:systematic-debugging` or otherwise explicitly asks for a skill, it fires.
  - **Workflow-internal skill calls:** if a `/oto-*` workflow itself invokes a skill (none currently do, but the door stays open).
  Only the "1% suspicion" ambient pressure is suppressed. This matches ADR-03's "workflow wins" rule precisely without breaking SKL-08.

### Agent Canonical Invocation Pattern (D-05..D-06)
- **D-05:** Skill invocations are added as **inline prose instructions inside agent prompt bodies**, not via frontmatter (e.g., no `required_skills:` field) and not via hooks. Edits to `oto/agents/oto-executor.md`, `oto/agents/oto-verifier.md`, and `oto/agents/oto-debugger.md` insert explicit `Skill('oto:<name>')` invocation directives at the right point in each agent's existing flow. Mirrors how Superpowers shapes agent behavior; grep-able; works on Claude Code's native `Skill` tool surface today; no new mechanism required.
- **D-06:** Four canonical invocation points wired in this phase (matches `decisions/skill-vs-command.md` v1-active subset and REQUIREMENTS SKL-08 verbatim):
  1. **`oto-executor`** — Invokes `oto:test-driven-development` **before writing implementation code**. Insert at the agent's existing pre-write checkpoint (today the file has generic "Follow skill rules relevant to the task you are about to commit" prose at line 58 — replace with the explicit invocation).
  2. **`oto-executor`** — Invokes `oto:verification-before-completion` **after writing implementation code, before declaring the task done**. Insert at the agent's verification gate.
  3. **`oto-verifier`** — Invokes `oto:verification-before-completion` **at the start of its verification pass**. Insert at the agent's existing "Apply skill rules when scanning for anti-patterns" line (line 54 today).
  4. **`oto-debugger`** — Invokes `oto:systematic-debugging` **when starting a debug session**. Insert at the agent's existing "Follow skill rules relevant to the bug being investigated" line (line 41 today).
  No other agents wired in Phase 6; expanding the surface (e.g., to `oto-planner` or `oto-code-reviewer`) is deferred — would require eval evidence and changes the SKL-08 contract.

### Phase 6 Test Surface (D-07..D-09)
Phase 6 ships **focused** `node:test` files only — full CI matrix is Phase 10 (D-17/D-18 pattern from Phase 5 carries forward).

- **D-07: Skill structure + name collision test.** Assert that all 7 skill directories exist at `oto/skills/<name>/` and each contains a `SKILL.md` whose frontmatter parses (at minimum: `name:` and `description:` fields). Assert that for every skill directory, `oto:<directory-name>` does NOT collide with any `/oto-<name>` command file in `oto/commands/`. Catches the most likely regressions from a bulk port (broken frontmatter, accidental name collision, missing payload directories).
- **D-08: Installer skill copy smoke.** Given a fixture install run, assert `runtime-claude.cjs` copies `oto/skills/*` (recursively, including each skill's payload — e.g., `systematic-debugging/find-polluter.sh`) into `<configDir>/skills/*` with byte-identical content (sha256 match), preserves the executable bit on shell scripts, and records the skill set in the install marker JSON. Reuses the install-state pattern Phase 5 added for hooks.
- **D-09: STATE.md gating logic test.** Static-analyze `oto/skills/using-oto/SKILL.md` body to assert it contains the unambiguous deferral directive locked in D-03 — a single grep-able sentence that mentions both `.oto/STATE.md` and the suppression rule. The test is a static fixture check, not a live conversational evaluation. Phase 10 (CI-08) promotes this to a live skill-auto-trigger regression test against a real model session.

Live skill-auto-trigger conversational test → Phase 10 (CI-08).

### Claude's Discretion
- Exact filenames for test files (`06-NN-*.test.cjs` per phase convention)
- Exact regex / matcher pattern for the gating sentence in D-09 — planner picks the assertion form (substring-includes vs. structured-marker vs. line-anchor)
- Whether to consolidate D-07 (structure + collision) into one test file or split into two
- Specific edit points within agent prompt bodies for D-06 inline invocations — current line numbers (oto-executor.md L58, oto-verifier.md L54, oto-debugger.md L41) are starting hints; planner adjusts to the most natural insertion point in each agent's flow
- Whether the cross-runtime tool refs in `oto/skills/using-oto/references/` (codex-tools.md, copilot-tools.md, gemini-tools.md) are kept as static reference files in Phase 6 (recommended: keep all three; KEEP-marked in inventory; cheap; useful when the user manually opens them) or trimmed to Claude-only and re-added in Phase 8
- Treatment of payload binaries / non-markdown in skills (e.g., `systematic-debugging/find-polluter.sh`, `systematic-debugging/condition-based-waiting-example.ts`, `writing-skills/render-graphs.js`, `writing-skills/graphviz-conventions.dot`) — engine should not touch identifiers in source code unless they match a rebrand rule (`gsd`/`superpowers` identifiers); planner verifies via the engine's per-rule classification report on dry-run before apply
- Whether to ship a `tests/skills/__fixtures__/STATE-active.md` alongside the test for D-09 (probably yes; mirrors Phase 5's hook fixture pattern)

### Folded Todos
None — todo cross-reference not run in this session (no pending todos surface for Phase 6 scope based on prior-phase context).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project, requirements, and prior phase scope
- `.planning/PROJECT.md` — Personal-use cost ceiling, runtime targets (Claude/Codex/Gemini), out-of-scope (plugin marketplaces, OpenCode); core value is workflow-spine plus skill-subset coexistence behind one `/oto-*` surface.
- `.planning/REQUIREMENTS.md` — SKL-01..08 active in this phase; Phase 7 dependency on `oto:using-git-worktrees` for the `/oto-new-workspace` standalone form.
- `.planning/STATE.md` — Phase 5 complete (5/10 phases, 50% milestone progress); Phase 6 ready to plan.
- `.planning/ROADMAP.md` §"Phase 6: Skills Port & Cross-System Integration" — Phase goal and 5 success criteria.

### Locked prior decisions
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — D-07 (`oto:` skill namespace), D-09 (skill-vs-command routing), agent trim verdicts that retained `oto-executor`, `oto-verifier`, `oto-debugger` as edit targets.
- `.planning/phases/04-core-workflows-agents-port/04-CONTEXT.md` — Retained agents are baseline for D-05/D-06 edits; rebrand engine bulk-port pattern applies to skills here too.
- `.planning/phases/05-hooks-port-consolidation/05-CONTEXT.md` — D-04..D-09 (SessionStart hook injects `oto:using-oto` body inline); D-06 (defensive fallback while Phase 6 ships); literal-string-scan pattern from D-05 reused here for `using-oto/SKILL.md`.

### Architecture decisions and audits
- `decisions/ADR-03-skill-vs-command.md` §Decision, §Consequences — Workflow-wins routing; using-oto deferral when `.oto/STATE.md` shows active phase. Source of D-03/D-04.
- `decisions/ADR-04-sessionstart.md` §Consequences — Single SessionStart entrypoint reads `oto/skills/using-oto/SKILL.md` (Phase 5 ships defensive fallback; Phase 6 satisfies the dependency).
- `decisions/ADR-06-skill-namespace.md` — `oto:<skill-name>` namespace; `rename-map.json` `skill_ns` rule already wired (`superpowers:` → `oto:`).
- `decisions/ADR-07-agent-trim.md` — Confirms `oto-executor`, `oto-verifier`, `oto-debugger` are in the keep set (phase-spine category) and therefore valid D-05 edit targets.
- `decisions/skill-vs-command.md` — Operational reference for ADR-03/06; v1-active 5-row subset is the wiring contract for D-06; full overlap table justifies the 7 retained / 7 dropped split.
- `decisions/file-inventory.json` — Authoritative keep/drop verdicts and `target_path` mappings for every skill file in upstream Superpowers; `phase_owner: 6` rows are the engine apply input. Search for `"skills/"` paths.
- `decisions/file-inventory.md` — Human index of the same.
- `rename-map.json` — Identifier, path, command, env-var, URL, and `skill_ns` rules already validated; Phase 6 runs the existing `apply` against the upstream skill subtree without engine changes.

### Pitfall coverage (this phase blocks)
- `.planning/research/PITFALLS.md` §"Pitfall 15: Hook injection of literal strings exposes upstream identity" — Same risk vector for `using-oto/SKILL.md` (loaded inline via SessionStart). Addressed by D-01 hand-fix and D-02 minimal-voice rule.

### Upstream sources (read for inventory diff and engine apply input — do not rebrand by hand)
- `foundation-frameworks/superpowers-main/skills/test-driven-development/` — SKL-01. Files: `SKILL.md`, `testing-anti-patterns.md`.
- `foundation-frameworks/superpowers-main/skills/systematic-debugging/` — SKL-02. Files: `SKILL.md`, `CREATION-LOG.md`, `condition-based-waiting-example.ts`, `condition-based-waiting.md`, `defense-in-depth.md`, `find-polluter.sh`, `root-cause-tracing.md`, `test-academic.md`, `test-pressure-1.md`, `test-pressure-2.md`, `test-pressure-3.md`.
- `foundation-frameworks/superpowers-main/skills/verification-before-completion/SKILL.md` — SKL-03.
- `foundation-frameworks/superpowers-main/skills/dispatching-parallel-agents/SKILL.md` — SKL-04.
- `foundation-frameworks/superpowers-main/skills/using-git-worktrees/SKILL.md` — SKL-05.
- `foundation-frameworks/superpowers-main/skills/writing-skills/` — SKL-06. Files: `SKILL.md`, `anthropic-best-practices.md`, `examples/CLAUDE_MD_TESTING.md`, `graphviz-conventions.dot`, `persuasion-principles.md`, `render-graphs.js`, `testing-skills-with-subagents.md`.
- `foundation-frameworks/superpowers-main/skills/using-superpowers/` — SKL-07 (renamed to `using-oto/`). Files: `SKILL.md`, `references/codex-tools.md`, `references/copilot-tools.md`, `references/gemini-tools.md`.

### Existing oto code touched by Phase 6
- `oto/skills/` — Does **not** exist yet; Phase 6 creates it via engine apply (D-01).
- `oto/agents/oto-executor.md` line 58 — Generic "Follow skill rules relevant to the task you are about to commit" prose; D-05/D-06 #1 and #2 replace with explicit `Skill('oto:test-driven-development')` and `Skill('oto:verification-before-completion')` invocations at the right canonical points in the agent flow.
- `oto/agents/oto-verifier.md` line 54 — Generic "Apply skill rules when scanning for anti-patterns and verifying quality" prose; D-05/D-06 #3 replaces with explicit `Skill('oto:verification-before-completion')` invocation at start of verification pass.
- `oto/agents/oto-debugger.md` line 41 — Generic "Follow skill rules relevant to the bug being investigated and the fix being applied" prose; D-05/D-06 #4 replaces with explicit `Skill('oto:systematic-debugging')` invocation at start of debug session.
- `bin/lib/install.cjs` line 22 (`'skills'` in installable categories) and line 32 (`transformSkill` handler) — Already wired; no installer change expected. D-08 verifies behavior.
- `bin/lib/runtime-claude.cjs` line 171 (`skills: 'oto/skills'` source dir) and line 181 (target subdir under config dir) — Already mapped; no adapter change expected. D-08 verifies behavior.
- `scripts/rebrand.cjs apply` — Already validated for the rule set; just point at the upstream skills subtree per `phase_owner: 6` inventory rows.
- `oto/hooks/oto-session-start` — Already references `oto/skills/using-oto/SKILL.md` per Phase 5 D-04..D-06; Phase 6 creates that file (defensive fallback in the hook stops triggering once SKL-07 ships).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/rebrand.cjs apply`** — Already validated end-to-end against `foundation-frameworks/` in Phase 2; just needs to be pointed at the 7 retained skill directories. Round-trip assertion (Phase 2 SC-4) catches regressions.
- **`bin/lib/install.cjs::transformSkill` (line 32)** — Already wired; copies skills with frontmatter rewrite. No new code path needed.
- **`bin/lib/copy-files.cjs::copyTree`** — Skills are markdown plus small text payload (no `{{OTO_VERSION}}` token substitution needed — that's a hooks-only concern from Phase 5 D-03).
- **`runtime-claude.cjs` (lines 171, 181)** — Already maps `oto/skills` → `<configDir>/skills`. No runtime adapter change.
- **`decisions/file-inventory.json` `phase_owner: 6` rows** — Pre-classified engine input; just filter and feed.
- **`oto/hooks/oto-session-start`** — Already reads `oto/skills/using-oto/SKILL.md`; Phase 6 simply backfills that file. No hook rewrite.
- **Phase 5 fixture pattern (`oto/hooks/__fixtures__/session-start-claude.json`)** — Model for any STATE.md fixture this phase ships under `tests/skills/__fixtures__/`.

### Established Patterns
- Engine + targeted hand-fix for upstream-identity literals (Phase 5 D-04..D-09 for SessionStart) — D-01/D-02 here apply the same pattern to `using-oto/SKILL.md`.
- Phase-scoped `node:test` files in `tests/`, full CI hardening in Phase 10 (Phase 5 D-17/D-18).
- Markdown-with-frontmatter for agents/commands/skills; non-markdown payload (`.sh`, `.ts`, `.dot`, `.js`) carried verbatim unless rebrand rules match.
- Top-level Node 22+ CommonJS, `node:test`, no top-level TypeScript, no top-level build (CLAUDE.md TL;DR / STACK.md).
- ADR-03 routing rule: when workflow and skill overlap, workflow wins via STATE.md gating; skills fire freely outside an active workflow. This phase implements the gating mechanism (D-03/D-04) that makes the rule operational.

### Integration Points
- **Installer entry**: `bin/install.js` → `bin/lib/install.cjs` (existing `'skills'` category) → `runtime-claude.cjs` copy → `<configDir>/skills/*`. Skill marker recorded in install-state JSON (D-08 verifies).
- **Runtime entry — ambient**: Claude Code's native `Skill` tool reads `<configDir>/skills/<name>/SKILL.md` on suspicion. Subject to D-03 STATE.md deferral (only relevant when an active workflow is running).
- **Runtime entry — bootstrap**: Phase 5 SessionStart hook (`oto-session-start`) injects `oto:using-oto`'s SKILL.md body inline at every session start. Phase 6 satisfies the file-existence dependency.
- **Runtime entry — canonical**: `oto-executor`, `oto-verifier`, `oto-debugger` invoke their assigned skills via the inline `Skill('oto:<name>')` directives added by D-05/D-06.
- **Phase 7 dependency**: `/oto-new-workspace` workflow integrates with `oto:using-git-worktrees` (workflow wins when invoked; skill is the standalone form when no workspace command is active per `decisions/skill-vs-command.md`).
- **Phase 8 dependency**: Codex/Gemini skill discovery surfaces consume `oto/skills/` as their source directory; per-runtime mapping lands in `runtime-codex.cjs` and `runtime-gemini.cjs` (currently no-op or stub for skills, mirroring Phase 5's hook deferral pattern).
- **Phase 10 dependency**: D-09's static-analysis fixture check is promoted to live skill-auto-trigger conversational test (CI-08). Skill-coverage manifest CI check (CI-04) consumes the same skill list this phase ships.

</code_context>

<specifics>
## Specific Ideas

- The `oto:using-oto` SKILL.md should be assembled in this order:
  1. Engine apply on `foundation-frameworks/superpowers-main/skills/using-superpowers/SKILL.md` → engine output.
  2. Targeted hand-fix on the engine output:
     - Replace the `<EXTREMELY-IMPORTANT>You have superpowers.` block with the rebranded identity sentence already locked in Phase 5 D-05 (so SessionStart fixture and skill body stay consistent — they're the same string at runtime).
     - Strip upstream contributor-framing paragraphs (94% PR rejection rate, fabricated content warning, "your job is to protect your human partner from PR rejection"). Personal-use fork has no equivalent failure mode.
     - Adjust the `using-superpowers` skill self-reference to `oto:using-oto`.
     - Insert the D-03 STATE.md deferral directive as a new section (e.g., "## Workflow Deference") near the top of the body, ahead of the Red Flags table.
  3. End-to-end diff-review the resulting file before locking — this is the highest-visibility skill in the framework.

- The D-09 STATE.md gating sentence should be a single, grep-able sentence in `using-oto/SKILL.md`. Suggested form (planner picks final wording): "Before invoking any other oto skill on suspicion, read `.oto/STATE.md`. If the `status:` frontmatter field shows an active phase (`execute_phase`, `plan_phase`, `debug`, or `verify`), suppress ambient skill auto-fire — only canonical agent invocations and explicit user `Skill()` calls fire."

- For agent prompt edits (D-05/D-06), the exact insertion form should be a directive, not a suggestion. Example for `oto-executor.md`:
  ```
  Before writing implementation code, invoke Skill('oto:test-driven-development') and follow the discipline it specifies. After completing implementation and before declaring the task done, invoke Skill('oto:verification-before-completion') and apply its checklist.
  ```
  Match the imperative tone of existing agent prompts; do not soften to "consider invoking".

- Cross-runtime tool refs in `oto/skills/using-oto/references/` (codex-tools.md, copilot-tools.md, gemini-tools.md) are KEEP-marked in inventory and contain only tool-name mappings (no `superpowers` literals). Engine apply handles them correctly; ship all three in Phase 6. Phase 8 owns the runtime-side wiring that actually consumes them on Codex / Gemini.

- For `systematic-debugging`'s payload, the engine should rebrand markdown bodies (`SKILL.md`, `condition-based-waiting.md`, `defense-in-depth.md`, `root-cause-tracing.md`, `test-academic.md`, `test-pressure-{1,2,3}.md`, `CREATION-LOG.md`) and leave the `.ts` / `.sh` examples untouched unless they contain `gsd`/`superpowers` identifiers. Run dry-run first; the engine's per-rule classification report flags any unexpected matches in the payload.

- For `writing-skills`' payload, the same logic applies: markdown rebranded, `.dot` and `.js` rendering tools left as-is unless rebrand rules match. The `examples/CLAUDE_MD_TESTING.md` is documentation about Claude Code testing, not Superpowers identity — engine pass should be clean.

- D-08's installer-copy smoke should explicitly verify executable bit preservation on `oto/skills/systematic-debugging/find-polluter.sh` (mirrors the `mode-644` regression Phase 2 install-smoke catches for hooks).

</specifics>

<deferred>
## Deferred Ideas

- **Reviving any of the 7 dropped Superpowers skills** (brainstorming, writing-plans, executing-plans, subagent-driven-development, requesting-code-review, receiving-code-review, finishing-a-development-branch) — each is small to revive in a future phase (verdict flip in `decisions/file-inventory.json` + engine re-run + ADR-03 routing entry); brainstorming specifically has a scripts payload (server.cjs, frame-template.html, helper.js, start-server.sh, stop-server.sh) that's medium-effort because oto would pick up a process-management surface.
- **`receiving-code-review` skill** — Marked v2 candidate in `decisions/skill-vs-command.md`; revisit when a v1 invocation point exists.
- **Codex/Gemini skill discovery parity** — Phase 8 (`runtime-codex.cjs`, `runtime-gemini.cjs` skill mapping; v0.1.0 happy path is Claude per MR-01 / D-12).
- **Live skill-auto-trigger conversational regression test** — Phase 10 (CI-08); Phase 6 ships D-09 static-analysis fixture as the precursor.
- **Skill-coverage CI manifest** — Phase 10 (CI-04 territory); Phase 6 provides the skill list this manifest will consume.
- **License-attribution CI check coverage of skill files** — Phase 10 (CI-06).
- **Workspaces/workstreams integration of `oto:using-git-worktrees`** — Phase 7 (`/oto-new-workspace` workflow is the entry point that the skill defers to under ADR-03).
- **Plugin-marketplace style skill distribution** — Out of scope per PROJECT.md (personal-use cost ceiling).
- **`/oto-write-skill` workflow command** — Not in roadmap; `oto:writing-skills` ships as the meta-skill but no slash-command wrapper. Revisit if a personal-use need emerges.
- **Skill signing / hash-based integrity** — Defer until a real threat justifies the maintenance (same line as Phase 5's deferral for hooks).
- **Expanding agent canonical invocations beyond the SKL-08-named three** (e.g., `oto-planner` invoking `oto:writing-skills`, `oto-code-reviewer` invoking `oto:verification-before-completion`) — would require eval evidence to justify behavioral churn; SKL-08 contract covers exactly the four points wired in D-06.

### Reviewed Todos (not folded)
None — todo cross-reference not run in this session.

</deferred>

---

*Phase: 06-skills-port-cross-system-integration*
*Context gathered: 2026-05-01*
