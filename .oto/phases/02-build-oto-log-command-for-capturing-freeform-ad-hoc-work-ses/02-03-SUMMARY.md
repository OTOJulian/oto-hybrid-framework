---
phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses
plan: 03
subsystem: command-surface
tags: [oto-log, cli, command-markdown, workflows, node-test]

requires:
  - phase: 02-01
    provides: oto-log RED tests and fixtures
  - phase: 02-02
    provides: oto log library implementation in oto/bin/lib/log.cjs
provides:
  - /oto-log command markdown with six-section evidence-drafted body guardrails
  - Internal oto-tools and public oto log CLI dispatch
  - Recent Activity and resume surfaces for durable log entries
  - Active-session gitignore exclusion
  - Generated command index and runtime matrix rows for /oto-log
affects: [oto-log, oto-tools, installer, progress, resume-project, command-index, runtime-matrix]

tech-stack:
  added: []
  patterns: [thin CJS dispatch, command markdown body drafting, generated documentation refresh]

key-files:
  created:
    - oto/commands/oto/log.md
    - .planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-03-SUMMARY.md
  modified:
    - bin/install.js
    - oto/bin/lib/oto-tools.cjs
    - oto/bin/lib/log.cjs
    - .gitignore
    - oto/workflows/progress.md
    - oto/workflows/resume-project.md
    - oto/commands/INDEX.md
    - decisions/runtime-tool-matrix.md

key-decisions:
  - "Used the existing per-runtime command scanning path instead of adding installer adapter logic."
  - "Kept the user-facing promotion surface to quick and todo only; formal phase-plan promotion remains unsupported."
  - "Documented Codex parity through its generated skill surface at skills/oto-log/SKILL.md."

patterns-established:
  - "User-facing command markdown drafts rich log bodies; the CJS library remains responsible for persistence, evidence capture, listing, showing, and promotion."
  - "Workflow status surfaces combine log entries and plan summaries as Recent Activity rather than treating logs as a separate silo."

requirements-completed: [D-03, D-04, D-05, D-13, D-14, D-15, D-16, D-17, D-22]

duration: 12min
completed: 2026-05-06
---

# Phase 02 Plan 03: Log Command Surface Summary

**/oto-log is now reachable from the public CLI, runtime command surface, progress activity feed, and resume workflow.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-06T19:29:42Z
- **Completed:** 2026-05-06T19:41:16Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `oto log` dispatch to both `oto-tools` and the public installer CLI.
- Created `oto/commands/oto/log.md` with DATA_START/DATA_END guardrails and the required six-section body contract.
- Replaced `/oto-progress` Recent Work with Recent Activity that interleaves logs and summaries.
- Extended `/oto-resume-work` to detect open log sessions and show the latest log Summary.
- Added the active-session gitignore exclusion and refreshed generated command/runtime indexes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add log CLI dispatch** - `c6110c2` (feat)
2. **Task 2: Add command markdown and active-session ignore** - `9706749` (feat)
3. **Task 3: Surface log activity in workflows** - `f2ddab1` (feat)
4. **Generated artifacts: Refresh command index and runtime matrix** - `0090730` (docs)

## Files Created/Modified

- `oto/commands/oto/log.md` - Runtime command markdown for `/oto-log`, including body drafting guardrails and CLI delegation.
- `.gitignore` - Ignores `.oto/logs/.active-session.json` ephemeral session state.
- `oto/bin/lib/oto-tools.cjs` - Adds `case 'log'` dispatch to `./log.cjs`.
- `bin/install.js` - Adds public `oto log` dispatch after `migrate`.
- `oto/bin/lib/log.cjs` - Quotes frontmatter scalar refs for CLI output compatibility.
- `oto/workflows/progress.md` - Builds Recent Activity from `.oto/logs/*.md` and `.oto/phases/*/*-SUMMARY.md`.
- `oto/workflows/resume-project.md` - Detects open log sessions and extracts the newest log Summary.
- `oto/commands/INDEX.md` - Generated `/oto-log` command index row.
- `decisions/runtime-tool-matrix.md` - Generated `/oto-log` runtime parity row.
- `.planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-03-SUMMARY.md` - Execution closeout summary.

## Decisions Made

- Existing runtime installers already scan `oto/commands/oto/`, so no adapter-specific installer code was needed.
- The command markdown advertises only `quick` and `todo` promotion targets, matching the user-facing boundary for this phase.
- The Codex install smoke checks the transformed skill path, `skills/oto-log/SKILL.md`, because Codex converts command markdown into a skill surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Quoted log frontmatter scalar refs**
- **Found during:** Task 1 (log CLI dispatch)
- **Issue:** The newly reachable CLI output exposed unquoted `phase`, `diff_from`, and `diff_to` frontmatter scalars, while the committed CLI contract expected quoted YAML string values.
- **Fix:** Updated `serializedFrontmatter` in `oto/bin/lib/log.cjs` to quote those scalar string refs.
- **Files modified:** `oto/bin/lib/log.cjs`
- **Verification:** `node --test tests/log-cli.test.cjs` passed.
- **Committed in:** `c6110c2`

**2. [Rule 3 - Blocking] Refreshed generated command and runtime indexes**
- **Found during:** Plan-level `npm test`
- **Issue:** Adding `oto/commands/oto/log.md` caused expected generated artifact drift in `oto/commands/INDEX.md` and `decisions/runtime-tool-matrix.md`.
- **Fix:** Ran `node scripts/gen-commands-index.cjs` and `node scripts/render-runtime-matrix.cjs`.
- **Files modified:** `oto/commands/INDEX.md`, `decisions/runtime-tool-matrix.md`
- **Verification:** Targeted drift tests and full `npm test` passed.
- **Committed in:** `0090730`

---

**Total deviations:** 2 auto-fixed (Rule 1: 1, Rule 3: 1)
**Impact on plan:** Both fixes were required to keep the command surface and generated repo contracts green; no scope was added beyond the `/oto-log` surface.

## Issues Encountered

- The plan referenced `node scripts/run-tests.cjs`, but this repo does not have that script. I used `npm test`, the actual package test entrypoint.
- The first Codex install smoke checked a guessed command path. Codex converts this command into `skills/oto-log/SKILL.md`; rerunning the smoke against that path passed.
- `.planning/REQUIREMENTS.md` is absent for this post-v0.1.0 milestone, so requirement marking was skipped. `roadmap.update-plan-progress` could not match this phase's checkbox syntax; the `02-03-PLAN.md` roadmap checkbox was updated manually.

## Known Stubs

- `oto/bin/lib/log.cjs:572` writes `TBD` into the generated todo `## Solution` section during `promote --to todo`. This is intentional seed content for an unresolved follow-up, inherited from Plan 02-02, and does not block the `/oto-log` command surface.

## Threat Flags

None - this plan adds command dispatch and local `.oto/logs` file surfaces only. No network, auth, or new external trust boundary was introduced.

## Verification

- `node --test tests/log-cli.test.cjs` - passed 11/11
- `node --test tests/log-command-md.test.cjs` - passed 8/8
- `node --test tests/log-surfaces.test.cjs` - passed 6/6
- `node --test --test-concurrency=4 tests/log-*.test.cjs` - passed 63/63
- `node --test --test-concurrency=4 tests/migrate-*.test.cjs` - passed 26/26
- Per-runtime install pickup smoke - passed for Claude, Codex, and Gemini
- `node --test tests/phase-08-runtime-matrix-render.test.cjs tests/phase-10-commands-index-sync.test.cjs` - passed 6/6
- `npm test` - passed 525/526, skipped 1, failed 0

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 now has the tested library, user-facing command, workflow surfaces, and generated runtime documentation wired. Phase 02 is ready for validation or closeout against the broader D-01..D-22 requirement set.

## Self-Check: PASSED

- Found created files: `oto/commands/oto/log.md`, `.planning/phases/02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses/02-03-SUMMARY.md`.
- Found generated artifacts: `oto/commands/INDEX.md`, `decisions/runtime-tool-matrix.md`.
- Found commits: `c6110c2`, `9706749`, `f2ddab1`, `0090730`.
- Tracked deletion check returned no deleted files for all plan commits.

---
*Phase: 02-build-oto-log-command-for-capturing-freeform-ad-hoc-work-ses*
*Completed: 2026-05-06*
