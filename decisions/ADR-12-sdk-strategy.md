# ADR-12: Drop SDK from v1 and defer SDK path

Status: Accepted
Date: 2026-04-27
Implements: D-18, D-19

## Context

GSD includes an SDK subpackage, but the v1 hybrid goal is an installable personal AI-CLI framework, not a programmatic API. The top-level stack prescription avoids TypeScript and build steps. GSD's existing CJS tooling path is enough for v1.

## Decision

Drop the `sdk/` subpackage from the v1 fork. Fork GSD's pre-existing CJS path `get-shit-done/bin/gsd-tools.cjs` as `oto/bin/lib/oto-tools.cjs`. SDK is Deferred to v2. If built later, it follows GSD's pattern: isolated subpackage with its own `package.json`, `tsconfig.json`, ESM, and Vitest.

## Rationale

This follows Pitfall 5 and avoids install-time `prepare` failures from a top-level TypeScript build. It also accepts Pitfall 22 knowingly: `gsd-tools.cjs` is deprecated upstream, but oto can carry the forked CJS path independently if upstream deletes it later.

## Consequences

No SDK entries land in the v1 package metadata. Inventory marks the SDK subtree as drop and `gsd-tools.cjs` as merge with `deprecation_status: deprecated`. SDK-01 through SDK-03 remain v2 requirements, not v1 blockers.
