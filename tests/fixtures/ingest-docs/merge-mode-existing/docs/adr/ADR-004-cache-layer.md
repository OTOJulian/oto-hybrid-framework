---
id: ADR-004
title: Cache layer
status: accepted
date: 2026-02-01
---

# ADR-004: Cache layer

## Context

Repeated search queries need a low-latency hot path.

## Decision

Add Redis 7 for hot-path caching.

## Consequences

Cache invalidation must be explicit for tenant search index updates.
