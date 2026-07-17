---
phase: 16-agent-guidance-hardening
plan: 02
subsystem: runtime-config
tags: [secrets, agent-skills, cjs, workflow, tdd]

requires:
  - phase: 15-mcp-registration
    provides: canonical detectKeySource availability semantics
provides:
  - CJS init availability booleans backed by usable key-source detection
  - JSON-array agent_skills persistence guidance with per-name validation
  - read-time recovery for legacy comma-joined agent skill strings
  - regression coverage for availability and multi-skill injection
affects: [agent-guidance, settings-integrations, init-context, runtime-sync]

tech-stack:
  added: []
  patterns:
    - detectKeySource is the sole integration availability gate
    - agent skill lists persist as JSON arrays and normalize legacy comma strings before validation

key-files:
  created:
    - tests/16-availability-coherence.test.cjs
    - tests/16-agent-skills-array.test.cjs
  modified:
    - oto/bin/lib/init.cjs
    - oto/workflows/settings-integrations.md

key-decisions:
  - "Use detectKeySource for all cmdInitNewProject integration availability booleans."
  - "Persist agent_skills as validated JSON arrays while splitting legacy comma strings at read time."

patterns-established:
  - "Availability coherence: agent-facing booleans reflect usable keys, not filesystem existence."
  - "Legacy list healing: normalize split and trim first, then retain existing per-entry security validation."

requirements-completed: [HARD-01]

duration: 4min
completed: 2026-07-17
---

# Phase 16 Plan 02: Availability and Agent-Skills Coherence Summary

**Usable-key detection now governs CJS init availability, while validated JSON agent-skill arrays inject multiple skills and legacy comma strings self-heal safely.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-17T17:35:10Z
- **Completed:** 2026-07-17T17:39:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced bare environment/file-existence integration checks with `detectKeySource`, so empty and whitespace-only keyfiles cannot advertise a dead tool.
- Changed `/oto-settings-integrations` guidance to validate every skill name and persist `agent_skills` as a real JSON array.
- Added read-time split/trim recovery for legacy comma-joined skill strings without bypassing existing path, slug, symlink, or existence validation.
- Synced the workflow byte-for-byte to installed Claude and Codex roots; Gemini had no OTO install and was skipped.

## Task Commits

Each TDD task was committed as a RED test followed by its GREEN implementation:

1. **Task 1 RED: availability-coherence fixtures** - `f941517` (test)
2. **Task 1 GREEN: detectKeySource availability alignment** - `b01d1d9` (feat)
3. **Task 2 RED: agent-skills array end-to-end coverage** - `cbde100` (test)
4. **Task 2 GREEN: JSON-array persistence and legacy self-heal** - `ee0317a` (feat)

## Files Created/Modified

- `tests/16-availability-coherence.test.cjs` - Covers absent, empty, whitespace, valid-keyfile, and environment-key availability states.
- `tests/16-agent-skills-array.test.cjs` - Covers array injection, legacy comma splitting, whitespace trimming, and workflow persistence shape.
- `oto/bin/lib/init.cjs` - Uses canonical key-source detection and normalizes legacy agent skill lists.
- `oto/workflows/settings-integrations.md` - Validates every skill name and writes a JSON array.

## Decisions Made

- Reused `detectKeySource` rather than duplicating env/keyfile usability rules, preserving the Phase 15 D-15 decision.
- Kept all existing per-entry consumer validation after comma splitting so legacy recovery does not widen accepted paths.
- Required all workflow entries to validate successfully before any JSON-array write; partial lists are never persisted.

## TDD Evidence

- **Task 1 RED:** 3/5 controls passed; empty and whitespace-only keyfile cases failed with `true !== false` before production changes.
- **Task 1 GREEN:** 5/5 availability tests and 8/8 existing new-project tests passed.
- **Task 2 RED:** array input passed; both comma-string cases and the workflow contract failed before production changes.
- **Task 2 GREEN:** 4/4 agent-skills tests and 12/12 existing workflow contract tests passed.

## Verification

- New suites: 9/9 passed.
- Shared-file regression suites: 20/20 passed.
- `node scripts/check-runtime-sync.cjs`: Claude OK, Codex OK, Gemini skipped because no OTO install exists.
- Textual acceptance checks and installed-runtime byte diffs passed.
- The SDK new-project mirror already used `detectKeySource`; no SDK change was required by this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Two initial ad hoc textual-check commands had shell/JavaScript quoting errors. They did not change project files; the checks were replaced with a clean `set -e` verification command, which passed in full.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HARD-01 CJS availability and WR-04 agent-skills coherence work are ready for phase-level verification.
- Ready for the remaining Phase 16 plans; no blockers from plan 16-02.

## Self-Check: PASSED

- All four created/modified plan artifacts and this summary exist.
- Both RED commits and both GREEN commits resolve in git history in the required order.
- No tracked files were deleted by any task commit.

---
*Phase: 16-agent-guidance-hardening*
*Completed: 2026-07-17*
