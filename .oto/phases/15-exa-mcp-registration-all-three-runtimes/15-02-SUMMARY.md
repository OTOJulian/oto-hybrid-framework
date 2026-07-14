---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 02
subsystem: secrets
tags: [exa, keyfiles, symlinks, sdk, tdd]

requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: ADR-16 D-15 read-follow and WR-07 write-refusal contract
provides:
  - Canonical D-15 usable-key detection in both CJS and SDK paths
  - Empty, whitespace, dangling, and non-regular keyfile rejection
  - Symlink-to-regular read support without target permission mutation
  - Canonical detectKeySource gating at all known bare-existsSync defect sites
affects: [phase-15-mcp-registration, exa-launcher, runtime-registration-gates]

tech-stack:
  added: []
  patterns: [read-follow write-nofollow, canonical key-source detection, mirrored CJS-SDK behavior]

key-files:
  created:
    - tests/15-key-usability.test.cjs
  modified:
    - oto/bin/lib/secrets.cjs
    - oto/bin/lib/config.cjs
    - tests/14-keyfile-symlink.test.cjs
    - sdk/src/query/secrets.ts
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/init-complex.ts
    - sdk/src/query/secrets.test.ts
    - sdk/src/query/secrets-symlink.test.ts
    - sdk/dist/query/secrets.js
    - sdk/dist/query/config-mutation.js
    - sdk/dist/query/init-complex.js

key-decisions:
  - "Read and detection paths follow symlinks only when they resolve to regular, readable, non-empty files; symlink targets are never chmod-healed."
  - "Write paths retain lstat plus O_NOFOLLOW refusal, including migration writes through symlink destinations."
  - "Registration-related availability checks use detectKeySource rather than filesystem existence."

requirements-completed: [MCP-07]

duration: 5 min
completed: 2026-07-14
---

# Phase 15 Plan 02: D-15 Key Usability Summary

**Identical CJS and SDK key detection now follows password-manager symlinks to regular non-empty files while rejecting unusable filesystem objects and retaining WR-07 write refusal.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-14T01:12:54Z
- **Completed:** 2026-07-14T01:18:12Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Implemented D-15 in the shared CJS and SDK secret helpers with matching dangling, non-regular, empty, whitespace, and symlink-to-regular behavior.
- Replaced bare keyfile-existence gates in CJS new-project config, SDK config mutation, and SDK complex initialization with canonical `detectKeySource` results.
- Added independent RED/GREEN test cycles for both implementations and rebuilt the committed SDK distribution.
- Preserved the WR-07 `O_NOFOLLOW` write boundary, including migration behavior when a symlink destination would otherwise be rewritten.

## Task Commits

Each task was committed through an explicit TDD RED/GREEN cycle:

1. **Task 1: D-15 read-follow in CJS and config defect site**
   - `38b58f7` — RED: failing CJS D-15 usability matrix
   - `d2d56f0` — GREEN: CJS read-follow and canonical config gating
2. **Task 2: Mirror D-15 in SDK and rebuild dist**
   - `2c7f8d8` — RED: failing SDK D-15 usability matrix
   - `37de047` — GREEN: SDK read-follow, canonical gates, and rebuilt dist

## Files Created/Modified

- `tests/15-key-usability.test.cjs` — Temp-directory D-15 behavior matrix, including FIFO and WR-07 coverage.
- `oto/bin/lib/secrets.cjs` — CJS symlink-follow read semantics with unchanged write protection.
- `oto/bin/lib/config.cjs` — Canonical CJS integration-key availability checks.
- `tests/14-keyfile-symlink.test.cjs` — Updated read-side expectations while retaining write and migration refusal assertions.
- `sdk/src/query/secrets.ts` — SDK mirror of D-15.
- `sdk/src/query/config-mutation.ts` — Canonical SDK config-creation key detection.
- `sdk/src/query/init-complex.ts` — Canonical SDK initialization key detection under `~/.oto`.
- `sdk/src/query/secrets.test.ts` — Focused SDK D-15 matrix.
- `sdk/src/query/secrets-symlink.test.ts` — Updated legacy symlink regression coverage.
- `sdk/dist/query/{secrets,config-mutation,init-complex}.*` — Rebuilt SDK runtime output and source maps.

## Decisions Made

- A symlink target is usable only when `statSync` resolves it to a regular file whose trimmed content is non-empty.
- Read-follow never changes password-manager-managed target permissions; direct regular keyfiles retain Phase 14 permission healing.
- A dangling symlink emits one sanitized line and counts as no key; directories, FIFOs, sockets, and other non-regular objects follow the same no-key posture.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Regression] Updated the separate SDK Phase 14 symlink regression file**
- **Found during:** Task 2 RED verification
- **Issue:** `sdk/src/query/secrets-symlink.test.ts` still asserted the superseded Phase 14 read-side refusal behavior and would fail once D-15 landed, although it was not listed in the task's `<files>` field.
- **Fix:** Updated only the read-side expectation and made the migration fixture exercise the unchanged write-refusal path; all WR-07 write assertions remain intact.
- **Files modified:** `sdk/src/query/secrets-symlink.test.ts`
- **Verification:** Focused SDK symlink suite passes 4/4 alongside the D-15 secrets suite.
- **Commit:** `2c7f8d8`

**2. [Rule 3 - Blocking] Restored the OTO state-version marker after workflow mutations**
- **Found during:** Plan metadata update
- **Issue:** The state mutation SDK rewrote `.oto/STATE.md` from `oto_state_version` to the obsolete `gsd_state_version`, which breaks the repository's Phase 13 root guard.
- **Fix:** Restored only the workflow-owned frontmatter marker after all SDK state mutations completed.
- **Files modified:** `.oto/STATE.md`
- **Verification:** The final root suite includes and passes the Phase 13 `oto_state_version` guard.
- **Commit:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (1 regression test alignment, 1 blocking workflow-state correction).  
**Impact:** No production scope expansion; the changes keep existing coverage truthful and preserve the repository's OTO state contract.

## Issues Encountered

None.

## TDD Gate Compliance

- CJS RED failed on symlink-to-regular and dangling-symlink behavior before implementation; GREEN passed the focused matrix and all Phase 14 CJS regressions.
- SDK RED failed on the same read-follow behaviors before implementation; GREEN passed typecheck and both focused Vitest suites.
- Git history contains a RED test commit before each corresponding GREEN feature commit.

## Verification

- `node --test tests/15-key-usability.test.cjs tests/14-keyfile-symlink.test.cjs tests/14-secrets-keyfile.test.cjs` — 24/24 passed.
- `node --test tests/14-*.test.cjs` — 100/100 passed.
- `cd sdk && npx tsc --noEmit` — passed.
- `cd sdk && npx vitest run src/query/secrets.test.ts src/query/secrets-symlink.test.ts` — 23/23 passed.
- `npm test` — full root suite passed.
- SDK build completed and generated `sdk/dist/query/secrets.js` contains the D-15 `isSymbolicLink()` branch.

## User Setup Required

None - no external credentials or service configuration are required for this plan.

## Next Phase Readiness

- D-15 is now available for Plan 15-03's launcher implementation and later registration gates.
- Ready for `15-03-PLAN.md` with no plan-specific blockers.

## Self-Check: PASSED

- Declared implementation and test artifacts exist.
- All four `15-02` RED/GREEN commits are present in repository history.
- Task acceptance criteria and plan-level verification commands pass.

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
