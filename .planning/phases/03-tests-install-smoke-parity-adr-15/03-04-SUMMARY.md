# Plan 03-04 Summary: ADR-15 restore doc/eval agents decision record

Date: 2026-05-18

## Outcome

Completed.

## Changes

- Added `decisions/ADR-15-restore-doc-and-eval-agents.md`.
- ADR-15 follows ADR-09 structure with exact `## Decision` header required by `tests/phase-01-adr-structure.test.cjs`.
- ADR-15 mints global decision D-24 for the partial ADR-07 reversal:
  - Restored: `oto-doc-classifier`, `oto-doc-synthesizer`, `oto-eval-auditor`.
  - Still dropped under AGNT-DEFER-01: `oto-ai-researcher`, `oto-eval-planner`, `oto-framework-selector`, `oto-pattern-mapper`, `oto-intel-updater`, `oto-user-profiler`, `oto-debug-session-manager`.
- ADR-15 records the Phase 1 D-04 Codex sandbox locks:
  - `oto-doc-classifier`: `read-only`
  - `oto-doc-synthesizer`: `workspace-write`
  - `oto-eval-auditor`: `read-only`

## Lock Values

- `Date:` value: `Date: 2026-05-18`
- `Implements:` value: `Implements: D-24`
- ADR-07 filename used: `decisions/ADR-07-agent-trim.md`
- Rejected typo absent: `ADR-07-agent-rationalization`

## Decision Registry Check

Before authoring, `grep -h "^Implements: D-" decisions/ADR-*.md | sort -u` showed D-23 as the current high-water mark:

```text
Implements: D-01, D-02
Implements: D-03, D-04
Implements: D-05, D-06
Implements: D-07
Implements: D-08, D-09
Implements: D-10, D-11
Implements: D-12
Implements: D-13
Implements: D-14
Implements: D-15
Implements: D-16, D-17
Implements: D-18, D-19
Implements: D-20, D-21, D-22
Implements: D-23
Implements: D-NN[, D-NN]
```

After authoring, the same grep includes `Implements: D-24`.

## Verification

- `grep -E '^Implements: D-24$' decisions/ADR-15-restore-doc-and-eval-agents.md` — passed.
- `grep -q 'ADR-07-agent-rationalization' decisions/ADR-15-restore-doc-and-eval-agents.md` — exited 1 as expected.
- `wc -l decisions/ADR-15-restore-doc-and-eval-agents.md` — 57 lines.
- `node --test tests/phase-01-adr-structure.test.cjs` — 3 pass, 0 fail.
- Content lock grep confirmed `ADR-07-agent-trim.md`, `AGNT-DEFER-01`, `D-04`, `D-24`, `read-only`, and `workspace-write`.
- Agent-name grep confirmed all 10 required agent names:
  - `oto-doc-classifier`
  - `oto-doc-synthesizer`
  - `oto-eval-auditor`
  - `oto-ai-researcher`
  - `oto-eval-planner`
  - `oto-framework-selector`
  - `oto-pattern-mapper`
  - `oto-intel-updater`
  - `oto-user-profiler`
  - `oto-debug-session-manager`
- `npm test` — 613 tests, 612 pass, 1 skipped, 0 fail.

## Deviations

- Used exact `## Decision` plus an in-body `**Decision D-24:**` sentence instead of `## Decision D-24`, because the ADR structure test requires `^## Decision$`.
