# ADR-07: Moderate agent trim

Status: Accepted
Date: 2026-04-27
Implements: D-12

## Context

GSD has 33 agents. The hybrid framework is personal-use and should carry the phase spine while trimming AI/eval-specific, redundant doc, and niche/v2 roles. Research confirms the count and the drop math: 33 = 23 keep + 10 drop.

## Decision

Use moderate trim: retain 23 agents and drop 10. Drop categories are AI/eval (4), redundant doc (2), and niche/v2 (4). Keep categories are phase spine (16), audits (2), researchers (2), and UI subset (3).

| Verdict | Count | Agents |
|---------|-------|--------|
| DROP - AI/eval | 4 | `gsd-ai-researcher`, `gsd-eval-auditor`, `gsd-eval-planner`, `gsd-framework-selector` |
| DROP - redundant doc | 2 | `gsd-doc-classifier`, `gsd-doc-synthesizer` |
| DROP - niche/v2 | 4 | `gsd-pattern-mapper`, `gsd-intel-updater`, `gsd-user-profiler`, `gsd-debug-session-manager` |
| KEEP - phase spine | 16 | `gsd-planner`, `gsd-executor`, `gsd-verifier`, `gsd-debugger`, `gsd-project-researcher`, `gsd-phase-researcher`, `gsd-roadmapper`, `gsd-research-synthesizer`, `gsd-plan-checker`, `gsd-code-reviewer`, `gsd-code-fixer`, `gsd-codebase-mapper`, `gsd-doc-writer`, `gsd-doc-verifier`, `gsd-integration-checker`, `gsd-nyquist-auditor` |
| KEEP - audits | 2 | `gsd-security-auditor`, `gsd-assumptions-analyzer` |
| KEEP - researchers | 2 | `gsd-advisor-researcher`, `gsd-domain-researcher` |
| KEEP - UI | 3 | `gsd-ui-researcher`, `gsd-ui-checker`, `gsd-ui-auditor` |

## Rationale

The retained set preserves planning, execution, verification, debugging, code review, security, documentation, research, integration, validation, and UI review. Dropped agents either support deferred AI/eval workflows, duplicate retained doc roles, or belong to v2 intelligence/profile features.

## Consequences

Phase 4 ports exactly 23 agents and drops the other 10. Codex sandbox mapping in Phase 8 carries 23 retained entries. `decisions/agent-audit.md` records per-agent verdict and rationale for AGT-01.
