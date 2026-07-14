---
phase: 15-exa-mcp-registration-all-three-runtimes
plan: 12
subsystem: sdk-status
tags: [mcp, sdk, install-state, ownership, parity, fail-closed]
requires:
  - phase: 15-exa-mcp-registration-all-three-runtimes
    provides: Runtime MCP registration fingerprints and CJS ownership classification
provides:
  - CJS-equivalent install-state schema validation before SDK ownership fingerprints are trusted
  - Cross-runtime CJS and SDK parity coverage for malformed and invalid install state
  - Rebuilt SDK distribution carrying fail-closed ownership classification
affects: [phase-15-verification, settings-integrations, mcp-status, installer-doctor-parity]
tech-stack:
  added: []
  patterns: [schema-valid ownership evidence, cross-implementation parity matrix, fail-closed status classification]
key-files:
  created: []
  modified:
    - sdk/src/query/mcp-status.ts
    - sdk/src/query/mcp-status.test.ts
    - tests/15-mcp-status.test.cjs
    - sdk/dist/query/mcp-status.js
    - sdk/dist/query/mcp-status.d.ts
key-decisions:
  - "Trust SDK MCP ownership fingerprints only after the complete CJS install-state schema validates."
  - "Pin CJS and SDK verdict equality for every invalid-state variant across Claude, Codex, and Gemini."
patterns-established:
  - "User-writable install state establishes ownership only when the full shared schema is valid."
  - "Both-write-paths behavior is protected by fixtures that invoke both implementations over identical files."
requirements-completed: [MCP-09]
duration: 8 min
completed: 2026-07-14
---

# Phase 15 Plan 12: SDK MCP Install-State Parity Summary

**SDK MCP status now rejects schema-invalid install fingerprints exactly like the CJS installer path, with 12 cross-runtime parity cells and rebuilt shipped output.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-14T19:24:47Z
- **Completed:** 2026-07-14T19:32:32Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Ported the complete CJS install-state trust rules into SDK `mcp-status`, including safe relative paths, SHA-256 records, instruction metadata, hooks, and MCP record validation.
- Added 12 identical-file parity fixtures proving the CJS and SDK classifiers both return `user-owned` for four invalid-state variants across all three runtimes.
- Pinned the CJS no-live-entry outcome as `not-registered` and rebuilt `sdk/dist` so `/oto-settings-integrations` consumes the corrected behavior.

## Task Commits

Each task was committed atomically with failing-first coverage where the defect existed:

1. **Task 1 RED: SDK invalid install-state regressions** - `b4bc7ce` (test)
2. **Task 1 GREEN: CJS-equivalent SDK validation gate** - `a59c6f6` (fix)
3. **Task 2: Cross-runtime parity, CJS pinning, and dist rebuild** - `bfb7e06` (test)

## Files Created/Modified

- `sdk/src/query/mcp-status.ts` - Validates the complete install-state schema before reading an Exa ownership fingerprint.
- `sdk/src/query/mcp-status.test.ts` - Uses complete valid fixtures plus WR-01 fail-closed cases and the 3 x 4 CJS/SDK parity matrix.
- `tests/15-mcp-status.test.cjs` - Pins invalid-state outcomes with and without live entries for every runtime.
- `sdk/dist/query/mcp-status.js` - Shipped SDK query implementation rebuilt with the validation gate.
- `sdk/dist/query/mcp-status.js.map` - Rebuilt source map.
- `sdk/dist/query/mcp-status.d.ts` - Exported validation declaration.
- `sdk/dist/query/mcp-status.d.ts.map` - Rebuilt declaration source map.

## Decisions Made

- The SDK ports the CJS schema instead of validating only the nested MCP record, so ownership evidence has one trust contract across status, installer, doctor, and uninstall paths.
- Invalid state is invisible to classification: a live entry is `user-owned`, while an absent live entry is `not-registered` rather than `missing-but-expected`.
- Parity tests invoke the real CJS module through `createRequire` instead of duplicating expected CJS logic in TypeScript.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first sandboxed `npm test` run completed with 891 passing, 3 skipped, and one install-smoke failure caused by blocked DNS access to `registry.npmjs.org`. The required network-enabled retry completed with 892 passing, 3 skipped, and 0 failures.

## Verification

- RED run: 4 WR-01 assertions failed before implementation (`oto-managed`, `drifted`, and `missing-but-expected` false claims reproduced); the malformed-JSON pin already passed.
- `cd sdk && npx tsc --noEmit && npx vitest run src/query/mcp-status.test.ts`: 27 passed, 0 failed, including all 12 runtime-by-invalid-state parity cells.
- `cd sdk && npx vitest run src/query/mcp-status.test.ts src/query/secrets.test.ts src/query/secrets-symlink.test.ts`: 50 passed, 0 failed.
- `node --test tests/15-mcp-status.test.cjs`: 29 passed, 0 failed.
- Network-enabled `npm test`: 892 passed, 0 failed, 3 skipped.
- All Task 1 and Task 2 grep acceptance gates passed; rebuilt `sdk/dist/query/mcp-status.js` contains `validateInstallState`.
- Manual exact WR-01 reproduction through the SDK CLI and CJS classifier returned `user-owned` from both paths.

## Re-review Scope

The follow-up review for this gap-closure run is limited to files changed by gap plans 15-11 and 15-12 only: `bin/lib/runtime-claude.cjs`, `bin/lib/runtime-gemini.cjs`, `tests/15-claude-mcp-merge.test.cjs`, `tests/15-gemini-mcp-merge.test.cjs`, `tests/15-mcp-state.test.cjs`, `sdk/src/query/mcp-status.ts`, `sdk/src/query/mcp-status.test.ts`, `tests/15-mcp-status.test.cjs`, plus generated `sdk/dist/**`. Plans 15-01..15-10 are executed and MUST NOT be modified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

WR-01 is closed in source, shipped SDK output, and cross-runtime parity coverage. Phase 15 is ready for the scoped fresh review and independent verification pass over Plans 15-11 and 15-12.

## Self-Check: PASSED

---
*Phase: 15-exa-mcp-registration-all-three-runtimes*
*Completed: 2026-07-14*
