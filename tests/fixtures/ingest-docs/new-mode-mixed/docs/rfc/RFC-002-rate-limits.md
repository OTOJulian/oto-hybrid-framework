---
id: RFC-002
title: API rate limit strategy
status: discussion
---

# RFC-002: API rate limit strategy

## Summary

Propose tenant-scoped rate limits for public API requests.

## Alternatives

- Global per-IP limits (rejected: noisy tenants affect others)
- No limits for v1 (rejected: abuse risk)
