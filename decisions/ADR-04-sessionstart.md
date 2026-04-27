# ADR-04: Single consolidated SessionStart hook

Status: Accepted
Date: 2026-04-27
Implements: D-08, D-09

## Context

GSD has `gsd-session-state.sh` for project-state reminders. Superpowers has `hooks/session-start` for skill identity and bootstrap instructions. Claude Code does not deduplicate `additional_context` and `hookSpecificOutput.additionalContext`, so two hooks would create duplicated identity primers.

## Decision

Use one SessionStart entrypoint: `oto-session-start`. It consolidates GSD's state reminder and Superpowers' skill bootstrap into exactly one identity block per session. The two-hook approach is rejected.

## Rationale

Pitfall 8 identifies hook ordering and duplicate injection as a real product risk. A consolidated hook gives one place to apply `.oto/STATE.md` gating, one version token, and one snapshot fixture for Phase 10.

## Consequences

Phase 5 implements the consolidated hook and snapshot baseline. Superpowers literals such as `<EXTREMELY_IMPORTANT>You have superpowers.` and `using-superpowers` are hand-rebranded inside that hook, not treated as generic rename-map substitutions.
