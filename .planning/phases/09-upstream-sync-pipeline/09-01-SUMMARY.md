---
phase: 09-upstream-sync-pipeline
plan: 01
subsystem: testing
tags: [node-test, upstream-sync, fixtures, schemas]
requires:
  - phase: 08-codex-gemini-runtime-parity
    provides: runtime parity files that must be sync-allowlisted
provides:
  - Phase 9 node:test scaffolds for all upstream sync behaviors
  - Offline bare-repo upstream fixture builder
  - Sync allowlist and pin-record schemas
  - Initial upstream breaking-change audit logs
affects: [phase-09, upstream-sync, ci]
tech-stack:
  added: []
  patterns: [node:test TODO scaffolds, file:// bare git fixtures, hand-rolled schema validation]
key-files:
  created:
    - tests/phase-09-pull-puller.test.cjs
    - tests/phase-09-rebrand-sync.test.cjs
    - tests/phase-09-merge-3way.test.cjs
    - tests/phase-09-merge-add-delete.test.cjs
    - tests/phase-09-allowlist.test.cjs
    - tests/phase-09-accept-helper.test.cjs
    - tests/phase-09-report.test.cjs
    - tests/phase-09-cli.integration.test.cjs
    - tests/fixtures/phase-09/build-bare-upstream.cjs
    - decisions/sync-allowlist.json
    - schema/sync-allowlist.json
    - schema/last-synced-commit.json
    - .oto-sync/BREAKING-CHANGES-gsd.md
    - .oto-sync/BREAKING-CHANGES-superpowers.md
  modified:
    - .gitignore
    - .planning/phases/09-upstream-sync-pipeline/09-VALIDATION.md
key-decisions:
  - "Kept the full D-16 allowlist block from 09-CONTEXT.md and appended bin/lib/sync-cli.cjs, yielding 35 globs; the plan's 33-count note was stale against the actual context block."
patterns-established:
  - "Phase 9 tests start as node:test TODO scaffolds that downstream plans replace in place."
  - "Offline sync tests use file:// bare git fixtures so depth-clone behavior is exercised without network access."
requirements-completed: [SYN-01, SYN-02, SYN-03, SYN-04, SYN-05, SYN-06, SYN-07]
duration: 24min
completed: 2026-05-04
---

# Phase 09 Plan 01 Summary

**Upstream sync validation scaffolds, offline git fixtures, schemas, allowlist metadata, and audit-log seeds are in place for the remaining Phase 9 implementation waves.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-04T17:41:20Z
- **Completed:** 2026-05-04T18:05:00Z
- **Tasks:** 3
- **Files modified:** 24

## Accomplishments

- Added `sync-allowlist` and `last-synced-commit` schemas plus committed upstream audit-log seed files.
- Added a reusable `file://` bare-repo fixture builder with three tagged commits.
- Created all eight Phase 9 `node:test` scaffold files, with 41 TODO tests mapped to the validation rows.
- Marked `09-VALIDATION.md` as Nyquist-compliant after the scaffolds existed.

## Task Commits

1. **Task 1: Schemas, allowlist, audit logs, ignore rules** - `a42f14c`
2. **Task 2: Offline upstream fixtures** - `4c0bbd3`
3. **Task 3: Validation scaffolds** - `f5239ab`

## Files Created/Modified

- `schema/sync-allowlist.json` - Schema for `decisions/sync-allowlist.json`.
- `schema/last-synced-commit.json` - Schema for per-upstream pin records.
- `decisions/sync-allowlist.json` - Oto-owned path globs for sync exclusion.
- `.oto-sync/BREAKING-CHANGES-gsd.md` - Initial GSD sync audit log.
- `.oto-sync/BREAKING-CHANGES-superpowers.md` - Initial Superpowers sync audit log.
- `tests/fixtures/phase-09/` - Bare upstream builder plus merge trios and sample JSON fixtures.
- `tests/phase-09-*.test.cjs` - Eight TODO scaffold files covering 41 validation behaviors.
- `.gitignore` - Ignores sync working snapshot/conflict directories.
- `.planning/phases/09-upstream-sync-pipeline/09-VALIDATION.md` - `nyquist_compliant: true`.

## Decisions Made

- Preserved all 34 globs present in the actual D-16 context block and appended `bin/lib/sync-cli.cjs`, for 35 total allowlist entries. This protects Phase 8 generated/runtime artifacts and `foundation-frameworks/**`; the plan's "33 entries" count was inconsistent with its own copied block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Corrected allowlist count against source context**
- **Found during:** Task 1 (allowlist creation)
- **Issue:** The plan text said 32 D-16 entries plus `sync-cli` equals 33, but the copied D-16 block contains 34 entries before `sync-cli`.
- **Fix:** Used the concrete D-16 list as source of truth and added `bin/lib/sync-cli.cjs`.
- **Files modified:** `decisions/sync-allowlist.json`
- **Verification:** `node -e` confirmed 35 globs and schema validation passed.
- **Committed in:** `a42f14c`

---

**Total deviations:** 1 auto-fixed (Rule 2).
**Impact on plan:** The allowlist is broader only where the locked context already required it; no implementation scope was added.

## Issues Encountered

- The first executor spawn did not produce main-worktree artifacts, so the plan was executed inline. No code from that attempt was present to clean up.

## User Setup Required

None - no external service configuration required.

## Verification

- `node -e "const s=require('./scripts/rebrand/lib/validate-schema.cjs'); ..."` for `decisions/sync-allowlist.json` passed.
- Bare-repo builder verification printed `OK [ 'v1.0.0', 'v1.1.0', 'v1.2.0' ]`.
- `node --test --test-concurrency=4 tests/phase-09-*.test.cjs` passed with `# fail 0` and `# todo 41`.
- `git merge-file -p` clean trio check returned merged content.

## Next Phase Readiness

Plans 09-02, 09-03, 09-04 can now replace the scaffold TODO tests in place and consume the shared fixtures/schemas.

## Self-Check: PASSED

All planned artifacts exist, validation commands passed, and unrelated dirty files were not staged or committed.

---
*Phase: 09-upstream-sync-pipeline*
*Completed: 2026-05-04*
