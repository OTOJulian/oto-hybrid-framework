# ADR-05: Agent collision resolution

Status: Accepted
Date: 2026-04-27
Implements: D-10, D-11

## Context

Both upstreams contain a code-review concept. GSD ships `gsd-code-reviewer`, integrated with the phase machine and review-fix loop. Superpowers ships `agents/code-reviewer.md`, labeled as an example agent.

## Decision

Drop Superpowers' `agents/code-reviewer.md`. Keep GSD's `gsd-code-reviewer` and rebrand it to `oto-code-reviewer`. Any future collision discovered during inventory keeps one canonical version and drops the other, with the verdict logged in `decisions/agent-audit.md`.

## Rationale

GSD's reviewer is already part of the planned workflow system. Superpowers' reviewer is generic example material and would collide after rebrand. Keeping both would create ambiguous tool identity and duplicated review behavior.

## Consequences

Phase 4 skips `foundation-frameworks/superpowers-main/agents/code-reviewer.md`. `decisions/agent-audit.md` cross-references this ADR and records the surviving `gsd-code-reviewer` row as KEEP.
