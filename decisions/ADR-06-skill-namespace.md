# ADR-06: Internal skill namespace `oto:`

Status: Accepted
Date: 2026-04-27
Implements: D-07

## Context

Superpowers invokes skills using the `superpowers:<skill-name>` namespace. Oto needs an internal namespace that is distinct from user-typed slash commands and consistent across Claude Code, Codex, and Gemini CLI.

## Decision

Internal skill namespace is `oto:<skill-name>`. All `Skill()` invocations from agents and the SessionStart bootstrap use this namespace.

## Rationale

The colon separator mirrors Superpowers' proven shape while making the rebranded framework identity explicit. It is grep-able, runtime-portable, and clearly separate from `/oto-*` workflows.

## Consequences

Phase 6 ports retained skills under this namespace. `rename-map.json` includes a `skill_ns` rule from `superpowers:` to `oto:`. `decisions/skill-vs-command.md` cross-references this ADR alongside ADR-03.
