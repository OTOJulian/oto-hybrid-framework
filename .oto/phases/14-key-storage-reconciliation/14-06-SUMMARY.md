---
phase: 14-key-storage-reconciliation
plan: 06
subsystem: security
tags: [secrets, keyfile, config, transaction, rollback, vitest, typescript]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation (plans 01-04)
    provides: SDK secret CRUD surface (secretSet/secretClear/secretStatus), secrets.ts keyfile helpers, boolean-only integration flags in config.json
provides:
  - preflightConfigDestination: EISDIR/EACCES config-destination faults detected before any keyfile mutation
  - secretSet compensating transaction: prior keyfile snapshot restored (or fresh keyfile deleted) when configSet fails
  - secretClear config-first ordering: config flag flipped before keyfile delete, so a config failure can never destroy the stored credential
  - fault-injection Vitest coverage for create-set, replace-set, and clear against EISDIR and EACCES faults
affects: [14-08 dist rebuild, secret-commands, config-mutation, any future integration slug additions]

# Tech tracking
tech-stack:
  added: []
  patterns: [preflight-then-mutate transactional ordering, compensating rollback with sanitized rethrow, config-first destructive ordering]

key-files:
  created: []
  modified:
    - sdk/src/query/secret-commands.ts
    - sdk/src/query/secret-commands.test.ts

key-decisions:
  - "Preflight (existsSync/statSync/accessSync on the config destination) runs before stdin is even read, so doomed commands fail with zero side effects"
  - "secretClear flips the flag BEFORE deleting the keyfile — the irreversible operation goes last"
  - "Compensation rethrow interpolates only configSet's own message (args are configKey + 'true'/'false'), so the secret can never leak into an error"

patterns-established:
  - "Two-file transactions: validate destination, snapshot prior state, mutate, compensate on failure with best-effort restore"
  - "Fault-injection tests use synthetic markers and assert marker absence from thrown errors"

requirements-completed: [SECR-01, SECR-04]

# Metrics
duration: 4min
completed: 2026-07-10
---

# Phase 14 Plan 06: Transactional Secret Set/Clear Summary

**Secret set/clear now behave as a compensating transaction: config-destination faults (EISDIR/EACCES) are preflighted before any keyfile byte moves, a failed set restores the prior keyfile exactly, and a failed clear can no longer destroy the only stored credential (closes verification Gap 3 / CR-03).**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-11T01:41:29Z
- **Completed:** 2026-07-11T01:45:38Z
- **Tasks:** 1 (TDD)
- **Files modified:** 2

## Accomplishments

- `preflightConfigDestination(projectDir, workstream)` added to `secret-commands.ts`: rejects when `.oto/config.json` is a directory (Validation) or its parent directory is unwritable (Execution) — before stdin is read or any keyfile is touched
- `secretSet` reordered: preflight → read secret → snapshot prior keyfile via `readKeyfile` → `writeKeyfile` → `configSet` in try/catch; on config failure the fresh keyfile is deleted (create case) or the prior content rewritten at 0600 (replace case), then a sanitized `GSDError` is thrown
- `secretClear` reordered config-first: `configSet('false')` runs before `deleteKeyfile`, so a config failure leaves the credential intact; if the delete itself throws, the previous flag value (from `configSet`'s `previousValue`) is restored best-effort
- Five new tests in describe block `transactional set/clear (Phase 14 gap-closure, CR-03)` reproducing the verifier's probes: create-set + EISDIR (no orphan), replace-set + EISDIR (prior content + 0600 preserved), create-set + EACCES via `chmod 0o500` (preflight rejects, root-guarded), clear + EISDIR (credential survives), plus a happy-path round-trip guard
- Return shapes for `secretSet`/`secretClear`/`secretStatus` unchanged — all 13 pre-existing secret-commands tests and all 14 secrets tests still green (32/32 across both files)

## Task Commits

Each task was committed atomically (TDD: test → feat):

1. **Task 1 RED: failing fault-injection tests** - `ff1a9a1` (test)
2. **Task 1 GREEN: preflight + compensating transaction** - `e07746b` (feat)

No REFACTOR commit — GREEN implementation needed no cleanup pass.

## TDD Gate Compliance

- RED gate: `ff1a9a1` — 4 fault tests failed against the non-transactional code exactly as the verifier reproduced (orphan keyfile on create-set, overwritten keyfile on replace-set, EACCES set resolving silently, destroyed credential on clear)
- GREEN gate: `e07746b` — all 18 secret-commands tests pass, plus the 14-test secrets suite
- REFACTOR gate: skipped (no cleanup needed)

## Files Created/Modified

- `sdk/src/query/secret-commands.ts` - preflightConfigDestination helper; secretSet compensation; secretClear config-first ordering with flag restore
- `sdk/src/query/secret-commands.test.ts` - fault-injection describe block (5 tests) reusing the existing tmpHome/projectDir/piped harness

## Decisions Made

- EACCES fault test guards with an in-test early return when `process.getuid?.() === 0` (root ignores directory permission bits) and restores `0o700` in a `finally` so `afterEach` teardown can remove the temp tree
- The RED run revealed that under the old code an EACCES set RESOLVED silently (config write swallowed) while leaving the keyfile written — worse than the plan described; preflight now makes it a hard, clean rejection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed sdk dependencies in the worktree**
- **Found during:** Task 1 RED (first vitest run)
- **Issue:** Fresh git worktree had no `sdk/node_modules`; vitest could not resolve
- **Fix:** `npm ci --no-audit --no-fund` in `sdk/` (lockfile-exact, no manifest changes)
- **Files modified:** none committed
- **Verification:** vitest and tsc run clean
- **Committed in:** n/a (node_modules is gitignored)

---

**Total deviations:** 1 auto-fixed (1 blocking, environment-only)
**Impact on plan:** No code scope change; plan executed as written otherwise.

## Issues Encountered

None beyond the worktree dependency install above.

## Known Stubs

None — no placeholder values or unwired paths introduced.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary surface beyond the plan's threat model. All five register entries (T-14-06-01 through T-14-06-04 mitigate, T-14-06-05 accept) are implemented as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `sdk/dist` deliberately NOT rebuilt/committed (built to prove tsc clean, then `git checkout -- dist`) — plan 14-08 owns the dist rebuild+commit and must run after this plan merges
- Transactional pattern established here is available if the CJS mirror (`oto/bin/lib/secrets.cjs` path) ever needs the same hardening

## Self-Check: PASSED

- FOUND: sdk/src/query/secret-commands.ts
- FOUND: sdk/src/query/secret-commands.test.ts
- FOUND: .oto/phases/14-key-storage-reconciliation/14-06-SUMMARY.md
- FOUND: commit ff1a9a1 (test, RED)
- FOUND: commit e07746b (feat, GREEN)

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-10*
