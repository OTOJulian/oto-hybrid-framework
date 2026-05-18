---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: Restore doc-intake and eval-review agents
status: milestone_complete_pending_archive
last_updated: "2026-05-18T21:57:10Z"
last_activity: 2026-05-18 -- Phase 3 security review passed; milestone completion pending
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value:** Stop framework-switching - one installable framework where GSD's planning/execution workflow and Superpowers' capabilities coexist behind a single, consistent `/oto-*` command surface across Claude Code, Codex, and Gemini CLI.

## Current Position

Phase: 3 — Tests, install-smoke, parity, ADR-15
Plan: 4 of 4
Status: Phase 3 complete; security review passed; milestone completion pending
Last activity: 2026-05-18 -- Phase 3 security review passed; milestone completion pending

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
- Phase 2 verification passed on 2026-05-18: `02-VERIFICATION.md` status `passed`, `02-REVIEW.md` status `clean`, `02-SECURITY.md` threats open `0`.
- Phase 3 verification passed on 2026-05-18: `03-VERIFICATION.md` status `passed`, `03-REVIEW.md` status `clean`, `03-SECURITY.md` status `verified` with `threats_open: 0`.
- `npm test` passed on 2026-05-18: 612 pass, 1 expected skip, 0 failures.
- Focused Phase 3 ingest-docs, eval-review, install-smoke, Codex parity, Gemini parity, and ADR structure tests passed on 2026-05-18.

## Next Command

```bash
/oto-complete-milestone
```

Phase 3 execution, verification, and security review are complete. Run milestone completion to audit and archive v0.3.0.

## Accumulated Context

### Roadmap Evolution

- 2026-05-18: v0.3.0 roadmap created. Phases derived from natural dependency chain: agents (foundation) → workflows + commands (consumer) → tests + parity + ADR-15 (closure). 20/20 requirements mapped.
- 2026-05-18: Phase 1 completed. The retained agent set is now 26 agents; Phase 2 is ready to plan.
- 2026-05-18: Phase 2 completed. `/oto-ingest-docs` and `/oto-eval-review` now have executable workflow bodies, deferral framing is regression-guarded away, and workflow-shape/fixture tests lock the Phase 2 contracts. Phase 3 is ready to plan after `/oto-secure-phase 2`.
- 2026-05-18: Phase 3 planned. 4 PLAN.md files written in `.planning/phases/03-tests-install-smoke-parity-adr-15/` across 2 waves (Wave 1: 03-01 tests authoring + 03-02 install-smoke; Wave 1b: 03-03 per-runtime parity sequenced after 03-02; Wave 2: 03-04 ADR-15). Plan checker passed iteration 2; all 6 phase requirements (TEST-01..03, INST-03, PRTY-01, ADR-01) covered. RESEARCH and VALIDATION (nyquist_compliant: true) drafted.
- 2026-05-18: Phase 3 completed. Tests, install-smoke, Codex/Gemini parity, and ADR-15 landed across 4 scoped commits. `03-VERIFICATION.md` passed 6/6 success criteria, `03-SECURITY.md` verified 16/16 threats closed with `threats_open: 0`, and `npm test` passed with 613 tests, 612 pass, 1 skip, 0 failures. v0.3.0 is ready for milestone completion.

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
