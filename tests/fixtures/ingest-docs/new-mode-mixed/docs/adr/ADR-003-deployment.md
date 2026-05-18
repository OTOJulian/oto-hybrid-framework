---
id: ADR-003
title: Deployment target
status: accepted
date: 2026-01-21
---

# ADR-003: Deployment target

## Context

The team needs a deployment target that avoids cluster operations for v1.

## Decision

Deploy to AWS Fargate; no Kubernetes for v1.

## Consequences

Service packaging must produce container images compatible with ECS tasks.
