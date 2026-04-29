# Phase 4: Core Workflows & Agents Port - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-29T15:18:40-0600
**Phase:** 04-core-workflows-agents-port
**Areas discussed:** Bulk Port Shape, Claude Stability Gate, Agent & Workflow Reference Policy, `.planning` Leak Enforcement, AI Integration Scaffolding

---

## Bulk Port Shape

| Question | Option | Selected |
|----------|--------|----------|
| Primary porting method | Rebrand-engine generated baseline, then curated fixups | yes |
| Primary porting method | Hand-curated copy from inventory | |
| Primary porting method | Hybrid: generate commands/agents, hand-curate workflow library files | |
| Source of truth for inclusion | `decisions/file-inventory.json` only | |
| Source of truth for inclusion | ROADMAP Phase 4 requirements only | |
| Source of truth for inclusion | Inventory is source of truth, ROADMAP decides phase boundary | yes |
| Helper/reference file depth | Port every referenced helper/template/context needed for end-to-end Claude use | |
| Helper/reference file depth | Port only files hit by the first dogfood flow, defer the rest | |
| Helper/reference file depth | Port all keep/merge inventory rows in workflow/command/agent/context/template classes | yes |
| Conflict handling | Prior ADR/context wins; patch generated output | yes |
| Conflict handling | Generated output wins unless tests fail | |
| Conflict handling | Stop and ask before patching | |

**User's choice:** `1A, 2C, 3C, 4A`.
**Notes:** Use generated baseline, but keep prior decisions authoritative.

---

## Claude Stability Gate

| Question | Option | Selected |
|----------|--------|----------|
| MR-01 proof | One real dogfood flow only | |
| MR-01 proof | Automated smoke only | |
| MR-01 proof | Both automated smoke and one real dogfood flow | yes |
| Dogfood location | Disposable temp/sample project | yes |
| Dogfood location | This repo against Phase 4 artifacts | |
| Dogfood location | Separate real project after install | |
| Blocking failure scope | Any `/oto-*` command error | |
| Blocking failure scope | Core spine failures only; niche command issues can become follow-up tasks | |
| Blocking failure scope | Only failures in new-project, plan, execute, verify, progress, pause/resume | yes |
| Gate record | `04-HUMAN-UAT.md` only | |
| Gate record | `04-VERIFICATION.md` only | |
| Gate record | Both UAT and verification | yes |

**User's choice:** `1C, 2A, 3C, 4C`.
**Notes:** MR-01 requires both automated and human/operator evidence.

---

## Agent & Workflow Reference Policy

| Question | Option | Selected |
|----------|--------|----------|
| Dropped agent references | Hard fail: every `Task(subagent_type=...)` must point to a retained `oto-*` agent | yes |
| Dropped agent references | Replace dropped agents with closest retained agent when obvious | |
| Dropped agent references | Leave references but mark commands as deferred | |
| Generic agent references | Hard fail unless explicitly allowlisted as inert docs/examples | yes |
| Generic agent references | Rewrite all generic references to retained `oto-*` agents | |
| Generic agent references | Ignore unless they execute in real workflows | |
| Phase 5/6/8 references | Keep visible TODO/deferred markers; do not pretend unavailable capability exists | yes |
| Phase 5/6/8 references | Stub them so the user sees the command, even if internals are inert | |
| Phase 5/6/8 references | Drop those commands from Phase 4 entirely | |
| Command-to-workflow mapping | Every installed command must point to an existing rebranded workflow file | yes |
| Command-to-workflow mapping | Only core commands need exact mapping; secondary commands can be best-effort | |
| Command-to-workflow mapping | Commands can inline logic if no workflow file exists | |

**User's choice:** `1A, 2A, 3A, 4A`.
**Notes:** Strict reference integrity is a Phase 4 closeout blocker.

---

## `.planning` Leak Enforcement

| Question | Option | Selected |
|----------|--------|----------|
| Enforcement scope | Entire repo except `.planning/` artifacts and `foundation-frameworks/` | |
| Enforcement scope | Shipped payload only: `oto/`, commands, agents, `bin/`, hooks, skills | yes |
| Enforcement scope | Only runtime-installed files after `oto install --claude` | |
| Planning docs treatment | Explicitly allow `.planning/` in project planning artifacts | yes |
| Planning docs treatment | Rewrite planning docs to `.oto/` too | |
| Planning docs treatment | Ignore planning docs entirely | |
| Enforcement implementation | Focused `node:test` grep-style test only | |
| Enforcement implementation | Manual verification command only | |
| Enforcement implementation | Both automated test and verification command in `04-VERIFICATION.md` | yes |
| Ambiguous prose | Leave prose alone; only path-like `.planning` references are leaks | yes |
| Ambiguous prose | Rewrite all "planning" prose to "oto state" | |
| Ambiguous prose | Ask case-by-case | |

**User's choice:** `1B, 2A, 3C, 4A`.
**Notes:** Repo-local GSD planning artifacts are explicitly out of the leak check.

---

## AI Integration Scaffolding

| Question | Option | Selected |
|----------|--------|----------|
| WF-28 behavior | Port as a working `/oto-ai-integration-phase` workflow using retained agents only | yes |
| WF-28 behavior | Install command but clearly deferred until AI/eval agents return | |
| WF-28 behavior | Drop despite REQUIREMENTS mapping it to Phase 4 | |
| Dropped AI/eval references | Hard fail and rewrite to retained agents or explicit deferred text before closeout | yes |
| Dropped AI/eval references | Leave references if command is marked experimental | |
| Dropped AI/eval references | Keep references and rely on missing-agent errors | |
| Resurrect dropped agents | No; preserve Phase 1 trim decision unless intentionally reopened | yes |
| Resurrect dropped agents | Bring back only `gsd-eval-planner` | |
| Resurrect dropped agents | Bring back all AI/eval agents needed by upstream | |
| Planning representation | Bounded exception with explicit deferred internals and no broken runtime references | yes |
| Planning representation | Treat WF-28 like every other core command with full parity now | |
| Planning representation | Move WF-28 to Phase 8 | |

**User's choice:** `1A, 2A, 3A, 4A`.
**Notes:** User clarified: keep the command useful, but only with retained agents and explicit deferred parts where needed.

## the agent's Discretion

- Exact smoke-test harness structure.
- Exact plan slicing and verification filenames.
- Exact wording for deferred/TODO text inside bounded Phase 5/6/8 surfaces.

## Deferred Ideas

- Hooks: Phase 5.
- Superpowers skills: Phase 6.
- Workstreams/workspaces: Phase 7.
- Codex/Gemini parity: Phase 8.
