---
id: PRD-001
title: User onboarding
status: draft
owner: product
---

# PRD-001: User onboarding

## Problem

New users churn within the first session if signup takes more than 30 seconds.

## Goal

Reduce signup to <15 seconds via OAuth plus magic-link fallback.

## Requirements

- PRD-REQ-001: Support Google OAuth on signup screen.
- PRD-REQ-002: Fallback to magic-link email if OAuth fails.
