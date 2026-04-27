# Agent Audit (AGT-01)

> All 33 GSD v1.38.5 agents with KEEP/DROP verdict and rationale per agent.
> Source enumeration: `foundation-frameworks/get-shit-done-main/agents/gsd-*.md`.
> Verdict policy locked in ADR-07 (Agent trim depth).
> Collision policy locked in ADR-05 (Agent collisions).
>
> Implements: D-12 (trim), D-10 (collision resolution), D-11 (general collision policy).
>
> Rebrand action (KEEP rows) -> file renamed to `agents/oto-<name>.md` in Phase 4 (AGT-03).
> Drop action (DROP rows) -> file deleted in Phase 4 bulk port (no port).

## Verdict counts

- KEEP: 23
- DROP: 10
- MERGE: 0
- Total: 33

## Per-agent verdicts

| Agent | Verdict | Category | Rationale |
|-------|---------|----------|-----------|
| `gsd-advisor-researcher` | KEEP | researcher | Phase research advisor; carried forward. Rebrands to `oto-advisor-researcher`. |
| `gsd-ai-researcher` | DROP | AI/eval | AI/eval-specific agents deferred; no v1 invocation point. |
| `gsd-assumptions-analyzer` | KEEP | audit | Phase audit role; carried forward. |
| `gsd-code-fixer` | KEEP | phase spine | Pairs with code-reviewer for review-fix loop. |
| `gsd-code-reviewer` | KEEP | phase spine | Phase machine integration; collision with Superpowers code-reviewer resolved by dropping the latter (ADR-05). |
| `gsd-codebase-mapper` | KEEP | phase spine | Brownfield exploration support for `/oto-map-codebase` and `/oto-scan`. |
| `gsd-debug-session-manager` | DROP | niche/v2 | Consolidated into `oto-debugger` per ADR-07. |
| `gsd-debugger` | KEEP | phase spine | `/oto-debug` workflow agent; absorbs debug-session-manager responsibilities. |
| `gsd-doc-classifier` | DROP | redundant doc | Consolidated into `oto-doc-writer` per ADR-07. |
| `gsd-doc-synthesizer` | DROP | redundant doc | Consolidated into `oto-doc-writer` per ADR-07. |
| `gsd-doc-verifier` | KEEP | phase spine | Verifies docs against codebase claims; pairs with `oto-doc-writer`. |
| `gsd-doc-writer` | KEEP | phase spine | `/oto-docs-update` workflow agent. |
| `gsd-domain-researcher` | KEEP | researcher | Domain-specific research; complements project/phase researchers. |
| `gsd-eval-auditor` | DROP | AI/eval | AI/eval workflow deferred. |
| `gsd-eval-planner` | DROP | AI/eval | AI/eval workflow deferred. |
| `gsd-executor` | KEEP | phase spine | Core execution agent; invokes TDD and verification skills. |
| `gsd-framework-selector` | DROP | AI/eval | AI/eval framework selection deferred. |
| `gsd-integration-checker` | KEEP | phase spine | Cross-feature integration validation. |
| `gsd-intel-updater` | DROP | niche/v2 | `/oto-intel` is v2. |
| `gsd-nyquist-auditor` | KEEP | phase spine | Validation-architecture enforcement. |
| `gsd-pattern-mapper` | DROP | niche/v2 | Codebase-intelligence overlap with intel-updater; deferred. |
| `gsd-phase-researcher` | KEEP | phase spine | `/oto-discuss-phase` research arm. |
| `gsd-plan-checker` | KEEP | phase spine | Validates plans before execution. |
| `gsd-planner` | KEEP | phase spine | Core planning agent. |
| `gsd-project-researcher` | KEEP | phase spine | `/oto-new-project` research arm. |
| `gsd-research-synthesizer` | KEEP | phase spine | Multi-agent research synthesis. |
| `gsd-roadmapper` | KEEP | phase spine | Roadmap construction. |
| `gsd-security-auditor` | KEEP | audit | Security review via `/oto-secure-phase`. |
| `gsd-ui-auditor` | KEEP | UI | UI review via `/oto-ui-review`; UI hint applies from Phase 3+. |
| `gsd-ui-checker` | KEEP | UI | UI verification. |
| `gsd-ui-researcher` | KEEP | UI | UI research arm. |
| `gsd-user-profiler` | DROP | niche/v2 | `/oto-profile-user` is v2. |
| `gsd-verifier` | KEEP | phase spine | `/oto-verify-work` agent; invokes verification skill. |

## Hooks subject to user confirmation (A7)

The following hooks are inventoried as `DROP (review)` in 01-RESEARCH.md and need user confirmation before Phase 5 starts:

- `gsd-read-guard.js` - recommended DROP; redundant once Claude is daily-use stable.
- `gsd-workflow-guard.js` - recommended DROP; low-value for solo developer use.
- `gsd-phase-boundary.sh` - recommended DROP; redundant with statusline.

## Cross-references

- ADR-05 resolves the Superpowers `code-reviewer` collision.
- ADR-07 locks drop categories and verdict counts.
- REQUIREMENTS.md AGT-01..04 tracks this audit plus downstream port and sandbox deliverables.
