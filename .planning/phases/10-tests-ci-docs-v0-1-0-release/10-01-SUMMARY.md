---
phase: 10-tests-ci-docs-v0-1-0-release
plan: 01
subsystem: testing
tags: [node-test, ci, docs, hooks, command-index]

requires:
  - phase: 09-upstream-sync-pipeline
    provides: sync pipeline and rebrand fixture surface consumed by Phase 10 tests
provides:
  - Phase 10 node:test coverage surface for CI, docs, rebrand snapshots, skill gating, and command index drift
  - Generated /oto-* command index and idempotent generator
  - Active-workflow SessionStart suppression for using-oto ambient skill injection
affects: [phase-10-ci, docs, hooks, using-oto, command-index]

tech-stack:
  added: []
  patterns:
    - node:test regression files under tests/phase-10-*.test.cjs
    - generated markdown index checked by --check mode
    - SessionStart active-workflow gating based on .oto/STATE.md frontmatter status

key-files:
  created:
    - tests/phase-10-license-attribution.test.cjs
    - tests/phase-10-action-sha-pin.test.cjs
    - tests/phase-10-rebrand-snapshot.test.cjs
    - tests/phase-10-skill-auto-trigger.test.cjs
    - tests/phase-10-workflow-shape.test.cjs
    - tests/phase-10-readme-shape.test.cjs
    - tests/phase-10-docs-presence.test.cjs
    - tests/phase-10-commands-index-sync.test.cjs
    - tests/fixtures/phase-10/rebrand-snapshots/.gitkeep
    - scripts/gen-commands-index.cjs
    - oto/commands/INDEX.md
  modified:
    - oto/hooks/oto-session-start

key-decisions:
  - "Use the repo's actual Node runner (`node --test`) for recovery verification because `scripts/run-tests.cjs` is not present in this repo."
  - "Treat CI-07 as a live assertion in Phase 10 by fixing SessionStart active-workflow suppression instead of leaving the new test as a TODO."

patterns-established:
  - "Phase 10 transitional tests use t.todo only for artifacts intentionally produced by Plan 10-02."
  - "README shape remains a loud failing gate until Plan 10-02 rewrites README.md."
  - "Active .oto/STATE.md suppresses ambient using-oto skill-body injection while preserving the normal SessionStart identity block outside active workflows."

requirements-completed: [CI-04, CI-06, CI-07, CI-10, DOC-01, DOC-04, DOC-06]

duration: operator-recovered
completed: 2026-05-04
---

# Phase 10 Plan 01: Wave 0 Test Surface Summary

**Phase 10 regression surface with live license/action/skill/command checks, deferred Wave 1 shape tests, and a generated /oto-* command index**

## Performance

- **Duration:** operator-recovered after executor stall
- **Started:** 2026-05-04T20:08:51Z
- **Completed:** 2026-05-04T20:22:26Z
- **Tasks:** 3 planned tasks + 1 auto-fix deviation
- **Files modified:** 12 tracked files

## Accomplishments

- Added Phase 10 node:test files for license attribution, GitHub Action SHA pins, rebrand snapshots, SessionStart skill gating, workflow shape, README shape, docs presence, and command-index drift.
- Added `scripts/gen-commands-index.cjs` and committed `oto/commands/INDEX.md` with 76 `/oto-*` command rows.
- Fixed `oto/hooks/oto-session-start` so an active `.oto/STATE.md` suppresses the full `using-oto` skill body instead of relying on a TODO-marked CI-07 test.

## Task Commits

Each task was committed atomically:

1. **Task 1: Live Phase 10 test surface** - `a7afe1f` (`test(10-01): add live Phase 10 test surface`)
2. **Task 2: Deferred Phase 10 shape checks** - `46c4157` (`test(10-01): add deferred Phase 10 shape checks`)
3. **Task 3: Command index generator** - `e40d41d` (`feat(10-01): generate oto command index`)
4. **Auto-fix deviation: CI-07 live gating** - `9397be9` (`fix(10-01): suppress ambient skill injection during active workflows`)

**Plan metadata:** this SUMMARY and tracking commit.

## Files Created/Modified

- `tests/phase-10-license-attribution.test.cjs` - Verifies both upstream MIT license bodies and copyright lines are embedded verbatim.
- `tests/phase-10-action-sha-pin.test.cjs` - Scans workflow `uses:` references once workflows exist and rejects non-SHA external pins.
- `tests/phase-10-rebrand-snapshot.test.cjs` - Defines the D-10-07 projection shape and TODOs until Plan 10-02 seeds snapshots.
- `tests/phase-10-skill-auto-trigger.test.cjs` - Spawns `oto-session-start` with active `.oto/STATE.md` and asserts the `using-oto` body is suppressed.
- `tests/phase-10-workflow-shape.test.cjs` - TODO-gated workflow shape assertions for Plan 10-02.
- `tests/phase-10-readme-shape.test.cjs` - Loud README gate that currently fails until Plan 10-02 rewrites README.md.
- `tests/phase-10-docs-presence.test.cjs` - TODO-gated docs assertions for Plan 10-02.
- `tests/phase-10-commands-index-sync.test.cjs` - Live `scripts/gen-commands-index.cjs --check` assertion.
- `scripts/gen-commands-index.cjs` - Writes/checks `oto/commands/INDEX.md`.
- `oto/commands/INDEX.md` - Generated table of 76 `/oto-*` commands.
- `oto/hooks/oto-session-start` - Suppresses ambient `using-oto` injection while an oto workflow is active.

## Decisions Made

- Used `node --test` directly for recovery verification because `scripts/run-tests.cjs` does not exist in the repo even though the plan text referenced it.
- Fixed the SessionStart hook behavior rather than preserving a TODO in the CI-07 test, because Phase 10 is the milestone that promotes this deferred Phase 6 behavior into an enforceable regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CI-07 test was TODO-marked because runtime behavior was still wrong**
- **Found during:** Plan metadata recovery and verification after Task 3
- **Issue:** `tests/phase-10-skill-auto-trigger.test.cjs` initially reported TODO because `oto-session-start` injected the full `using-oto` body even when `.oto/STATE.md` showed an active workflow.
- **Fix:** Updated `oto/hooks/oto-session-start` to parse `.oto/STATE.md` frontmatter, detect active statuses (`execute_phase`, `plan_phase`, `debug`, `verify`), and emit a minimal workflow-active identity block instead of the full skill body.
- **Files modified:** `oto/hooks/oto-session-start`
- **Verification:** `node --test tests/phase-10-skill-auto-trigger.test.cjs tests/05-session-start.test.cjs tests/05-session-start-fixture.test.cjs` passed with 7/7 tests and no TODOs.
- **Committed in:** `9397be9`

**2. [Rule 3 - Blocking] Planned verification command referenced a missing script**
- **Found during:** Recovery verification
- **Issue:** `node scripts/run-tests.cjs ...` failed with `MODULE_NOT_FOUND` because this repo uses the package `node --test` script and has no `scripts/run-tests.cjs`.
- **Fix:** Verified with direct `node --test` invocations matching `package.json`; no source changes were required.
- **Files modified:** none
- **Verification:** Targeted Phase 10 non-README set passed; README shape failed as the plan explicitly expects until Plan 10-02.
- **Committed in:** summary metadata only

---

**Total deviations:** 2 auto-handled (1 runtime fix, 1 command substitution)
**Impact on plan:** CI-07 is stronger than the stalled executor left it; verification command drift is documented for downstream Plan 10-02 and phase verification.

## Issues Encountered

- The spawned executor completed implementation commits but stalled before writing `10-01-SUMMARY.md`; the orchestrator closed the agent and recovered metadata manually.
- `tests/phase-10-readme-shape.test.cjs` fails now by design because README still contains the `vX.Y.Z` placeholder and lacks a command-index link. Plan 10-02 owns the README rewrite that turns this gate green.

## Verification

- `node --test tests/phase-10-license-attribution.test.cjs tests/phase-10-action-sha-pin.test.cjs tests/phase-10-rebrand-snapshot.test.cjs tests/phase-10-skill-auto-trigger.test.cjs tests/phase-10-workflow-shape.test.cjs tests/phase-10-docs-presence.test.cjs tests/phase-10-commands-index-sync.test.cjs` passed: 20 tests, 6 pass, 14 TODO, 0 fail.
- `node --test tests/phase-10-readme-shape.test.cjs` failed as expected for Wave 0: missing concrete `archive/v<semver>.tar.gz` URL and `commands/INDEX.md` link.
- `node scripts/gen-commands-index.cjs --check` passed.
- `grep -c '^| \`/oto-' oto/commands/INDEX.md` returned `76`.
- `node --test tests/phase-10-skill-auto-trigger.test.cjs tests/05-session-start.test.cjs tests/05-session-start-fixture.test.cjs` passed: 7 tests, 0 TODO.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 10-02 can now build against the locked test surface. Its key responsibilities are to create workflows/docs, rewrite README.md, seed rebrand snapshots, and convert the intentional TODO/README-fail gates into live green checks.

## Self-Check: PASSED

- All Plan 10-01 output files exist.
- Task commits are present for all planned tasks plus the CI-07 deviation fix.
- The only remaining failing test is the intentional README gate assigned to Plan 10-02.
- No unrelated pre-existing Phase 4/5 dirty artifacts were staged or committed.

---
*Phase: 10-tests-ci-docs-v0-1-0-release*
*Completed: 2026-05-04*
