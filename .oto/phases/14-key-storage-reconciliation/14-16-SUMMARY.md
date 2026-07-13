---
phase: 14-key-storage-reconciliation
plan: 16
subsystem: config-loading
tags: [config-loader, sdk, vitest, secret-hygiene, workstreams]

requires:
  - phase: 14-key-storage-reconciliation
    provides: boolean-only integration config and best-effort legacy migration foundations
provides:
  - two-run union baseline for the terminal full-SDK regression gate
  - boolean-only effective loader views under migration failure in CJS and SDK
  - SDK root-to-workstream config inheritance matching CJS semantics
  - side-effect-free SDK CLI module imports
affects: [14-19-terminal-gate, sdk-config, workstream-config, cli-tests]

tech-stack:
  added: []
  patterns: [two-run union failure baseline, root-under-overlay deep merge, ESM direct-entry guard]

key-files:
  created:
    - .oto/phases/14-key-storage-reconciliation/14-SDK-BASELINE.txt
    - tests/14-loader-scrub.test.cjs
    - sdk/src/config-loader-parity.test.ts
  modified:
    - oto/bin/lib/core.cjs
    - sdk/src/config.ts
    - sdk/src/cli.ts
    - sdk/src/cli.test.ts

key-decisions:
  - "The terminal SDK gate compares against the union of two untouched-tree runs using each file's maximum failure count."
  - "Root and workstream configs are scrubbed independently before the SDK deep-merges root beneath workstream overrides."
  - "sdk/src/cli.ts invokes main only when its module URL matches process.argv[1]."

patterns-established:
  - "Effective-view scrub: every present non-boolean integration flag becomes Boolean(value) without mutating disk-backed parse objects."
  - "Workstream layering: root config is the base, workstream config is the recursive overlay, and hardcoded defaults are applied last."

requirements-completed: [SECR-01, SECR-04]

duration: 10 min
completed: 2026-07-13
---

# Phase 14 Plan 16: SDK Baseline and Loader Parity Summary

**A flake-tolerant SDK failure baseline, boolean-only loader safety boundaries, root-aware workstream config loading, and import-safe SDK CLI entry behavior**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-13T00:49:54Z
- **Completed:** 2026-07-13T00:59:48Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Captured two consecutive untouched-tree full SDK runs. Both reported 41 failed files and 268 failed tests; the committed union records per-file maximum counts, both raw tails, and no observed drift between these two runs.
- Added forced-migration-failure regressions and hardened both effective-view scrubbers so objects, numbers, nulls, arrays, non-empty strings, and empty strings cannot escape the loaders' boolean contract.
- Matched SDK workstream loading to CJS by deep-merging scrubbed root config beneath scrubbed workstream overrides, while preserving missing-workstream fallback behavior.
- Guarded CLI auto-execution with an ESM direct-entry check, eliminating import-time argv parsing, usage noise, and process.exitCode pollution.

## Task Commits

Each task was committed atomically, with TDD tasks split into RED and GREEN commits:

1. **Task 1: Capture two-run union SDK baseline** - `4a47758` (test)
2. **Task 2 RED: Add loader scrub regressions** - `ebe72a2` (test)
3. **Task 2 GREEN: Normalize both loader effective views** - `4a3b507` (fix)
4. **Task 3 RED: Add workstream and CLI import regressions** - `32b8a8c` (test)
5. **Task 3 GREEN: Merge root config and guard CLI entry** - `db1943b` (fix)

## Files Created/Modified

- `.oto/phases/14-key-storage-reconciliation/14-SDK-BASELINE.txt` - Two full-suite summaries, union failure counts, drift classification, and raw tails from the pre-edit tree.
- `tests/14-loader-scrub.test.cjs` - CJS forced-failure coverage for every integration-value shape plus disk-byte preservation.
- `sdk/src/config-loader-parity.test.ts` - SDK scrub and root-to-workstream inheritance parity coverage.
- `oto/bin/lib/core.cjs` - Normalizes every present non-boolean integration value on the effective view.
- `sdk/src/config.ts` - Mirrors the scrub contract and CJS root-under-workstream deep merge.
- `sdk/src/cli.ts` - Runs `main()` only for direct CLI entry.
- `sdk/src/cli.test.ts` - Pins side-effect-free module imports.

## Decisions Made

- Used the two-run union and per-file maximum as the authoritative baseline because a single run can under-capture known SDK flake drift.
- Kept scrub normalization strictly in memory; config source bytes remain authoritative and unchanged when migration cannot rewrite them.
- Applied hardcoded defaults only after root/workstream layering so explicit root settings are not silently replaced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made the forced-migration-failure fixture actually block both atomic-write paths**
- **Found during:** Task 2 RED fixture setup
- **Issue:** Directory mode `0o555` blocks temp-file creation and rename, but POSIX still permits the migration helper's direct-write fallback to overwrite an existing writable config file.
- **Fix:** The fixtures also set the config file to `0o444`, then restore both file and directory permissions before cleanup. This preserves the plan's `0o555` seam while ensuring the intended failure path is exercised.
- **Files modified:** `tests/14-loader-scrub.test.cjs`, `sdk/src/config-loader-parity.test.ts`
- **Verification:** RED tests exposed the old scrubber values; GREEN tests proved disk bytes remained identical and effective views became booleans.
- **Committed in:** `ebe72a2`, `32b8a8c`

---

**Total deviations:** 1 auto-fixed (1 blocking fixture correction).
**Impact on plan:** The correction strengthens the planned regression seam without changing production scope or behavior.

## Issues Encountered

- The patch helper initially resolved an uncommitted baseline artifact against the primary checkout. It was removed immediately and recreated in the isolated worktree before any production edit; no primary-checkout tracked file was changed.
- Pre-existing untracked `node_modules/` and `sdk/node_modules/` directories were left untouched and uncommitted.

## Verification

- `node --test tests/14-loader-scrub.test.cjs tests/14-loader-credential-survival.test.cjs tests/14-migration-hardening.test.cjs` - 19/19 passed.
- `cd sdk && npx vitest run src/config-loader-parity.test.ts src/config.test.ts src/cli.test.ts` - 77/77 passed across 3 files, with no CLI `Usage` error block.
- `cd sdk && npx tsc --noEmit` - passed.
- Real wrapper smoke from a temporary cwd: `node bin/oto-sdk.js query config-path` - exited 0 and printed the temporary `.oto/config.json` path.
- `sdk/dist` remained unchanged as required; its rebuild stays assigned to Plan 14-19.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 14-19 can consume `14-SDK-BASELINE.txt` for its no-new-persistent-failures terminal comparison.
- Source fixes and regression suites are ready to merge with the other Wave 1 gap-closure worktrees.
- No changes were made to `.oto/STATE.md`, `.oto/ROADMAP.md`, or `sdk/dist`; the orchestrator and Plan 14-19 retain ownership of those artifacts.

## Self-Check: PASSED

- All seven planned code/test/baseline artifacts and this summary exist.
- All five task/TDD commits resolve on `codex/phase14-16` and contain no tracked-file deletions.
- Task acceptance criteria and plan-level verification commands passed after implementation.
- Stub scan found no newly added placeholder implementation, and all changed trust-boundary surfaces are covered by the plan threat model.
- `.oto/STATE.md`, `.oto/ROADMAP.md`, and `sdk/dist` are unchanged from the required base.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
