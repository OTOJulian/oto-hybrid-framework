---
phase: 04-core-workflows-agents-port
plan: 04
subsystem: workflows
tags: [ai-integration, agents, markdown, wf-28, adr-07]

requires:
  - phase: 04-core-workflows-agents-port
    provides: 04-02 baseline oto payload and retained agent files
  - phase: 01-inventory-architecture-decisions
    provides: ADR-07 agent trim and agent-audit verdicts
provides:
  - Bounded /oto-ai-integration-phase command copy for v0.1.0
  - AI integration workflow with only oto-domain-researcher as a live Task target
  - Explicit DEFERRED runtime messages for Framework Selection, AI Research, and Eval Planning
affects: [phase-04-wave-3-tests, phase-09-sync-replay, wf-28]

tech-stack:
  added: []
  patterns:
    - Use unprefixed dropped-agent names inside shipped DEFERRED comments
    - Treat unsupported AI/eval steps as visible manual-fill workflow sections

key-files:
  created:
    - .planning/phases/04-core-workflows-agents-port/04-04-SUMMARY.md
  modified:
    - oto/commands/oto/ai-integration-phase.md
    - oto/workflows/ai-integration-phase.md

key-decisions:
  - "04-04: Keep /oto-ai-integration-phase shippable by running only oto-domain-researcher live and surfacing unsupported steps as DEFERRED manual-fill sections."
  - "04-04: Avoid path-like .planning/ references in shipped DEFERRED comments even where the plan template mentioned phase research paths, preserving Phase 4 leak rules."

patterns-established:
  - "AI scaffold deferral: retain command/workflow discoverability while replacing unavailable agents with runtime-visible DEFERRED messages."
  - "Anti-leak naming: refer to dropped agents as framework-selector, AI researcher, and eval-planner without oto- prefixes in shipped files."

requirements-completed: [WF-28]

duration: 4 min
completed: 2026-04-29
---

# Phase 04 Plan 04: AI Integration Scaffolding Rewrite Summary

**Bounded AI-SPEC scaffolding now runs only the retained Domain Research agent and makes every unsupported AI/eval step explicit to the user.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-29T22:59:17Z
- **Completed:** 2026-04-29T23:03:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Rewrote `/oto-ai-integration-phase` command copy so it states the v0.1.0 bounded scope and no longer promises unavailable framework/eval automation.
- Rewrote `oto/workflows/ai-integration-phase.md` so the only live agent Task target is `oto-domain-researcher`.
- Added explicit DEFERRED runtime messages for Framework Selection, AI Research, and Eval Planning with manual-fill instructions.
- Verified both shipped files have zero dropped-agent `oto-*` substrings and no path-like `.planning` leaks.

## Task Commits

1. **Task 1: Rewrite command objective and process** - `f197119` (feat)
2. **Task 2: Rewrite workflow to run only Domain Research and defer the rest** - `d284c54` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `oto/commands/oto/ai-integration-phase.md` - Bounded command description and objective for WF-28.
- `oto/workflows/ai-integration-phase.md` - Deferred unsupported AI/eval steps and retained live Domain Research Task call.
- `.planning/phases/04-core-workflows-agents-port/04-04-SUMMARY.md` - Execution summary and replay notes.

## Before/After Objective

Before:

```markdown
<objective>
Create an AI design contract (AI-SPEC.md) for a phase involving AI system development.
Orchestrates oto-framework-selector -> oto-ai-researcher -> oto-domain-researcher -> oto-eval-planner.
Flow: Select Framework -> Research Docs -> Research Domain -> Design Eval Strategy -> Done
</objective>
```

After:

```markdown
<objective>
Generate an AI-feature design contract (AI-SPEC.md) for a phase that adds AI-powered capability.

**v0.1.0 status (bounded scope per ADR-07):**
- **Live:** Domain Research step (via `oto-domain-researcher`) - gathers domain knowledge and writes RESEARCH.md fragments.
- **Deferred:** Framework Selection, AI Research, and Evaluation Planning are deferred until eval-tooling agents return in v2 (see ADR-07 in `decisions/`). The workflow will print explicit DEFERRED blocks where these steps would run, with manual-fill instructions.

Purpose: Keep the command discoverable in `/oto-help` and useful for partial scaffolding; do NOT pretend the deferred steps work.
Output: Domain-research artifacts + an AI-SPEC.md skeleton with explicit TODO sections for the deferred steps.
</objective>
```

## Deferred Blocks

Framework Selection:

```markdown
<!-- DEFERRED: was the framework-selector agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->
```

AI Research:

```markdown
<!-- DEFERRED: was the AI researcher agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->
```

Eval Planning:

```markdown
<!-- DEFERRED: was the eval-planner agent per ADR-07. No retained replacement; deferred until eval-tooling agents return in v2. -->
```

## Decisions Made

- Kept the command/workflow present rather than deleting WF-28, because D-17 and D-20 require a useful but bounded scaffold.
- Kept `oto-domain-researcher` as the only live Task target and removed all dropped-agent model lookups.
- Used unprefixed dropped-agent names in DEFERRED comments so the later substring-based dropped-agent test will not fail on inert prose.
- Avoided the plan template's path-like phase research reference inside shipped files because Phase 4 leak policy forbids `.planning/` paths in runtime payload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Avoided shipped `.planning/` path leak in DEFERRED comments**
- **Found during:** Task 2 (workflow rewrite)
- **Issue:** The plan's sample DEFERRED comment referenced a phase research path. Adding that path to `oto/workflows/ai-integration-phase.md` would violate Phase 4 D-13 shipped-payload leak policy.
- **Fix:** Cited ADR-07 and the retained/dropped agent status without adding path-like `.planning/` references to shipped command or workflow files.
- **Files modified:** `oto/workflows/ai-integration-phase.md`, `oto/commands/oto/ai-integration-phase.md`
- **Verification:** `grep -n "\\.planning" oto/workflows/ai-integration-phase.md oto/commands/oto/ai-integration-phase.md` returned no matches.
- **Committed in:** `d284c54`

---

**Total deviations:** 1 auto-fixed (Rule 2 missing critical)
**Impact on plan:** Preserved the plan's bounded AI integration behavior while keeping Phase 4 shipped-payload leak rules intact.

## Known Stubs

- `oto/commands/oto/ai-integration-phase.md:3` - The command description intentionally says the output is a bounded AI-SPEC skeleton with deferred TODOs; this is WF-28's v0.1.0 behavior, not an unimplemented executable path.
- `oto/commands/oto/ai-integration-phase.md:25` - The command objective intentionally promises TODO sections for deferred steps so users are not misled.
- `oto/workflows/ai-integration-phase.md:102` - Placeholder shell variables initialize manual-fill framework/eval values because the corresponding agents are intentionally dropped in ADR-07.
- `oto/workflows/ai-integration-phase.md:125` - Visible TODO markers are intentionally preserved in AI-SPEC output for manual completion.

## Issues Encountered

None.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `! grep -qE "oto-(framework-selector|ai-researcher|eval-planner)" oto/commands/oto/ai-integration-phase.md`
- `! grep -qE "oto-(framework-selector|ai-researcher|eval-planner|eval-auditor)" oto/workflows/ai-integration-phase.md`
- `grep -nE "subagent_type[\"']?\\s*[:=]\\s*[\"']oto-domain-researcher" oto/workflows/ai-integration-phase.md`
- `grep -n "\\.planning" oto/workflows/ai-integration-phase.md oto/commands/oto/ai-integration-phase.md` returned no matches.
- `node --test tests/phase-04-no-dropped-agents.test.cjs tests/phase-04-task-refs-resolve.test.cjs tests/phase-04-command-to-workflow.test.cjs` passed with existing TODO scaffolds.
- `npm test` passed: 229 tests, 220 pass, 0 fail, 9 TODO.

## Next Phase Readiness

Ready for 04-05 remaining dropped-agent workflow rewrites. WF-28 is now bounded and shippable for v0.1.0, with later Wave 3 tests able to enforce the no-dropped-agent and task-reference contracts.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-core-workflows-agents-port/04-04-SUMMARY.md`.
- Task commit `f197119` exists.
- Task commit `d284c54` exists.
- Summary frontmatter includes `requirements-completed: [WF-28]`.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*
