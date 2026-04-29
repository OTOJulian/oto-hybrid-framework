# Phase 4: Core Workflows & Agents Port - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Bulk-port the GSD spine through oto's rebrand path so `/oto-*` core workflows and retained agents work end-to-end on Claude Code. Phase 4 fills the runtime payload directories that Phase 3's installer already reads from: `oto/commands/` and `oto/agents/`, plus the workflow, context, template, and helper files required for those commands to execute.

This phase is bounded by ROADMAP Phase 4 and REQUIREMENTS WF-01..25, WF-28..30, AGT-02..04, and MR-01. Workstreams/workspaces remain Phase 7 even where inventory rows are marked keep; hooks remain Phase 5; Superpowers skills remain Phase 6; Codex/Gemini runtime parity remains Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Bulk Port Shape
- **D-01:** Use the rebrand engine to generate the Phase 4 baseline, then apply curated fixups. Do not hand-copy the full port as the primary path.
- **D-02:** `decisions/file-inventory.json` is the source of truth for inclusion, but ROADMAP Phase 4 defines the phase boundary. Inventory rows that belong to Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, or Phase 10 are not pulled forward just because they are keep/merge rows.
- **D-03:** Within the Phase 4 boundary, port all keep/merge inventory rows in workflow, command, agent, context, template, and required helper classes needed for end-to-end Claude use.
- **D-04:** If generated rebrand output conflicts with prior ADRs, prior CONTEXT.md decisions, or this context file, the prior decision wins and the generated output is patched.

### Claude Stability Gate
- **D-05:** MR-01 is proven by both automated smoke coverage and one real dogfood flow. Automated checks alone are not enough.
- **D-06:** The dogfood flow runs in a disposable temp/sample project, not this repo and not a separate real project.
- **D-07:** Blocking dogfood failures are limited to the core spine: `/oto-new-project`, `/oto-plan-phase`, `/oto-execute-phase`, `/oto-verify-work`, `/oto-progress`, `/oto-pause-work`, and `/oto-resume-work`. Other command issues can become follow-up tasks unless they break those core flows.
- **D-08:** Record MR-01 evidence in both `04-HUMAN-UAT.md` and `04-VERIFICATION.md`: UAT captures operator approval and transcript summary; verification captures technical evidence.

### Agent & Workflow Reference Policy
- **D-09:** Every executable `Task(subagent_type=...)` reference must point to a retained `oto-*` agent. References to dropped agents are blockers.
- **D-10:** Generic agent references from upstream examples are hard failures unless explicitly allowlisted as inert docs/examples.
- **D-11:** Workflow references to Phase 5/6/8 capabilities must remain visibly deferred or TODO-marked. Commands must not pretend unavailable hooks, skills, or runtime parity behavior exists.
- **D-12:** Every installed command must point to an existing rebranded workflow file. Do not install commands that reference missing workflows, and do not replace workflow files with inline command logic.

### `.planning` Leak Enforcement
- **D-13:** Enforce zero path-like `.planning/` leaks in shipped/runtime payload only: `oto/`, installed `commands/`, `agents/`, `bin/`, `hooks/`, and `skills/`.
- **D-14:** `.planning/` remains allowed in this repo's GSD planning artifacts because those files are not shipped oto runtime content.
- **D-15:** Implement leak enforcement with both a focused `node:test` grep-style test and a verification command recorded in `04-VERIFICATION.md`.
- **D-16:** Leave ordinary prose using the word "planning" alone. Only path-like `.planning` references are leaks.

### AI Integration Scaffolding
- **D-17:** Port `/oto-ai-integration-phase` as a useful workflow using retained agents only.
- **D-18:** If the upstream AI-integration workflow references dropped AI/eval agents, Phase 4 must hard-fail and rewrite those references to retained agents or explicit deferred text before closeout.
- **D-19:** Do not resurrect dropped AI/eval agents in Phase 4. Preserve the Phase 1 trim decision unless it is intentionally reopened in a later decision.
- **D-20:** Treat WF-28 as a bounded exception: keep the command useful, but make unsupported internals explicit and leave no broken runtime references.

### Claude's Discretion
- Exact plan slicing, helper-file grouping, verification test filenames, and command transcript format are left to the planner/executor.
- The planner may choose the concrete smoke-test harness shape as long as it proves the decisions above and keeps the MR-01 dogfood flow disposable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope
- `.planning/PROJECT.md` — Core value, personal-use cost ceiling, runtime targets, and out-of-scope list.
- `.planning/REQUIREMENTS.md` — Phase 4 maps to WF-01..25, WF-28..30, AGT-02..04, and MR-01.
- `.planning/STATE.md` — Current state: Phase 04 ready to plan; MR-01 is a phase-ordering gate.
- `.planning/ROADMAP.md` §"Phase 4: Core Workflows & Agents Port" — Phase goal, success criteria, dependencies, and out-of-scope adjacent phases.

### Locked prior decisions
- `.planning/phases/01-inventory-architecture-decisions/01-CONTEXT.md` — `.oto/` state root, `/oto-*` command surface, `oto:<skill>` namespace, agent trim, collision policy.
- `.planning/phases/02-rebrand-engine-distribution-skeleton/02-CONTEXT.md` — Rebrand engine architecture and generated-output contracts.
- `.planning/phases/03-installer-fork-claude-adapter/03-CONTEXT.md` — Installer payload handoff: Phase 4 fills `oto/commands/` and `oto/agents/`; installer code should not need rework.

### Inventory and routing contracts
- `decisions/file-inventory.json` — Machine-readable keep/drop/merge source of truth.
- `decisions/file-inventory.md` — Human-readable inventory index, including target paths for commands and agents.
- `decisions/agent-audit.md` — Retained 23-agent set and dropped-agent rationale.
- `decisions/skill-vs-command.md` — Workflow-vs-skill routing rule and v1 active overlap table.
- `rename-map.json` — Rule-typed rebrand map consumed by the engine.
- `CLAUDE.md` — Tech stack and workflow constraints for this repo.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/rebrand.cjs` and `scripts/rebrand/lib/` provide the generated baseline path for Phase 4.
- `rename-map.json` already contains identifier, path, command, skill namespace, package, URL, and env-var rules.
- `decisions/file-inventory.json` and `decisions/file-inventory.md` provide target paths such as `commands/oto/*.md` and `agents/oto-*.md`.
- `bin/lib/runtime-claude.cjs`, `runtime-codex.cjs`, and `runtime-gemini.cjs` already point at `oto/commands`, `oto/agents`, `oto/skills`, and `oto/hooks/dist`.
- `bin/lib/install.cjs` already copies the payload directories and tracks installed files in `<configDir>/oto/.install.json`.

### Established Patterns
- Top-level implementation stays Node 22+, CommonJS, zero-dependency where practical, with `node:test`.
- Generated markdown should have a stable machine-readable source where applicable, following the inventory and rebrand-report precedent.
- Runtime-specific behavior belongs in adapter modules; Phase 4 should not reintroduce runtime conditionals into `bin/install.js`.
- Planning artifacts in `.planning/` are repo-local GSD control files, not oto runtime payload.

### Integration Points
- Phase 4 populates `oto/commands/`, `oto/agents/`, workflow files, contexts, templates, and required helper files.
- Phase 4 must add the Codex agent sandbox map coverage required by AGT-04 without claiming full Codex parity.
- Phase 4 verification must include command-to-workflow mapping, retained-agent reference checks, generic-agent allowlist checks, shipped-payload `.planning` leak checks, install smoke, and MR-01 dogfood evidence.

</code_context>

<specifics>
## Specific Ideas

- The MR-01 dogfood flow should be disposable and transcript-summarized rather than performed directly inside this repo.
- Useful-but-bounded `/oto-ai-integration-phase` means retained agents only, with explicit deferred internals where upstream expects dropped AI/eval agents.
- Core spine failure set is intentionally narrow so secondary command polish does not block daily-use Claude stability.

</specifics>

<deferred>
## Deferred Ideas

- Phase 5 owns hook registration and SessionStart implementation.
- Phase 6 owns Superpowers skill payloads and agent-to-skill canonical invocations.
- Phase 7 owns workstreams and workspace isolation.
- Phase 8 owns Codex/Gemini runtime parity and full frontmatter/tool transform hardening.
- Phase 10 owns release CI/docs hardening beyond Phase 4's focused verification.

</deferred>

---

*Phase: 04-core-workflows-agents-port*
*Context gathered: 2026-04-29*
