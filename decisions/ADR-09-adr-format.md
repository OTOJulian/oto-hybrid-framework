# ADR-09: Lightweight ADR format

Status: Accepted
Date: 2026-04-27
Implements: D-14

## Context

Phase 1 needs decision files that are easy to grep, easy for agents to parse, and light enough to maintain without a custom frontmatter parser.

## Decision

Use this ADR template:

```markdown
# ADR-NN: <Title>

Status: Accepted | Deferred | Superseded by ADR-MM
Date: YYYY-MM-DD
Implements: D-NN[, D-NN]

## Context

<why this decision is needed, what's at stake>

## Decision

<the chosen option, stated as a fact>

## Rationale

<why this option over alternatives>

## Consequences

<what this commits us to, what costs we accept>
```

## Rationale

The format is grep-able, line-oriented, and directly testable with Node's built-in test runner. It also leaves room for deferred or superseded decisions without adding another document type.

## Consequences

All Phase 1 ADRs follow this shape. Future phases append ADR-15 and higher in the same format. `tests/phase-01-adr-structure.test.cjs` enforces the required fields and section headers.
