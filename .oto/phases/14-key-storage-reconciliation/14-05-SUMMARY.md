---
phase: 14-key-storage-reconciliation
plan: 05
subsystem: security
tags: [secrets, keyfiles, config-new-project, boolean-enforcement, gap-closure, tdd]

requires:
  - phase: 14-key-storage-reconciliation
    plan: 01
    provides: CJS keyfile storage, validateIntegrationValue, and migrateLegacyIntegrationKeys conflict policy
  - phase: 14-key-storage-reconciliation
    plan: 02
    provides: SDK secrets.ts mirror with writeKeyfile/readKeyfile and D-08 canonical ~/.oto detection
provides:
  - reconcileNewProjectIntegrations in oto/bin/lib/secrets.cjs (merged-config validation/migration for both CJS new-project writers)
  - reconcileNewProjectIntegrations mirror in sdk/src/query/secrets.ts (no GSD-dir writes)
  - Defense-in-depth post-merge boolean gate in SDK configNewProject before atomicWriteConfig
  - CJS + SDK regression tests for caller-choice rejection and global-default migration across all three integrations
affects: [14-08-dist-rebuild, config-new-project, ensureConfigFile, secret-hygiene]

tech-stack:
  added: []
  patterns: [post-merge integration reconciliation before any config write, keyfile-wins conflict policy reuse, best-effort oto-owned defaults healing]

key-files:
  created:
    - tests/14-newproject-boolean.test.cjs
  modified:
    - oto/bin/lib/secrets.cjs
    - oto/bin/lib/config.cjs
    - sdk/src/query/secrets.ts
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/config-mutation.test.ts

key-decisions:
  - "Enforcement lives inside buildNewProjectConfig so both cmdConfigNewProject and ensureConfigFile are covered by one call site."
  - "CJS best-effort heals the oto-owned ~/.oto/defaults.json after migration; the SDK performs no defaults write-back because ~/.gsd/defaults.json is read-only (D-08), accepting repeat masked notices (T-14-05-05)."
  - "Doc comments in both secrets modules avoid the literal GSD dir token so the `grep -c \".gsd\" == 0` D-08 gate stays enforceable."

patterns-established:
  - "Merged new-project configs are reconciled per-integration (skip booleans, reject caller strings sanitized, migrate trusted default strings, coerce the rest) before any write."
  - "SDK write paths add a trailing defense gate that throws if any integration key is still non-boolean after reconciliation."

requirements-completed: [SECR-01, SECR-02]

duration: 12min
completed: 2026-07-11
---

# Phase 14 Plan 05: New-Project Boolean Enforcement Summary

**Both config-new-project writers now validate every integration field of the fully merged config before writing: caller strings are hard-rejected with sanitized D-05 errors and trusted global-default strings become 0600 ~/.oto keyfiles with boolean true, closing verification Gap 1 (CR-01).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-11T01:41:10Z
- **Completed:** 2026-07-11T01:53:00Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 6

## Accomplishments

- Added `reconcileNewProjectIntegrations(merged, userChoices, baseDir)` to `oto/bin/lib/secrets.cjs`, wired into `buildNewProjectConfig` so both `cmdConfigNewProject` and `ensureConfigFile` reject caller-supplied non-boolean integration values (exit 1, nothing written, value never echoed) and migrate global-default strings from `~/.oto/defaults.json` to 0600 keyfiles with the D-02 keyfile-wins conflict policy.
- Added the SDK mirror in `sdk/src/query/secrets.ts` (throws `GSDError`/Validation for caller strings) plus a defense-in-depth post-merge boolean gate in `configNewProject` before `atomicWriteConfig`; the SDK never writes its `~/.gsd/defaults.json` defaults source (D-08), accepting repeat masked migration notices (T-14-05-05).
- CJS best-effort heals the oto-owned `~/.oto/defaults.json` after migration (migrated keys rewritten to `true`) so re-migration doesn't repeat; failure silently falls back to repeat masked notices.
- Reproduced the verifier's original probe (`config-new-project '{"exa_search":"sk-synthetic-0000000000"}'` in a temp project + temp HOME): now exits 1 with the sanitized "booleans only" pointer, creates no config.json, and never echoes the value.

## Task Commits

1. **Task 1 RED: failing CJS tests** - `be0cdeb` (test)
2. **Task 1 GREEN: CJS reconciliation before any write** - `82a23a3` (feat)
3. **Task 2 RED: failing SDK vitest tests** - `b6a266a` (test)
4. **Task 2 GREEN: SDK reconciliation + defense gate** - `4590d08` (feat)

## TDD Gate Compliance

Both tasks followed RED → GREEN: each `test(...)` commit precedes its `feat(...)` commit, and each RED run was verified failing (7/8 CJS failures; 5/5 new SDK failures) before implementation. No refactor pass was needed.

## Files Created/Modified

- `oto/bin/lib/secrets.cjs` - New exported `reconcileNewProjectIntegrations`: skip booleans, sanitized rejection for caller-owned non-booleans, keyfile migration for trusted default strings (keyfile-wins on conflict), `Boolean()` coercion otherwise, best-effort `~/.oto/defaults.json` heal.
- `oto/bin/lib/config.cjs` - `buildNewProjectConfig` assigns the three-level merge to `merged`, then calls the reconciler and `error()`s on rejection before returning (small commented diff for sync hygiene).
- `sdk/src/query/secrets.ts` - Exported SDK mirror; throws `GSDError` (Validation) for caller strings; performs no defaults write-back of any kind; contains zero GSD-dir path references.
- `sdk/src/query/config-mutation.ts` - `configNewProject` calls the reconciler after the deep merge and enforces a trailing non-boolean-blocked gate (`ErrorClassification.Execution`) before `atomicWriteConfig`.
- `tests/14-newproject-boolean.test.cjs` - 8 spawned-CLI tests: rejection ×3, migration ×3 (with 0600 mode, defaults heal, and no-leak assertions), D-02 conflict, boolean-choice regression guard.
- `sdk/src/query/config-mutation.test.ts` - New describe block `configNewProject boolean enforcement (Phase 14 gap-closure, CR-01)` with 5 tests including `.gsd/defaults.json` byte-identity (D-08), repeat-notice posture, and the defense gate.

## Decisions Made

- Placed CJS enforcement inside `buildNewProjectConfig` (not `cmdConfigNewProject`) so `ensureConfigFile` gets identical coverage from a single call site.
- Reworded the helper doc comments to describe the "foreign GSD install state dir" without the literal `.gsd` token, keeping the `grep -c "\.gsd" == 0` acceptance gates on both secrets modules meaningful (T-14-05-06).
- Included the D-02 conflict keys in the CJS defaults-heal set so a healed `~/.oto/defaults.json` also stops repeat conflict notices.

## Verification

- `node --test tests/14-newproject-boolean.test.cjs tests/14-config-boolean.test.cjs tests/14-secrets-keyfile.test.cjs tests/14-no-plaintext-guard.test.cjs` - 30/30 pass.
- `npx vitest run src/query/config-mutation.test.ts src/query/secrets.test.ts` (in `sdk/`) - 66/66 pass.
- `node --check` clean on `secrets.cjs` and `config.cjs`; `npm run build` in `sdk/` exits 0 and `sdk/dist` was discarded afterward (`git status --porcelain sdk/dist` empty — 14-08 owns the dist commit).
- All plan acceptance greps pass: helper referenced ≥2× in each wiring file, exactly one "migrated ... from global defaults" notice line, zero `.gsd` references in both secrets modules, exactly one "non-boolean value blocked before write" defense-gate line, all three integration tokens plus `0o600` present in the new CJS test.
- Verifier probe re-run: exit 1, no config.json, sanitized output only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed sdk/ dependencies in the fresh worktree**
- **Found during:** Task 2 (vitest could not resolve `vitest/config`)
- **Issue:** The parallel-executor worktree had no `sdk/node_modules`, blocking the RED test run.
- **Fix:** `npm install` inside `sdk/` (gitignored; no tracked files changed).
- **Files modified:** none (dependency install only)
- **Commit:** n/a

**Total deviations:** 1 auto-fixed (environment-only). **Impact:** none on product behavior or plan scope.

## Known Stubs

None — no placeholder values, empty-data wirings, or TODO markers were introduced.

## Threat Flags

None — no security surface beyond the plan's threat model was introduced; all six register entries (T-14-05-01..06) have their mitigations implemented or their accepted posture tested.

## Issues Encountered

- Initial worktree base was stale (`0643e92` instead of `669f357`); corrected via the prescribed pre-work `git reset --hard` to the feature-branch HEAD before any changes.
- First draft of the CJS helper doc comment tripped the `grep -c "\.gsd" == 0` acceptance gate; reworded before the GREEN commit.

## User Setup Required

None.

## Next Phase Readiness

- Plan 14-08 must rebuild and commit `sdk/dist` so the shipped `oto-sdk` CLI picks up the SDK-side enforcement (source-level vitest covers it until then).
- The CR-01 bypass through `config-new-project` is closed in both registered implementations; remaining phase gaps are owned by plans 14-06..14-09.

## Self-Check: PASSED

- `tests/14-newproject-boolean.test.cjs` and this summary exist on disk.
- Commits `be0cdeb`, `82a23a3`, `b6a266a`, `4590d08` are ancestors of HEAD with no tracked file deletions.
- Working tree clean apart from gitignored `sdk/node_modules`; `sdk/dist` untouched.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-11*
