# Skill <-> Command Routing Reference

> Operational reference for ADR-03 (skill-vs-command routing) and ADR-06 (internal skill namespace).
> When workflows and skills overlap, the workflow wins for in-progress work. `oto:using-oto`
> defers when `.oto/STATE.md` shows an active phase; outside an active workflow, skills auto-fire
> normally.

## v1-active subset (5 overlaps wired in v0.1.0)

These overlaps are wired in v0.1.0. Both surfaces ship and the routing rule applies.

| Skill | Workflow / Agent | Routing |
|-------|------------------|---------|
| `oto:test-driven-development` | `oto-executor` agent | Agent invokes skill before writing implementation code (SKL-08) |
| `oto:systematic-debugging` | `/oto-debug` workflow + `oto-debugger` agent | Inside `/oto-debug`: workflow wins. Outside any workflow: skill auto-fires. |
| `oto:verification-before-completion` | `oto-verifier` agent | Agent invokes skill after writing implementation code (SKL-08) |
| `oto:dispatching-parallel-agents` | `/oto-execute-phase` wave engine | Workflow wave logic is the operational form; skill is for outside-wave agent prompting. |
| `oto:using-git-worktrees` | `/oto-new-workspace` | Workflow wins when invoked; skill is the standalone form when no workspace command is active. |

## Full overlap table (14 rows - all skill <-> workflow pairs surveyed)

| # | Skill | Workflow / Agent | v1 status | Resolution |
|---|-------|------------------|-----------|------------|
| 1 | `test-driven-development` | `oto-executor` | active | Keep skill; agent invokes at canonical point |
| 2 | `systematic-debugging` | `/oto-debug`, `oto-debugger` | active | Keep skill; workflow wins when active |
| 3 | `verification-before-completion` | `oto-verifier` | active | Keep skill; agent invokes after writes |
| 4 | `dispatching-parallel-agents` | `/oto-execute-phase` | active | Keep skill; folds into wave engine for in-workflow use |
| 5 | `using-git-worktrees` | `/oto-new-workspace` | active | Keep skill; standalone form |
| 6 | `using-superpowers` to `using-oto` | SessionStart bootstrap | active | Renamed per ADR-06; defers to STATE.md |
| 7 | `writing-skills` | none - meta-skill | active | Keep skill; no workflow overlap |
| 8 | `brainstorming` | `/oto-discuss-phase` | dropped | Workflow wins; skill not ported |
| 9 | `writing-plans` | `/oto-plan-phase` | dropped | Workflow wins; rigor folded into `oto-planner` |
| 10 | `executing-plans` | `/oto-execute-phase` | dropped | Workflow wins |
| 11 | `subagent-driven-development` | wave engine | dropped | Folded into `oto-executor` |
| 12 | `requesting-code-review` | `/oto-code-review` | dropped | Workflow wins |
| 13 | `receiving-code-review` | none | dropped (v2 candidate) | No v1 invocation point; revisit in v2 |
| 14 | `finishing-a-development-branch` | `/oto-ship` | dropped | Workflow wins |

## Routing rule (formal)

```text
IF .oto/STATE.md shows an active phase:
  IF the user-typed command is a /oto-<cmd> workflow:
    workflow wins; skill auto-load is suppressed
  ELSE the agent prompt explicitly invokes oto:<skill>:
    skill fires as a canonical invocation
  ELSE:
    skill auto-load is suppressed by using-oto bootstrap deferral
ELSE:
  skill auto-load fires normally on suspicion
```

## Cross-references

- ADR-03 (skill-vs-command routing policy) locks the workflow-wins rule.
- ADR-06 (internal skill namespace) locks the `oto:<skill-name>` form.
- ADR-07 (agent trim depth) keeps the agents that invoke v1-active skills.
- REQUIREMENTS.md SKL-01..SKL-08 tracks the retained skills and cross-system integration.
