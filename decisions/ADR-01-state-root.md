# ADR-01: State root `.oto/`

Status: Accepted
Date: 2026-04-27
Implements: D-01, D-02

## Context

GSD stores project state in `.planning/`, while Superpowers keeps parallel planning context under `docs/superpowers/specs/`. A hybrid framework needs one canonical state root so workflows, hooks, agents, and future sync tooling do not leak two different state systems. Pitfall 3 flags path drift during rebrand, and Pitfall 9 flags state systems leaking across the merged product.

## Decision

Canonical state root is `.oto/`. The `.planning/` to `.oto/` rewrite is a typed `path` rule that matches path-shaped occurrences such as `.planning/`, `^\.planning$`, and quoted path variants. It is not a bare-word `planning` rule.

## Rationale

The state root is a load-bearing identity decision. A path rule keeps implementation references coherent while preserving normal prose that uses the word planning. A single `.oto/` root also subsumes Superpowers' parallel specs directory instead of carrying two coordination systems into v1.

## Consequences

Phase 2 must rewrite workflow, agent, hook, and library paths that reference `.planning/` through the path rule. Prose references to planning stay untouched. Downstream phases must treat `.oto/` as the only runtime state root after the rebrand engine exists.
