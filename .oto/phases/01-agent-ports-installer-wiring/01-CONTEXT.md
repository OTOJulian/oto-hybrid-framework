# Phase 1: Agent ports + installer wiring — Context

**Gathered:** 2026-05-18
**Status:** Ready for planning
**Milestone:** v0.3.0 — Restore doc-intake and eval-review agents

<domain>
## Phase Boundary

Port three upstream GSD agents that ADR-07 dropped — `gsd-doc-classifier`, `gsd-doc-synthesizer`, `gsd-eval-auditor` → `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor` — through the existing rebrand pipeline (the same one that ported the 23 retained agents in v0.1.0 Phase 4) and extend the installer plumbing so every supported runtime (Claude Code, Codex, Gemini CLI) ships them. Codex sandbox declarations are decided per agent here.

In scope:
- Flip the three agents in `decisions/file-inventory.json` from `verdict: drop` to `verdict: keep` (+ `target_path`, `rebrand_required: true`, `phase_owner: 1`).
- Update `decisions/agent-audit.md` per-row verdicts and the KEEP/DROP counts (23 → 26 keep; 10 → 7 drop).
- Re-run the rebrand engine; ship `oto/agents/oto-doc-classifier.md`, `oto/agents/oto-doc-synthesizer.md`, `oto/agents/oto-eval-auditor.md`.
- Port `oto/references/doc-conflict-engine.md` (required reading for the synthesizer agent).
- Extend `CODEX_AGENT_SANDBOX` in `oto/bin/install.js` with one entry per new agent.
- Verify install copies to Claude / Codex / Gemini agents directories.

Out of scope (other phases own these):
- Workflow rebrand-ports + command de-deferral → Phase 2 (`/oto-ingest-docs`, `/oto-eval-review` workflows; `/oto-help` listing changes).
- `tests/ingest-docs.test.cjs`, `tests/eval-review.test.cjs`, `install-smoke.yml` extension, parity smoke, ADR-15 → Phase 3.
- Restoring any of the other 7 ADR-07-dropped agents → deferred (AGNT-DEFER-01).
- Migrating `.planning/` → `.oto/` for this repo → deferred (DOG-01).

</domain>

<decisions>
## Implementation Decisions

### Port mechanism

- **D-01:** Use the existing rebrand engine end-to-end. Update `decisions/file-inventory.json` to flip the three agents from `verdict: drop` to `verdict: keep` (set `target_path`, `rebrand_required: true`, `phase_owner: 1`, `reason: "v0.3.0 Phase 1 agent port — partial ADR-07 reversal"`), then run the rebrand engine (`scripts/rebrand/`) to produce the three target files in `oto/agents/`. No hand-porting; the rebrand engine remains the single source of truth for upstream→oto token swaps and the coverage manifest's "no orphan paths" guarantee (Phase 1 success criterion 5).
- **D-02:** Source files are `foundation-frameworks/get-shit-done-main/agents/gsd-doc-classifier.md` (168 LOC), `gsd-doc-synthesizer.md` (204 LOC), `gsd-eval-auditor.md` (191 LOC). Targets are `oto/agents/oto-doc-classifier.md`, `oto-doc-synthesizer.md`, `oto-eval-auditor.md`. Frontmatter color values are preserved verbatim (yellow / orange / `"#EF4444"`).
- **D-03:** Also port `foundation-frameworks/get-shit-done-main/get-shit-done/references/doc-conflict-engine.md` → `oto/references/doc-conflict-engine.md` in this phase. Synthesizer's `<required_reading>` cites it; without it the agent hard-fails at dispatch and breaks AGNT-02 success criterion 4 (canonical output shape). Reference port is implementation glue for the agent ports, not new capability.

### Codex sandbox assignments (INST-02)

- **D-04:** Honor INST-02 literally and reconcile with Codex sandbox semantics by adjusting tool lists:
  - `oto-doc-classifier`: sandbox `read-only`. Tools list ported as `Read, Grep, Glob` (drop upstream `Write`). The Phase 2 workflow writes classification JSON to `.oto/intel/classifications/` from the agent's returned content. Matches the existing read-only-agent convention (`oto-plan-checker`, `oto-integration-checker` both omit Write from their tools).
  - `oto-eval-auditor`: sandbox `read-only`. Tools list ported as `Read, Bash, Grep, Glob` (drop upstream `Write`). The Phase 2 `/oto-eval-review` workflow writes `EVAL-REVIEW.md` from the agent's returned content.
  - `oto-doc-synthesizer`: sandbox `workspace-write`. Tools list ported verbatim (`Read, Write, Grep, Glob, Bash`). The agent itself writes `.oto/INGEST-CONFLICTS.md` and synthesized intel; this is the only one of the three that must write directly during its own run.
- **D-05:** Codex sandbox map lives in `oto/bin/install.js` at the existing `CODEX_AGENT_SANDBOX` const (line 26). Add three entries; keep alphabetic-ish grouping consistent with current map order.

### Inventory + audit-doc updates

- **D-06:** Phase 1 owns the in-place edits to `decisions/file-inventory.json` and `decisions/agent-audit.md`. Flip the three agent rows from DROP to KEEP, update the per-category counts (DROP-AI/eval drops by 1 from 4 to 3; DROP-redundant-doc drops by 2 from 2 to 0; KEEP totals rise from 23 to 26). Update the verdict-count table header (`KEEP: 26`, `DROP: 7`).
- **D-07:** ADR-15 (the formal record of the partial ADR-07 reversal) is **not** written in this phase — it lives in Phase 3 per the roadmap (ADR-01 requirement). Phase 1's inventory/audit edits reference "v0.3.0 Phase 1 agent port" in their `reason` fields without yet pointing to ADR-15. Phase 3 will backfill the ADR-15 cross-references as part of writing the ADR itself.

### Coverage manifest

- **D-08:** After the rebrand engine runs, `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md` are regenerated with the three new target paths counted as covered. No orphan upstream paths (all three GSD source files map to a target) and no orphan target paths (all three oto target files have a recorded source). Success criterion 5 of Phase 1 is met by the regenerated manifest.

### Per-runtime install

- **D-09:** No new installer code paths beyond extending `CODEX_AGENT_SANDBOX`. The existing per-runtime install logic discovers agents by reading `oto/agents/*.md`, so once the rebrand engine writes the three new files there, all three runtimes pick them up:
  - Claude Code: files copied to `~/.claude/agents/` verbatim.
  - Codex: per-agent `.toml` generated with the assigned `sandbox_mode` (via the existing `generateCodexAgentToml` path that reads from `CODEX_AGENT_SANDBOX`), plus a `[agents.oto-*]` struct entry in `config.toml`.
  - Gemini CLI: files copied to `~/.gemini/agents/`; auto-registered as callable tools (Task transform handled elsewhere; no per-agent registration needed).

### Plans

- **D-10:** Two plans in Phase 1, executed sequentially:
  - **Plan 01 — Agent file ports.** Inventory flip → rebrand engine run → 3 agent files + 1 reference file land in `oto/` → `agent-audit.md` updated → coverage manifest regenerated.
  - **Plan 02 — Installer wiring.** Extend `CODEX_AGENT_SANDBOX` with three entries → verify `oto install --claude` / `--codex` / `--gemini` each install all three new agent files (manual smoke against a temp `--config-dir`; CI install-smoke is Phase 3) → assert `Task(subagent_type="oto-doc-classifier")` etc. dispatch cleanly under Claude Code (no startup error).

### Claude's discretion

- Exact rebrand-engine invocation flags (dry-run vs apply ordering, whether to commit pre/post manifests separately).
- Whether the agent-audit.md edits use a single diff or split the count-table update from the per-row verdict flips.
- Test fixture/temp-dir naming for the manual install smoke in Plan 02.
- Whether the Phase 1 commit message threads through "partial ADR-07 reversal" framing — Phase 3 owns the formal ADR-15; Phase 1 commits can use either framing.
- Wording of the `reason` field in `file-inventory.json` rows (D-06 baseline: "v0.3.0 Phase 1 agent port — partial ADR-07 reversal").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints
- `.planning/PROJECT.md` — three-runtime scope (Claude / Codex / Gemini); personal-use cost ceiling; "no dead commands in `/oto-help`" north star for v0.3.0.
- `.planning/REQUIREMENTS.md` — AGNT-01..03, INST-01, INST-02 (Phase 1's 5 requirements); locked INST-02 sandbox assignments.
- `.planning/ROADMAP.md` — Phase 1 goal + success criteria (5 criteria); per-phase requirement mapping.
- `CLAUDE.md` — Node 22+/CJS top-level tech stack; per-runtime install dirs (`~/.claude/`, `~/.codex/`, `~/.gemini/`); per-runtime instruction files; rebrand engine vs hand-edits boundary.

### Source files (upstream — port from these)
- `foundation-frameworks/get-shit-done-main/agents/gsd-doc-classifier.md` (168 LOC).
- `foundation-frameworks/get-shit-done-main/agents/gsd-doc-synthesizer.md` (204 LOC).
- `foundation-frameworks/get-shit-done-main/agents/gsd-eval-auditor.md` (191 LOC).
- `foundation-frameworks/get-shit-done-main/get-shit-done/references/doc-conflict-engine.md` — required reading for synthesizer; port to `oto/references/doc-conflict-engine.md`.

### Pattern precedents (mirror these)
- v0.1.0 Phase 4 agent ports — same rebrand-engine flow used for the 23 retained agents. See any existing `agents/gsd-doc-writer.md`-style entry in `decisions/file-inventory.json` for the canonical `keep` row shape (path + upstream + verdict + reason + target_path + rebrand_required + phase_owner + category).
- `decisions/ADR-07-agent-trim.md` — original drop decision being partially reversed; cite in inventory/audit `reason` fields.
- `decisions/agent-audit.md` — verdict table; Phase 1 edits flip three rows and update counts.

### Codex sandbox infrastructure
- `oto/bin/install.js:26` (`CODEX_AGENT_SANDBOX` const) — single map of agent-name → sandbox_mode; add three entries here.
- `oto/bin/install.js:2014–2030` (`generateCodexAgentToml`) — reads from `CODEX_AGENT_SANDBOX`; no code changes needed beyond the const.
- `oto/bin/install.js:2065+` (`generateCodexConfigBlock`) — emits `[agents.oto-*]` struct tables; picks up new agents automatically once they exist in `oto/agents/`.

### Rebrand engine
- `scripts/rebrand/lib/engine.cjs` — entry points: `runDryRun`, `applyTree`, `runRoundtrip`.
- `scripts/rebrand/lib/manifest.cjs` — coverage manifest builder (`buildPre`, `buildPost`, `assertZeroOutsideAllowlist`); regenerates `reports/rebrand-dryrun.{json,md}` per D-08.
- `rename-map.json` — token substitution rules (`gsd` → `oto`, `.planning` → `.oto`, command `/gsd-` → `/oto-`, etc.). Already covers everything these three agents need; no rename-map edits in this phase.
- `decisions/sync-allowlist.json` — content/path allowlist; should already pass after rebrand without edits (the three agents have no special-cased content).

### Read-only agent precedent (D-04 reconciliation)
- `oto/agents/oto-plan-checker.md` — `tools: Read, Bash, Glob, Grep` with sandbox `read-only` in `CODEX_AGENT_SANDBOX`. Mirror this tool-list shape when reconciling classifier/auditor.
- `oto/agents/oto-integration-checker.md` — same convention.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- **Rebrand engine** — `scripts/rebrand/` already handles upstream→oto file rebrands with coverage-manifest enforcement. Pipeline: walker reads source, engine applies `rename-map.json`, manifest asserts zero un-allowlisted tokens in target. No engine modifications needed — only inventory data updates.
- **Codex sandbox map** — `CODEX_AGENT_SANDBOX` in `oto/bin/install.js` is the single insertion point for INST-02. Existing entries: 8 workspace-write, 2 read-only. Three new entries fit the same shape.
- **Per-runtime install adapters** — Claude/Codex/Gemini install paths already discover agents by globbing `oto/agents/*.md`. New files land for free once written.
- **Agent frontmatter convention** — name, description, tools (CSV string), color. Preserve all fields; the rebrand engine handles `gsd-` → `oto-` in `name` and `description`.

### Established patterns
- **Inventory-driven port** — `decisions/file-inventory.json` is the source of truth for what gets rebrand-ported. Flipping a row from `verdict: drop` to `verdict: keep` is the canonical mechanism to bring back an ADR-07-dropped file.
- **Coverage manifest as gate** — `reports/rebrand-dryrun.{json,md}` is regenerated on every rebrand run; orphan paths (upstream with no target, or target with no upstream) fail the manifest check.
- **Tool list ≈ sandbox contract** — Existing oto agents whose tools include `Write` are uniformly assigned `workspace-write`; agents without `Write` get `read-only`. D-04 keeps the new agents inside this convention.

### Integration points
- **`oto/agents/`** — three new files land here.
- **`oto/references/`** — one new file (`doc-conflict-engine.md`) lands here.
- **`oto/bin/install.js:26`** — `CODEX_AGENT_SANDBOX` const grows by three entries.
- **`decisions/file-inventory.json`** — three rows mutate from drop to keep.
- **`decisions/agent-audit.md`** — three table rows + verdict counts mutate.
- **`reports/rebrand-dryrun.{json,md}`** — regenerated as a side effect of the rebrand engine run.

### Already in place (no changes needed in Phase 1)
- `oto/commands/oto/ingest-docs.md` and `oto/commands/oto/eval-review.md` — exist as deferral stubs from v0.1.0; Phase 2 owns their de-deferral.
- `oto/workflows/ingest-docs.md` and `oto/workflows/eval-review.md` — exist as deferral stubs from v0.1.0; Phase 2 owns the executable workflow rebrand-ports.
- `oto/bin/install.js` per-runtime install paths — discover agents automatically, no new code beyond the sandbox map entry.

</code_context>

<specifics>
## Specific Ideas

- **INST-02 contradiction handling (D-04):** Roadmap locks classifier and auditor to `read-only` sandbox, but both upstream agents declare `Write` in their tools. The decision is to honor INST-02 by dropping `Write` from those two agents' tool lists, matching how `oto-plan-checker` and `oto-integration-checker` already operate. Their spawning workflows (`/oto-ingest-docs` and `/oto-eval-review` — Phase 2) write the output files from the agent's returned content. The synthesizer is the only one of the three that retains `Write` and gets `workspace-write` to write `.oto/INGEST-CONFLICTS.md` directly during its run.
- **Why port `doc-conflict-engine.md` in Phase 1 not Phase 2 (D-03):** Synthesizer agent's `<required_reading>` block cites it. Without the file, the agent's first `Read` call fails at dispatch, breaking AGNT-02's success criterion ("emits its canonical output shape"). The reference file is part of the agent's runtime contract, not part of the workflow scaffolding Phase 2 owns.
- **Why no ADR-15 in Phase 1 (D-07):** Roadmap explicitly assigns ADR-01 (the ADR-15 write) to Phase 3. Phase 1's inventory/audit edits don't need a formal ADR yet — they reference "Phase 1 agent port" with cross-reference back to ADR-07. Phase 3 backfills the ADR-15 link when the ADR is written.
- **Why two plans not three or one (D-10):** Plans 01 and 02 are tightly sequenced (installer wiring depends on the agent files existing). Splitting per-agent (3 plans) would force the rebrand engine to run three times for no benefit, since the engine batches all inventory entries in one pass. Collapsing to one plan would hide the install-time concerns (Codex sandbox map, per-runtime smoke) under the rebrand-port commit, making review harder.

</specifics>

<deferred>
## Deferred Ideas

- **Restore remaining ADR-07-dropped agents** — `gsd-ai-researcher`, `gsd-eval-planner`, `gsd-framework-selector`, `gsd-pattern-mapper`, `gsd-intel-updater`, `gsd-user-profiler`, `gsd-debug-session-manager`. Out of scope per AGNT-DEFER-01. Personal-use cost ceiling stays load-bearing.
- **DOG-01 — Migrate this project from `.planning/` to `.oto/`** — Tracked for v0.4.0+. Out of scope; not a Phase 1 concern.
- **SDK-01 — Implement the `oto-sdk query …` CLI surface** — Tracked for v0.4.0+. Workflows in this milestone keep their manual-fileops fallback.
- **OpenCode / Cursor / Windsurf parity for the new agents** — Out of scope per PROJECT.md (three-runtime constraint).
- **Three-way interactive conflict resolution for `/oto-ingest-docs`** — Inherited GSD v1 scope: auto-precedence-only. Phase 2 concern at most; future milestone otherwise.
- **Add per-agent runtime smoke to CI** — Phase 3 owns `install-smoke.yml` extension (INST-03). Phase 1 does manual smoke only.

</deferred>

---

*Phase: 01-agent-ports-installer-wiring*
*Context gathered: 2026-05-18*
