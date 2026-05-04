---
phase: 09-upstream-sync-pipeline
plan: 03
subsystem: tooling
tags: [git-merge-file, conflict-surfacing, allowlist, reports]
requires:
  - phase: 09-upstream-sync-pipeline
    provides: 09-01 fixtures and allowlist
provides:
  - Shared `sync-merge` helper for 3-way merge orchestration
  - Conflict sidecar YAML header generation
  - REPORT.md and BREAKING-CHANGES append helpers
  - Real tests for merge, add/delete, and allowlist behavior
affects: [phase-09, scripts/sync-upstream, sync-cli]
tech-stack:
  added: []
  patterns: [git merge-file delegation, target_path based merge lookup, path-safe sidecar writes]
key-files:
  created:
    - bin/lib/sync-merge.cjs
  modified:
    - tests/phase-09-merge-3way.test.cjs
    - tests/phase-09-merge-add-delete.test.cjs
    - tests/phase-09-allowlist.test.cjs
key-decisions:
  - "Writes into an output root named `oto` strip a leading inventory `oto/` target segment to avoid `oto/oto/...` paths."
  - "The foundation-frameworks allowlist glob is honored when tests point mergeAll at a foundation-frameworks subtree."
patterns-established:
  - "Conflict sidecars are generated from oto-owned YAML headers plus merge-file output."
  - "Unknown upstream additions fail loud through `unclassifiedAdds` and non-zero exitCode."
requirements-completed: [SYN-04, SYN-06, SYN-07]
duration: 24min
completed: 2026-05-04
---

# Phase 09 Plan 03 Summary

**3-way upstream merge orchestration now delegates to `git merge-file -p`, emits path-safe conflict sidecars, writes sync reports, and enforces allowlist/inventory drift rules.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-04T18:24:00Z
- **Completed:** 2026-05-04T18:48:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented `bin/lib/sync-merge.cjs` with `mergeOneFile`, `mergeAll`, allowlist glob matching, binary detection, YAML headers, path traversal guards, reports, and breaking-change append support.
- Replaced merge/add/delete/allowlist TODOs with 15 real tests.
- Verified Pitfall 1, Pitfall 4, Pitfall 6, D-10, D-11, D-12, D-13, D-16, and D-17 behaviors.

## Task Commits

1. **Task 1: Implement sync-merge library** - `bf8a55b`
2. **Task 2: Fill merge tests** - `8b27791`

## Files Created/Modified

- `bin/lib/sync-merge.cjs` - Shared merge/report/sidecar helper.
- `tests/phase-09-merge-3way.test.cjs` - Real assertions for clean merge, same-line conflict, labels, binary, missing-input behavior, and headers.
- `tests/phase-09-merge-add-delete.test.cjs` - Real assertions for add/delete sidecars, fail-loud unknown additions, suffix conventions, and target_path lookup.
- `tests/phase-09-allowlist.test.cjs` - Real assertions for glob matching and foundation-frameworks allowlist completeness.

## Decisions Made

- `mergeAll` resolves rebranded snapshots by `target_path`, not upstream `path`, matching the Phase 2 rebrand output contract.
- When `otoDir` itself is the `oto/` root, output writes strip the leading `oto/` segment from inventory target paths. Conflict sidecars keep the full `target_path`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Prevented `oto/oto/...` writes**
- **Found during:** Task 1 (mergeAll output path handling)
- **Issue:** The plan used `otoDir` as the `oto/` root but also joined full `target_path` values like `oto/workflows/x.md`, which would write under `oto/oto/...`.
- **Fix:** Added `stripOtoPrefixForOtoRoot()` for output writes while preserving full sidecar paths.
- **Files modified:** `bin/lib/sync-merge.cjs`
- **Verification:** Add/delete tests use `otoDir` named `oto` and pass.
- **Committed in:** `bf8a55b`

**2. [Rule 2 - Missing Critical] Honored foundation-frameworks allowlist during subtree tests**
- **Found during:** Task 2 (Pitfall 7 completeness test)
- **Issue:** The D-16 allowlist contains `foundation-frameworks/**`, but the test passes a nested foundation subtree as the root, so relative paths do not include the prefix.
- **Fix:** `matchAllowlist` also evaluates `foundation-frameworks/${relPath}` when the scanned root is under `foundation-frameworks/`.
- **Files modified:** `bin/lib/sync-merge.cjs`, `tests/phase-09-allowlist.test.cjs`
- **Verification:** Foundation allowlist completeness test passes with zero unclassified adds.
- **Committed in:** `bf8a55b`, `8b27791`

---

**Total deviations:** 2 auto-fixed (Rule 2).
**Impact on plan:** Both fixes preserve the phase intent and prevent incorrect path handling.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- Module smoke command for exported functions, binary detection, glob matching, and YAML headers passed.
- `node --test --test-concurrency=4 tests/phase-09-merge-3way.test.cjs tests/phase-09-merge-add-delete.test.cjs tests/phase-09-allowlist.test.cjs` passed: 15 pass, 0 fail.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed: 26 pass, 17 todo, 0 fail.

## Next Phase Readiness

Plan 09-05 can wire `scripts/sync-upstream/merge.cjs` directly to `mergeAll`, `writeReport`, and `appendBreakingChanges`.

## Self-Check: PASSED

All 09-03 acceptance checks were run, and unrelated dirty files were not staged or committed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
