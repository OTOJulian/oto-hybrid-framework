---
id: SPEC-002
title: Data model v1
status: review
---

# SPEC-002: Data model v1

## Entities

- User: id, email, status, created_at
- Workspace: id, name, billing_plan, owner_user_id

## Storage

PostgreSQL tables use UUID primary keys and timestamp audit columns.
