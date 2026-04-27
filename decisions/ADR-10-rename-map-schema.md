# ADR-10: Rule-typed rename map schema

Status: Accepted
Date: 2026-04-27
Implements: D-15

## Context

The rebrand touches identifiers, paths, slash commands, skill namespaces, package metadata, URLs, and env vars. A single string replacement would create substring collisions, damage license attribution, and miss boundary-specific behavior.

## Decision

`rename-map.json` lives at repo root and validates against `schema/rename-map.json`. Top-level shape is `{version: "1", rules: {identifier[], path[], command[], skill_ns[], package[], url[], env_var[]}, do_not_rename: [string|{pattern, reason}], deprecated_drop: [string]}`. The schema enforces rule-specific shapes, including `identifier_rule.boundary`, command patterns, env-var patterns, `do_not_rename` oneOf entries, and `additionalProperties: false` on rule objects.

## Rationale

Rule typing prevents Pitfall 1 substring collisions at the data-contract layer. `path` rules can target `.planning/` without touching prose. `env_var` rules can use `apply_to_pattern`. `url` rules can preserve attribution while still documenting the target GitHub placeholder.

## Consequences

Plan 03 ships the schema and actual map. Phase 2's `scripts/rebrand.cjs` must validate the map before applying any transformations and refuse to run on non-conformant input.
