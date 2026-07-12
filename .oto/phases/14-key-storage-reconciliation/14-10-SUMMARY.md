---
phase: 14-key-storage-reconciliation
plan: 10
subsystem: security
tags: [config-loader, credential-migration, commonjs, node-test, tdd]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation (plan 07)
    provides: CJS legacy-key migration and boolean-only loadConfig integration values
provides:
  - Pristine on-disk config data throughout loadConfig dirty-write migrations
  - In-memory-only scrubbing of legacy integration strings after disk write-backs
  - Regression coverage for failed and successful migration across depth and sub_repos write paths
affects: [phase-14-verification, key-storage-reconciliation, phase-15-mcp-registration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate disk-write config objects from security-scrubbed effective config views"
    - "Credential-survival regression tests combine failed migration with independent loader write-backs"

key-files:
  created:
    - tests/14-loader-credential-survival.test.cjs
  modified:
    - oto/bin/lib/core.cjs

key-decisions:
  - "Keep fileData pristine for every loadConfig disk write and scrub only a fresh effective config object"
  - "Use a shallow copy in the non-workstream branch because integration scrubbing changes only top-level flags"

patterns-established:
  - "Fail-closed loader persistence: failed secret migration may hide a string in memory but must preserve it on disk"

requirements-completed: [SECR-01, SECR-03]

# Metrics
duration: 3min
completed: 2026-07-12
---

# Phase 14 Plan 10: Loader Credential-Survival Gap Closure Summary

**loadConfig now preserves legacy credentials through failed migrations and unrelated dirty writes while retaining boolean-only in-memory integration values.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-12T01:44:51Z
- **Completed:** 2026-07-12T01:47:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Kept the parsed on-disk `fileData` object unsanitized so depth, multiRepo, and sub_repos migration writes cannot destroy a credential after keyfile migration fails.
- Moved integration-string scrubbing to the merged effective config after all disk writes, preserving the boolean-only loader contract in root and workstream modes.
- Added three real-process regressions covering failed depth write-back, successful 0600 keyfile healing, and failed sub_repos write-back.

## Task Commits

Each task was committed atomically. The test commit intentionally precedes the production fix to preserve the TDD RED gate.

1. **Task 2: Credential-survival regression suite (RED)** - `5c1386b` (test)
2. **Task 1: Pristine disk-write data and effective-view scrub (GREEN)** - `48a1b3a` (fix)

## Files Created/Modified

- `tests/14-loader-credential-survival.test.cjs` - Spawns the real CJS loader under isolated project/HOME fixtures and pins three migration/write-back outcomes.
- `oto/bin/lib/core.cjs` - Keeps `fileData` pristine and sanitizes only the fresh merged or copied effective config.

## Decisions Made

- Followed the reviewed gap patch exactly: the workstream merge already returns a fresh object; the flat branch uses `{ ...fileData }` before the top-level scrub.
- Ran the regression test before production edits even though the plan lists the implementation task first, because Task 1 is explicitly TDD-gated.

## TDD Gate Compliance

- **RED:** `node --test tests/14-loader-credential-survival.test.cjs` failed 2/3 cases against the untouched loader because persisted `exa_search` was `true` instead of the original credential string; the happy path passed.
- **GREEN:** After the minimal two-site loader edit, the same suite passed 3/3 and the existing migration-hardening suite passed 9/9.
- **REFACTOR:** Not needed; the production diff is the exact minimal patch specified by the plan.

## Deviations from Plan

None - plan executed exactly as written. TDD-required test-first ordering changed commit chronology only, not task scope or outcomes.

## Issues Encountered

- The first full Phase 14 run reported 44 passes and 5 startup failures because the fresh git worktree did not contain ignored `node_modules`; `sdk/dist/ws-transport.js` could not resolve the lockfile-declared `ws` dependency. `npm ci --ignore-scripts` hydrated the isolated worktree without changing tracked files, the previously failing workflow-contract suite then passed 7/7, and the full suite passed 49/49.

## User Setup Required

None - no external service configuration required.

## Verification Evidence

- `node --test tests/14-loader-credential-survival.test.cjs && node --test tests/14-migration-hardening.test.cjs` - 3/3 and 9/9 pass.
- `node --test tests/14-*.test.cjs` - 49/49 pass, 0 failures.
- `_scrubIntegrationStrings(JSON.parse(raw))` count - 1, the root-only read path.
- `const fileData = JSON.parse(raw);` - exactly one match.
- Effective-view scrub assignment - exactly one single-line match after all dirty writes.
- Scrub call-site trace - exactly two runtime call sites: root parse and effective merged view.

## Next Phase Readiness

- Gap 1 from the re-verification report is closed and ready for independent re-verification.
- Plans 14-11 and 14-12 can proceed with the remaining SDK fallback and CJS config-get gaps.

## Self-Check: PASSED

- `oto/bin/lib/core.cjs` - FOUND
- `tests/14-loader-credential-survival.test.cjs` - FOUND (103 lines)
- Commit `5c1386b` - FOUND
- Commit `48a1b3a` - FOUND
- `.oto/STATE.md` and `.oto/ROADMAP.md` - UNCHANGED

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-12*
