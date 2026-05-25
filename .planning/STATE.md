---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: SDK + Dogfood
status: planning
last_shipped: v0.3.0
last_shipped_date: 2026-05-18
last_updated: "2026-05-25T00:00:00Z"
last_activity: 2026-05-25 -- Milestone v0.4.0 (SDK + Dogfood) started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

**Current focus:** v0.4.0 SDK + Dogfood — defining requirements and roadmap.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-25 — Milestone v0.4.0 (SDK + Dogfood) started; phases will number from 11.

Archive (prior milestones):

- `.planning/milestones/v0.3.0-ROADMAP.md`
- `.planning/milestones/v0.3.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-ROADMAP.md`
- `.planning/milestones/v0.2.0-REQUIREMENTS.md`
- `.planning/milestones/v0.2.0-MILESTONE-AUDIT.md`
- `.planning/milestones/v0.1.0-ROADMAP.md`
- `.planning/milestones/v0.1.0-REQUIREMENTS.md`
- `.planning/milestones/v0.1.0-MILESTONE-AUDIT.md`

## Last Verified

- v0.3.0 archived on 2026-05-18: ROADMAP and REQUIREMENTS archived to `.planning/milestones/v0.3.0-*`, MILESTONES.md updated, PROJECT.md evolved, RETROSPECTIVE.md updated, tag `v0.3.0` created.
- Phase 1 verification passed on 2026-05-18: `01-VERIFICATION.md` status `passed`, `01-REVIEW.md` status `clean`, `01-SECURITY.md` status `passed`.
- Phase 2 verification passed on 2026-05-18: `02-VERIFICATION.md` status `passed`, `02-REVIEW.md` status `clean`, `02-SECURITY.md` threats open `0`.
- Phase 3 verification passed on 2026-05-18: `03-VERIFICATION.md` status `passed`, `03-REVIEW.md` status `clean`, `03-SECURITY.md` status `verified` with `threats_open: 0`.
- `npm test` passed on 2026-05-18: 612 pass, 1 expected skip, 0 failures.

## Next Command

```bash
/oto-new-milestone
```

Define requirements and roadmap for the next milestone. Candidates queued in `PROJECT.md` → Next Milestone Goals (DOG-01, SDK-01, AGNT-DEFER-01 partial, runtime hardening, upstream-sync UX).

## Accumulated Context

### Roadmap Evolution

- 2026-05-18: v0.3.0 roadmap created. Phases derived from natural dependency chain: agents (foundation) → workflows + commands (consumer) → tests + parity + ADR-15 (closure). 20/20 requirements mapped.
- 2026-05-18: Phase 1 completed. The retained agent set is now 26 agents; Phase 2 is ready to plan.
- 2026-05-18: Phase 2 completed. `/oto-ingest-docs` and `/oto-eval-review` now have executable workflow bodies, deferral framing is regression-guarded away, and workflow-shape/fixture tests lock the Phase 2 contracts. Phase 3 is ready to plan after `/oto-secure-phase 2`.
- 2026-05-18: Phase 3 planned. 4 PLAN.md files written in `.planning/phases/03-tests-install-smoke-parity-adr-15/` across 2 waves (Wave 1: 03-01 tests authoring + 03-02 install-smoke; Wave 1b: 03-03 per-runtime parity sequenced after 03-02; Wave 2: 03-04 ADR-15). Plan checker passed iteration 2; all 6 phase requirements (TEST-01..03, INST-03, PRTY-01, ADR-01) covered. RESEARCH and VALIDATION (nyquist_compliant: true) drafted.
- 2026-05-18: Phase 3 completed. Tests, install-smoke, Codex/Gemini parity, and ADR-15 landed across 4 scoped commits. `03-VERIFICATION.md` passed 6/6 success criteria, `03-SECURITY.md` verified 16/16 threats closed with `threats_open: 0`, and `npm test` passed with 613 tests, 612 pass, 1 skip, 0 failures. v0.3.0 is ready for milestone completion.
- 2026-05-18: v0.3.0 archived and tagged. ROADMAP and REQUIREMENTS archived to `.planning/milestones/v0.3.0-*`; MILESTONES.md, PROJECT.md, RETROSPECTIVE.md updated; tag `v0.3.0` cut. Between milestones.

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
