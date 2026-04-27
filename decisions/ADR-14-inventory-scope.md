# ADR-14: Inventory scope and drop policy

Status: Accepted
Date: 2026-04-27
Implements: D-23

## Context

The file inventory must cover every file in the two pinned upstream snapshots without pulling fresh upstream. It also needs deterministic treatment for translated docs, unsupported runtimes, Windows wrappers, and deprecated upstream surfaces.

## Decision

Inventory covers every file under `foundation-frameworks/get-shit-done-main/` and `foundation-frameworks/superpowers-main/`. Translated READMEs and paths matching `^docs/[a-z]{2}-[A-Z]{2}/` are dropped. OpenCode, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen, CodeBuddy, Cline, Copilot, and Kilo plugin manifests are dropped. Upstream-deprecated surfaces are hand-curated from GSD `CHANGELOG.md` and Superpowers `RELEASE-NOTES.md`, with `deprecation_status` populated where relevant.

## Rationale

The project is personal-use and English-only for v1. Unsupported runtimes would multiply installer and rebrand surface without improving the user's daily flow. Manual deprecation review is the cheapest accurate path because upstream prose is not structured enough for a reliable detector.

## Consequences

Plan 02's generator applies deterministic rules for these categories. Windows-only files are dropped. `get-shit-done/bin/gsd-tools.cjs` is marked deprecated but retained as a merge source per ADR-12.
