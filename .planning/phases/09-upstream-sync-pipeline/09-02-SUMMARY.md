---
phase: 09-upstream-sync-pipeline
plan: 02
subsystem: tooling
tags: [git, upstream-sync, puller, node-test]
requires:
  - phase: 09-upstream-sync-pipeline
    provides: 09-01 scaffolds, fixtures, and pin-record schema
provides:
  - Shared `pullUpstream` helper for GSD and Superpowers pull scripts
  - Offline puller tests for tag, branch, SHA, rotation, schema validation, and dedup
affects: [phase-09, scripts/sync-upstream, sync-cli]
tech-stack:
  added: []
  patterns: [spawnSync git wrapper, schema-validated pin records, temp bare-repo pull tests]
key-files:
  created:
    - bin/lib/sync-pull.cjs
  modified:
    - tests/phase-09-pull-puller.test.cjs
key-decisions:
  - "Ref validation rejects the plan regex failures and also rejects refs beginning with '-' to avoid git option-shaped refs."
patterns-established:
  - "Pull helpers return structured pin records validated before disk writes."
  - "Repeated pulls short-circuit when ls-remote resolves to the already-synced SHA and current/ still exists."
requirements-completed: [SYN-01, SYN-02, SYN-05]
duration: 19min
completed: 2026-05-04
---

# Phase 09 Plan 02 Summary

**Shared upstream pull helper with git version checks, ref validation, snapshot rotation, SHA fallback, branch drift warnings, dedup short-circuiting, and schema-validated pin records.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-04T18:05:00Z
- **Completed:** 2026-05-04T18:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Implemented `bin/lib/sync-pull.cjs` with `pullUpstream`, `classifyRef`, `resolveSha`, `validateRef`, and `assertGitVersion`.
- Replaced puller scaffold TODOs with 11 real offline tests against the Phase 9 bare-repo fixture.
- Verified tag clones use shallow `--depth 1 --branch`, SHA refs use full clone + checkout, and repeated refs short-circuit without rotating snapshots.

## Task Commits

1. **Task 1: Implement sync-pull library** - `182c54b`
2. **Task 2: Fill puller tests** - `5ede36e`

## Files Created/Modified

- `bin/lib/sync-pull.cjs` - Shared pull helper over `git clone`, `git ls-remote`, `git checkout`, and `git rev-parse`.
- `tests/phase-09-pull-puller.test.cjs` - Real node:test assertions for SYN-01, SYN-02, SYN-05, Pitfall 10, Pitfall 12, and ref validation.

## Decisions Made

- Added an extra `ref.startsWith('-')` rejection in `validateRef`. The plan-required regex already rejects `--upload-pack=evil` because of `=`, but rejecting leading hyphens closes the broader option-shaped-ref boundary without changing accepted tag/branch/SHA refs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Rejected leading-hyphen refs**
- **Found during:** Task 1 (ref validation)
- **Issue:** The stated regex rejects the explicit `--upload-pack=evil` case, but plain option-shaped refs like `--foo` would still pass.
- **Fix:** `validateRef` now rejects strings that start with `-`.
- **Files modified:** `bin/lib/sync-pull.cjs`
- **Verification:** Module smoke command and puller tests passed.
- **Committed in:** `182c54b`

---

**Total deviations:** 1 auto-fixed (Rule 2).
**Impact on plan:** Tightened the existing trust boundary; no new feature scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- Module smoke command for all five exports passed.
- `node --test --test-concurrency=4 tests/phase-09-pull-puller.test.cjs` passed: 11 pass, 0 fail, 0 todo.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed: 11 pass, 31 todo, 0 fail.

## Next Phase Readiness

Wave 2 pull scripts can delegate directly to `pullUpstream`; 09-05 may extend the pin behavior with `prior-last-synced-commit.json` without changing the existing pull contract.

## Self-Check: PASSED

All 09-02 acceptance checks were run, and only `bin/lib/sync-pull.cjs` plus the puller test file changed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
