# ADR-13: License and attribution preservation

Status: Accepted
Date: 2026-04-27
Implements: D-20, D-21, D-22

## Context

Both upstreams are MIT licensed. Oto is a derivative work and must preserve upstream attribution while adding its own MIT license for new work.

## Decision

`LICENSE` at repo root is MIT for oto's added work with `Copyright (c) 2026 Julian Isaac`. `THIRD-PARTY-LICENSES.md` at repo root contains both upstream MIT licenses verbatim, preserving `Copyright (c) 2025 Lex Christopherson` and `Copyright (c) 2025 Jesse Vincent`. Inline upstream copyright comments in ported files are preserved unmodified.

## Rationale

Pitfall 6 is license loss. Attribution is a legal and operational invariant, not a cosmetic string. Preserving exact upstream names also gives tests a simple durable signal.

## Consequences

`LICENSE`, `LICENSE.md`, `THIRD-PARTY-LICENSES.md`, `Lex Christopherson`, and `Jesse Vincent` go on `do_not_rename`. Plan 03 ships the root license files and test coverage. Phase 10 carries forward license-attribution checks in CI.
