---
phase: 09-upstream-sync-pipeline
plan: 05
subsystem: tooling
tags: [stage-scripts, rebrand-sync, reports, upstream-sync]
requires:
  - phase: 09-upstream-sync-pipeline
    provides: 09-02 pullUpstream helper
  - phase: 09-upstream-sync-pipeline
    provides: 09-03 merge/report helpers
provides:
  - Independent `scripts/sync-upstream/*` stage scripts
  - Prior pin preservation for 3-way merge metadata
  - Sync rebrand fidelity and report append/regeneration tests
affects: [sync-cli, package-surface]
tech-stack:
  added: []
  patterns: [thin CLI wrappers, schema-validated pin loading, tmpdir-safe tests]
key-files:
  created:
    - scripts/sync-upstream/pull-gsd.cjs
    - scripts/sync-upstream/pull-superpowers.cjs
    - scripts/sync-upstream/rebrand.cjs
    - scripts/sync-upstream/merge.cjs
  modified:
    - bin/lib/sync-pull.cjs
    - package.json
    - tests/phase-02-package-json.test.cjs
    - tests/phase-09-pull-puller.test.cjs
    - tests/phase-09-rebrand-sync.test.cjs
    - tests/phase-09-report.test.cjs
key-decisions:
  - "Added `scripts/sync-upstream/` to `package.json.files` so the global `oto sync` dispatcher can find stage scripts after GitHub install."
  - "Stage `merge.cjs` accepts optional pin-file overrides in addition to the planned rebranded-dir overrides, keeping the 09-06 dry-run/test path deterministic."
patterns-established:
  - "Sub-stage CLIs remain debuggable directly via `node scripts/sync-upstream/<stage>.cjs`."
requirements-completed: [SYN-01, SYN-02, SYN-03, SYN-04, SYN-05, SYN-06]
duration: 30min
completed: 2026-05-04
---

# Phase 09 Plan 05 Summary

**Upstream sync now has independent pull, rebrand, and merge stage scripts, plus tests proving rebrand fidelity and report audit behavior.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-04T19:04:00Z
- **Completed:** 2026-05-04T19:34:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `pull-gsd.cjs` and `pull-superpowers.cjs` as thin URL/name wrappers over `pullUpstream`.
- Added `rebrand.cjs` as the sync-specific wrapper around the Phase 2 rebrand engine.
- Added `merge.cjs` to run `mergeAll`, regenerate `REPORT.md`, and append the matching `BREAKING-CHANGES-{upstream}.md` section.
- Amended `pullUpstream` to preserve `prior-last-synced-commit.json` before writing the new pin.
- Added real tests for prior-pin preservation, byte-identical sync rebrand output, source-tree immutability, report regeneration, and breaking-changes append semantics.
- Added `scripts/sync-upstream/` to the package files allowlist.

## Task Commits

1. **Task 1: Implement sync sub-stage scripts** - `dc33901`
2. **Task 2: Fill rebrand/report tests** - `90c654c`

## Files Created/Modified

- `scripts/sync-upstream/pull-gsd.cjs` - GSD puller wrapper.
- `scripts/sync-upstream/pull-superpowers.cjs` - Superpowers puller wrapper.
- `scripts/sync-upstream/rebrand.cjs` - Sync rebrand wrapper.
- `scripts/sync-upstream/merge.cjs` - Merge/report stage orchestrator.
- `bin/lib/sync-pull.cjs` - Prior pin preservation.
- `package.json` - Package allowlist includes sync stage scripts.
- `tests/phase-02-package-json.test.cjs` - Updated package allowlist expectation.
- `tests/phase-09-pull-puller.test.cjs` - Prior-pin assertion.
- `tests/phase-09-rebrand-sync.test.cjs` - Rebrand fidelity assertions.
- `tests/phase-09-report.test.cjs` - Report/audit-log assertions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Distribution gap] Package allowlist needed sync stage scripts**
- **Found during:** Task 1 package-surface review
- **Issue:** `oto sync` will run from the installed package, so stage scripts must be included in the GitHub install package surface.
- **Fix:** Added `scripts/sync-upstream/` to `package.json.files` and updated the Phase 2 package test.
- **Committed in:** `dc33901` / `90c654c`

**2. [Dry-run support] Merge script accepts pin-file overrides**
- **Found during:** Task 1 design for 09-06 chaining
- **Issue:** Dry-run sync paths need to keep pull/rebrand/merge metadata in the same temp root without depending on persistent `.oto-sync` pins.
- **Fix:** Added optional `--pin-file` and `--prior-pin-file` flags while preserving default persistent paths.
- **Committed in:** `dc33901`

---

**Total deviations:** 2 auto-fixed.
**Impact on plan:** Keeps stage scripts installable and prepares the 09-06 dry-run path without changing the user-facing command shape.

## Verification

- `node --test --test-concurrency=4 tests/phase-09-pull-puller.test.cjs tests/phase-09-rebrand-sync.test.cjs tests/phase-09-report.test.cjs` passed: 17 pass, 0 fail.
- `node --test tests/phase-02-package-json.test.cjs` passed: 5 pass, 0 fail.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed: 38 pass, 7 todo, 0 fail.

## Next Phase Readiness

Plan 09-06 can now chain the stage scripts behind `oto sync` and remove the remaining CLI integration TODOs.

## Self-Check: PASSED

All 09-05 checks were run, and unrelated dirty files were not staged or committed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
