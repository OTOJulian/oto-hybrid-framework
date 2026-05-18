---
id: SPEC-001
title: API contract v1
status: review
---

# SPEC-001: API contract v1

## Endpoints

- POST /v1/users -> 201, returns User
- GET /v1/users/:id -> 200 | 404

## Auth

Bearer token in `Authorization` header; tokens issued by Auth0.
