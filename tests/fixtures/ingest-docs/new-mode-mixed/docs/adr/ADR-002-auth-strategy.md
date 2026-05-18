---
id: ADR-002
title: Authentication strategy
status: accepted
date: 2026-01-18
---

# ADR-002: Authentication strategy

## Context

The platform needs user authentication without maintaining password storage.

## Decision

Use OIDC with Auth0; no self-hosted IdP for v1.

## Consequences

Runtime configuration must include Auth0 issuer and audience values.
