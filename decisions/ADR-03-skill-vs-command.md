# ADR-03: Skill-vs-command routing policy

Status: Accepted
Date: 2026-04-27
Implements: D-05, D-06

## Context

GSD is workflow-first through slash commands, while Superpowers is skill-first through auto-loaded skills. Several concepts overlap: test-driven development, systematic debugging, verification, parallel agents, and git worktrees. Without a routing policy, an agent could load a skill while a workflow is already controlling the same action.

## Decision

`/oto-<cmd>` is the user-typed slash-command surface for workflows. `oto:<skill-name>` is reserved for explicit `Skill()` calls inside agents and orchestrators. When workflows and skills overlap during active work, the workflow wins. The `oto:using-oto` bootstrap defers when `.oto/STATE.md` shows an active phase; outside an active workflow, skills auto-fire normally.

## Rationale

This preserves GSD's phase machine as the operational spine while keeping Superpowers' skill ergonomics for standalone use and agent-internal invocation. It also confirms the GSD #2697 separation between command and skill surfaces.

## Consequences

`decisions/skill-vs-command.md` is the operational table for all overlap cases. Phase 5 must make SessionStart read `.oto/STATE.md` before auto-surfacing skills. Agent prompts may still invoke `oto:<skill-name>` at canonical points such as TDD and verification.
