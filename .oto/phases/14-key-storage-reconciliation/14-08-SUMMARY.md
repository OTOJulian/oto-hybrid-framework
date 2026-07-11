---
phase: 14-key-storage-reconciliation
plan: 08
subsystem: security
tags: [sdk, typescript, secrets, keyfile, config, fail-closed, migration, vitest]

# Dependency graph
requires:
  - phase: 14-key-storage-reconciliation (plan 02)
    provides: SDK secrets module (migrateLegacyIntegrationKeys, integrationForConfigKey, maskSecret) and read-time migration hooks
  - phase: 14-key-storage-reconciliation (plan 05)
    provides: reconcileNewProjectIntegrations in sdk/src/query/secrets.ts + config-mutation.ts (CR-01 closure)
  - phase: 14-key-storage-reconciliation (plan 06)
    provides: transactional secret-commands.ts with preflightConfigDestination (CR-03 closure)
  - phase: 14-key-storage-reconciliation (plan 07)
    provides: hardened CJS migration in oto/bin/lib/config.cjs + core.cjs (behavior-parity reference)
provides:
  - Fail-closed configGet: sanitized "withheld" error when integration-key migration cannot complete (CR-02)
  - Post-read type gate in configGet: an integration string can never leave the handler
  - loadConfig root-layer migration before the root-fallback read + boolean-only loader scrub (CR-04)
  - configSet migrate-before-overwrite with fail-closed error and masked previousValue
  - secretStatus legacy-string self-heal before reporting (WR-01)
  - Single committed sdk/dist rebuild containing 14-05, 14-06, and 14-08 changes
affects: [14-09, verify-phase, sdk-consumers, secret-status]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed sensitive reads: migration failure on an integration key throws a sanitized error instead of returning the raw value"
    - "Post-read type gate: sensitivity check + typeof gate immediately before returning handler data"
    - "Fail-open only where display is masked-only by construction (secretStatus, D-10)"
    - "vi.doMock + vi.resetModules describe blocks stay LAST in a test file to avoid module-identity leaks into instanceof assertions"

key-files:
  created: []
  modified:
    - sdk/src/query/config-query.ts
    - sdk/src/config.ts
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/secret-commands.ts
    - sdk/src/query/config-query.test.ts
    - sdk/src/query/config-mutation.test.ts
    - sdk/src/query/secret-commands.test.ts
    - sdk/dist/** (rebuilt, 16 files)

key-decisions:
  - "configGet fails CLOSED on migration failure only for integration keys; non-sensitive keys keep fail-open reads (#2544 exit-code conventions preserved)"
  - "secretStatus fails OPEN on migration failure because its display is masked-only by construction (D-10) — verified by tests asserting no marker in any field"
  - "previousValue masking is defense-in-depth: migrate-first makes it boolean in practice, maskSecret catches any surviving non-boolean"
  - "Post-read gate test uses vi.doMock to force a silent migration no-op; the describe is placed last in the file because vi.resetModules re-instantiates errors.js and breaks instanceof GSDError in later describes"

patterns-established:
  - "Fail-closed gate pattern: `sensitive && migrationFailed` throw before read + `sensitive && typeof current === 'string'` throw before return"
  - "Root-fallback healing: every config layer a loader may read gets its own migration hook before the read"

requirements-completed: [SECR-01, SECR-03]

# Metrics
duration: 15min
completed: 2026-07-11
---

# Phase 14 Plan 08: SDK Fail-Closed Reads, Root-Fallback Migration, and secretStatus Self-Heal Summary

**SDK config-get/loadConfig/configSet/secret-status now close all Gap-2 SDK leaks: migration failure yields sanitized "withheld"/"config not modified" errors instead of plaintext, the root fallback layer self-heals, previousValue is masked, and secret-status keyfiles legacy strings on first consult (WR-01)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-11T02:08:08Z
- **Completed:** 2026-07-11T02:23:00Z
- **Tasks:** 3
- **Files modified:** 23 (7 source/test + 16 dist)

## Accomplishments

- `configGet` fails closed for exa_search/brave_search/firecrawl: when `migrateLegacyIntegrationKeys` throws (e.g. `~/.oto` is a regular file), the handler throws a sanitized `GSDError` (Execution) containing "withheld" — the legacy string never reaches `result.data` or CLI stdout (CR-02, T-14-08-01)
- Post-read type gate: even if migration silently no-ops, a string value for an integration key can never leave `configGet` (T-14-08-02); non-sensitive keys keep fail-open reads and #2544 exit-code conventions
- `loadConfig` migrates the ROOT config layer before the root-fallback read when a workstream is requested, and scrubs any surviving integration string to boolean after parse (CR-04, T-14-08-03)
- `configSet` migrates any legacy string to a 0600 keyfile BEFORE overwriting, fails closed with "config not modified" when migration cannot complete (config byte-identical), and masks any non-boolean `previousValue` (T-14-08-04, T-14-08-05)
- `secretStatus` self-heals a legacy config string before reporting (WR-01): the string becomes a 0600 keyfile + boolean true and status shows `enabled — key from ~/.oto/... (****XXXX)`; on migration failure the masked-only display still renders without echoing the string (T-14-08-07)
- `sdk/dist` rebuilt once and committed with ALL Phase 14 gap-closure changes (14-05 reconcileNewProjectIntegrations, 14-06 preflightConfigDestination, 14-08 changes) — `git diff --exit-code -- dist` clean after rebuild (T-14-08-06)
- All three live-CLI smoke probes pass against the rebuilt dist: CR-02 probe exits 1 with no marker on stdout/stderr, CR-01 probe exits 10 with no config.json created, WR-01 probe exits 0 with 0600 keyfile + boolean config + `****3210` masked-only output

## Task Commits

Each task was committed atomically (TDD tasks have test + feat commits):

1. **Task 1 RED: failing tests for fail-closed configGet + root-fallback migration** - `cb3f6d8` (test)
2. **Task 1 GREEN: fail-closed configGet with post-read gate; loadConfig root migration + scrub** - `00541bd` (feat)
3. **Task 2 RED: failing tests for configSet migrate-before-overwrite + secretStatus self-heal** - `76b4b1c` (test)
4. **Task 2 GREEN: configSet migrate-before-overwrite, masked previousValue; secretStatus WR-01 self-heal** - `8f2fa62` (feat)
5. **Task 3: rebuild sdk/dist with all gap-closure changes** - `31e9098` (chore)

## Files Created/Modified

- `sdk/src/query/config-query.ts` - fail-closed migration handling + post-read string gate in `configGet`; imports `integrationForConfigKey`
- `sdk/src/config.ts` - root-layer migration inside `if (workstream)` before the fallback read; boolean-only scrub after `JSON.parse`
- `sdk/src/query/config-mutation.ts` - migrate-before-overwrite block in `configSet` (before `acquireStateLock`); `maskSecret(previousValue)` defense in the result build
- `sdk/src/query/secret-commands.ts` - `migrateLegacyIntegrationKeys` try/catch at the top of `secretStatus` before `readConfig`
- `sdk/src/query/config-query.test.ts` - new describe `configGet fail-closed integration reads (Phase 14 gap-closure, CR-02)` (3 tests)
- `sdk/src/query/config-mutation.test.ts` - new describes `configSet legacy migration (Phase 14 gap-closure)` (3 tests) and `loadConfig root-fallback migration (Phase 14 gap-closure, CR-04)` (2 tests)
- `sdk/src/query/secret-commands.test.ts` - new describe `secretStatus legacy self-heal (Phase 14 gap-closure, WR-01)` (2 tests)
- `sdk/dist/**` - rebuilt (16 files) containing 14-05, 14-06, and 14-08 changes

## Decisions Made

- **Fail-closed scope is sensitivity-gated:** only integration keys throw on migration failure; `model_profile` and other non-sensitive keys keep fail-open reads so broken `~/.oto` permissions don't brick unrelated config access
- **secretStatus fails open by design:** its display is masked-only by construction (`detectKeySource(...).masked`, D-10), so a migration fault degrades to "string stays in config, status renders masked" rather than blocking the status surface users rely on to diagnose the very fault
- **Post-read gate test placement:** the `vi.doMock`/`vi.resetModules` test re-instantiates `errors.js` in the module registry, which breaks `instanceof GSDError` in later dynamic imports — the CR-02 describe is documented as must-stay-last in the test file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed sdk dependencies in the fresh worktree**
- **Found during:** Task 1 (RED verification run)
- **Issue:** the executor worktree had no `sdk/node_modules`; vitest could not start (`ERR_MODULE_NOT_FOUND: vitest`)
- **Fix:** ran `npm ci` in `sdk/` (lockfile-exact, no source changes)
- **Files modified:** none committed (node_modules is gitignored)
- **Verification:** vitest runs; full suite green

**2. [Rule 1 - Bug] Prevented vi.resetModules module-identity leak in config-query.test.ts**
- **Found during:** Task 1 (RED verification run)
- **Issue:** the post-read gate test's `vi.resetModules()` in an afterEach leaked a fresh module registry into the later `resolveModel` describe, breaking its `instanceof GSDError` assertion (collateral failure of a pre-existing test)
- **Fix:** moved the CR-02 describe to the end of the file with a placement-invariant comment; the gate test asserts on error shape (`message`, `classification`) instead of class identity
- **Files modified:** sdk/src/query/config-query.test.ts
- **Verification:** all 77 pre-existing + new tests in the file pass; only the 4 intended RED failures remained before GREEN
- **Committed in:** cb3f6d8 (Task 1 RED commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary to run and correctly isolate the planned tests. No scope creep.

## Issues Encountered

- Worktree base was stale (based on `0643e92` instead of `5bbae47`); corrected via the mandated pre-work `git reset --hard 5bbae47` before any changes

## Known Stubs

None — no stub patterns introduced; all new code paths are wired to real migration/keyfile behavior and covered by tests.

## Threat Flags

None — no new security surface beyond the plan's threat model; all seven T-14-08-* threats carry `mitigate` dispositions implemented and tested in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All SDK-side Gap-2 artifact issues (CR-02, CR-04, previousValue leak, WR-01) are closed with regression tests at both the unit and live-CLI level
- `sdk/dist` is in sync with `sdk/src` (verified via `git diff --exit-code -- dist` after rebuild) — plan 14-09 and re-verification can rely on the committed dist
- Full phase matrix green: 5 vitest suites (159 tests) + 5 node:test files (39 tests)

## Self-Check: PASSED

All claimed files exist (4 source, 1 dist probe, SUMMARY); all 5 task commits found in git log; `sdk/dist/query/config-query.js` contains "withheld" (×2).

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-11*
