---
id: ADR-001
title: Database choice
status: accepted
date: 2026-01-15
---

# ADR-001: Database choice

## Context

The platform needs durable storage for user records and event logs.

## Decision

Use PostgreSQL 16 as the primary relational store. Single-region for v1.

## Consequences

Backup strategy must align with PostgreSQL's WAL and pg_basebackup.
