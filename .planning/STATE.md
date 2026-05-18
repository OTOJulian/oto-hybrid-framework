---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: Restore doc-intake and eval-review agents
status: planning
last_updated: "2026-05-18T00:00:00Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current Position

Phase: Not started (roadmap approved, ready for planning)
Plan: —
Status: Awaiting `/oto-plan-phase 1`
Last activity: 2026-05-18 — v0.3.0 roadmap created (3 phases, 20 requirements, 100% coverage)

Archive (prior milestones):

- `.planning/milestones/v0.2.0-ROADMAP.md`
- `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`
- `.planning/milestones/v0.1.0-ROADMAP.md`
- `.planning/milestones/v0.1.0-REQUIREMENTS.md`
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md`

## Last Verified

- v0.2.0 milestone audit: `status: passed`, 32/32 requirements covered.
- `npm test` last green at v0.2.0 archive (2026-05-07): 533 pass, 1 expected skip, 0 failures.

## Next Command

```bash
/oto-plan-phase 1
```

After ROADMAP.md is approved, plan Phase 1 (Agent ports + installer wiring).

## Accumulated Context

### Roadmap Evolution

- 2026-05-18: v0.3.0 roadmap created. Phases derived from natural dependency chain: agents (foundation) → workflows + commands (consumer) → tests + parity + ADR-15 (closure). 20/20 requirements mapped.

### Decisions

(Populated as phases execute.)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260505-bxx | Port GSD's Codex command-to-skill adapter into oto's installer (Codex `$oto-*` invocation parity) | 2026-05-05 | f56522c | [260505-bxx-port-gsds-codex-command-to-skill-adapter](./quick/260505-bxx-port-gsds-codex-command-to-skill-adapter/) |
| 260505-cxx | Exclude runtime agent worktrees from `/oto-migrate` dry-run and apply scope | 2026-05-05 | 69f8969 | [260505-cxx-exclude-runtime-worktrees-from-migrate](./quick/260505-cxx-exclude-runtime-worktrees-from-migrate/) |
| 260506-axx | Expose `/oto:migrate` through the public `oto migrate` CLI path | 2026-05-06 | df7aba5 | [260506-axx-expose-migrate-through-public-cli](./quick/260506-axx-expose-migrate-through-public-cli/) |
| 260506-bxx | Skip untracked gitignored generated artifacts during `/oto-migrate` | 2026-05-06 | 4230d59 | [260506-bxx-skip-gitignored-migrate-artifacts](./quick/260506-bxx-skip-gitignored-migrate-artifacts/) |
