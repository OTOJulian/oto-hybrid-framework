---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: Restore doc-intake and eval-review agents
status: executing
last_updated: "2026-05-18T13:36:00Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 5
  completed_plans: 2
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current Position

Phase: 2 — Workflow rebrand-ports + command de-deferral
Plan: 02-01, 02-02, 02-03
Status: Ready to execute (`/oto-execute-phase 2`)
Last activity: 2026-05-18 — Phase 2 planned. 3 plans across 2 waves: 02-01 (rebrand apply + workflow hand-fixups) and 02-02 (CMD regression-guard test) run in parallel as Wave 1; 02-03 (workflow-shape + fixture-tree tests) runs as Wave 2 depending on 02-01. Plan checker passed after one revision iteration (0 blockers, all 4 warnings and 1 info resolved). `oto-sdk` remained unavailable in this environment, so plans use direct file ops + `git` only — no `oto-sdk query` calls in any task body.

Archive (prior milestones):

- `.planning/milestones/v0.2.0-ROADMAP.md`
- `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`
- `.planning/milestones/v0.1.0-ROADMAP.md`
- `.planning/milestones/v0.1.0-REQUIREMENTS.md`
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md`

## Last Verified

- v0.2.0 milestone audit: `status: passed`, 32/32 requirements covered.
- Phase 1 verification passed on 2026-05-18: `01-VERIFICATION.md` status `passed`, `01-REVIEW.md` status `clean`, `01-SECURITY.md` status `passed`.
- `npm test` passed on 2026-05-18: 533 pass, 1 expected skip, 0 failures.
- Focused Phase 1 and runtime-matrix tests also passed on 2026-05-18.

## Next Command

```bash
/oto-execute-phase 2
```

Phase 2 is planned. Execute Wave 1 (02-01 + 02-02 in parallel), then Wave 2 (02-03 depends on 02-01) to deliver the executable `/oto-ingest-docs` and `/oto-eval-review` workflows and lock in deferral-framing absence.

## Accumulated Context

### Roadmap Evolution

- 2026-05-18: v0.3.0 roadmap created. Phases derived from natural dependency chain: agents (foundation) → workflows + commands (consumer) → tests + parity + ADR-15 (closure). 20/20 requirements mapped.
- 2026-05-18: Phase 1 completed. The retained agent set is now 26 agents; Phase 2 is ready to plan.

### Decisions

- Phase 1 partially reverses ADR-07 only for `oto-doc-classifier`, `oto-doc-synthesizer`, and `oto-eval-auditor`; the rest of the ADR-07 dropped-agent set remains deferred until a future milestone.
- Codex sandbox locks for restored agents: classifier and eval auditor are `read-only`; doc synthesizer is `workspace-write`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260505-bxx | Port GSD's Codex command-to-skill adapter into oto's installer (Codex `$oto-*` invocation parity) | 2026-05-05 | f56522c | [260505-bxx-port-gsds-codex-command-to-skill-adapter](./quick/260505-bxx-port-gsds-codex-command-to-skill-adapter/) |
| 260505-cxx | Exclude runtime agent worktrees from `/oto-migrate` dry-run and apply scope | 2026-05-05 | 69f8969 | [260505-cxx-exclude-runtime-worktrees-from-migrate](./quick/260505-cxx-exclude-runtime-worktrees-from-migrate/) |
| 260506-axx | Expose `/oto:migrate` through the public `oto migrate` CLI path | 2026-05-06 | df7aba5 | [260506-axx-expose-migrate-through-public-cli](./quick/260506-axx-expose-migrate-through-public-cli/) |
| 260506-bxx | Skip untracked gitignored generated artifacts during `/oto-migrate` | 2026-05-06 | 4230d59 | [260506-bxx-skip-gitignored-migrate-artifacts](./quick/260506-bxx-skip-gitignored-migrate-artifacts/) |
