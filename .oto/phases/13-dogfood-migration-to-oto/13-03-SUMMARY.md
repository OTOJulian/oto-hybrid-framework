---
phase: 13-dogfood-migration-to-oto
plan: 03
subsystem: planning
tags: [dogfood, instruction-files, reference-hygiene, adr]

requires:
  - phase: 13-dogfood-migration-to-oto
    provides: "Plan 13-02 atomic .oto migration"
provides:
  - "OTO workflow enforcement in template and rendered runtime instructions"
  - "ADR-01 Phase 13 forward note"
  - "Surgical rewrite of active live-artifact path citations to .oto/"
affects: [phase-13, dogfood-migration, instruction-files, planning-root]

tech-stack:
  added: []
  patterns:
    - "Edit instruction source template, then render CLAUDE/AGENTS/GEMINI"
    - "Classify .planning/ references before rewriting: active citation vs historical narrative vs resolver contract"

key-files:
  created:
    - ".oto/phases/13-dogfood-migration-to-oto/13-03-SUMMARY.md"
  modified:
    - "oto/templates/instruction-file.md"
    - "CLAUDE.md"
    - "AGENTS.md"
    - "GEMINI.md"
    - "decisions/ADR-01-state-root.md"
    - ".oto/STATE.md"
    - ".oto/ROADMAP.md"
    - ".oto/PROJECT.md"
    - ".oto/MILESTONES.md"

key-decisions:
  - "Kept GSD:workflow marker comments unchanged because tooling keys on the marker names."
  - "Rewrote only active path citations in live artifacts; preserved historical and resolver-contract .planning/ prose."
  - "Left .oto/REQUIREMENTS.md unchanged after review because it had no active path citation requiring rewrite."

patterns-established:
  - "Generated instruction files must be changed through oto/templates/instruction-file.md and scripts/render-instruction-files.cjs."
  - "Phase 13 .planning/ cleanup is allowlist-only; frozen surfaces and historical records remain unchanged unless explicitly in scope."

requirements-completed: [DOG-03]

duration: 7 min
completed: 2026-05-26
---

# Phase 13 Plan 03: Reference Hygiene Summary

**Workflow enforcement now points this repo at `/oto-*`, and active live references point at `.oto/` without broad rewriting historical or contract prose.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-26T05:04:44Z
- **Completed:** 2026-05-26T05:11:20Z
- **Tasks:** 5 completed
- **Files modified:** 9 plus this summary

## Accomplishments

- Replaced the instruction template's workflow enforcement body with "OTO Workflow Enforcement" and `/oto-*` entry points.
- Re-rendered `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` from `oto/templates/instruction-file.md`.
- Preserved the `GSD:workflow-start` / `GSD:workflow-end` marker comments exactly while changing the visible guidance.
- Added a Phase 13 forward note to `decisions/ADR-01-state-root.md` without rewriting the ADR body.
- Rewrote active path citations in `.oto/STATE.md`, `.oto/ROADMAP.md`, `.oto/PROJECT.md`, and `.oto/MILESTONES.md` from `.planning/` to `.oto/`.
- Preserved `.planning/` references that are historical narrative or resolver-contract semantics.
- Verified the change set was allowlist-only and did not touch frozen surfaces.

## Task Commits

Each task group was committed atomically:

1. **Tasks 1-4: Workflow enforcement, ADR note, and active citation rewrites** - `584d8ce` (docs)
2. **Task 5: Plan metadata and summary closeout** - pending in this summary commit

## Verification

- Template and rendered instruction files contain `/oto-quick` and no longer contain the old workflow-enforcement heading.
- Rendered files still contain the structural `GSD:workflow-*` markers.
- `decisions/ADR-01-state-root.md` contains the Phase 13 forward note and only additive changes.
- Active `.oto/` citations were verified in `STATE.md` and `ROADMAP.md`.
- Remaining `.planning/` mentions in `.oto/STATE.md` are historical or resolver-contract references.
- Frozen-surface grep confirmed no protected CJS, SDK, upstream, fixture, or rename-map files were touched.

## Files Created/Modified

- `oto/templates/instruction-file.md` - Source enforcement block now says OTO and lists `/oto-*`.
- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` - Re-rendered runtime instruction files.
- `decisions/ADR-01-state-root.md` - Added Phase 13 forward note.
- `.oto/STATE.md`, `.oto/ROADMAP.md`, `.oto/PROJECT.md`, `.oto/MILESTONES.md` - Active path citations now point at `.oto/`.
- `.oto/phases/13-dogfood-migration-to-oto/13-03-SUMMARY.md` - Plan completion summary.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as specified.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

Git index writes continued to require elevated execution in this sandbox. Staging and commit operations succeeded after approval.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 13-04 can now run live `.oto/` probes and add a regression guard against stale `.planning/` assumptions.

---
*Phase: 13-dogfood-migration-to-oto*
*Completed: 2026-05-26*
