# ADR-08: Dual-format file inventory

Status: Accepted
Date: 2026-04-27
Implements: D-13

## Context

Downstream phases need a deterministic contract for every upstream file: what survives, what drops, what merges, and where retained content lands. A human-readable document alone would be hard to consume from scripts; JSON alone would be awkward for review.

## Decision

Use dual format. `decisions/file-inventory.json` is the machine-readable single source of truth. `decisions/file-inventory.md` is a generated human index grouped by category. Schema lives in `schema/file-inventory.json`. Entries use `{path, upstream, verdict, reason, target_path?, deprecation_status?, rebrand_required, merge_source_files?, phase_owner, category}`.

## Rationale

JSON gives Phase 2, Phase 4, and Phase 9 a queryable contract. Markdown gives the user and future agents a readable index. The added fields make rebrand requirements, merge sources, phase ownership, and category grouping explicit.

## Consequences

Plan 02 ships the schema, generator, and generated outputs. Phase 2 validates the JSON before using it. Phase 4 bulk port and Phase 9 sync must consume the JSON instead of re-deciding keep/drop/merge rules.
