---
phase: 14-key-storage-reconciliation
plan: 07
subsystem: security
tags: [secrets, keyfiles, legacy-migration, fail-closed, workstreams, gap-closure, tdd]

requires:
  - phase: 14-key-storage-reconciliation
    plan: 01
    provides: CJS keyfile storage, migrateLegacyIntegrationKeys with keyfile-wins conflict policy, and the existing loadConfig/config-get migration hooks
  - phase: 14-key-storage-reconciliation
    plan: 05
    provides: reconcileNewProjectIntegrations and the Phase 14 isSecretKey validation block in cmdConfigSet that the new guard extends
provides:
  - Migrate-before-overwrite guard in cmdConfigSet — a legacy integration string is keyfiled BEFORE setConfigValue overwrites it
  - Fail-closed behavior — cmdConfigSet on an integration key exits 1 without modifying config.json when keyfile migration cannot complete
  - Root-layer migration in loadConfig's OTO_WORKSTREAM branch — migrateLegacyIntegrationKeys(rootConfigPath) runs before the root parse (CR-04)
  - _scrubIntegrationStrings loader scrub — loadConfig can never return an integration string, even when file migration failed
  - tests/14-migration-hardening.test.cjs with 9 regression tests covering all three verifier-reproduced failures
affects: [14-08-dist-rebuild, config-set, loadConfig, workstreams, secret-hygiene]

tech-stack:
  added: []
  patterns: [migrate-before-mutate for credential-bearing config keys, fail-closed writes when self-healing is impossible, in-memory scrub as last-resort loader contract enforcement]

key-files:
  created:
    - tests/14-migration-hardening.test.cjs
  modified:
    - oto/bin/lib/config.cjs
    - oto/bin/lib/core.cjs

key-decisions:
  - "Fail-closed guard applies only to integration keys — non-integration config-set (e.g. model_profile) still succeeds with a broken ~/.oto base."
  - "Loader scrub coerces a surviving integration string to true (a configured key means the flag is on), matching migrateLegacyIntegrationKeys semantics."
  - "Root-layer migration failure never blocks config load (try/catch swallow); the scrub guarantees no plaintext escapes even on that path."

patterns-established:
  - "Credential-destroying mutations must self-heal the credential first and refuse the write if healing fails."
  - "Every parsed config layer (root and workstream/file) passes through _scrubIntegrationStrings before merging."

requirements-completed: [SECR-01, SECR-02, SECR-03]

duration: 8min
completed: 2026-07-11
---

# Phase 14 Plan 07: CJS Migration Hardening Summary

**cmdConfigSet now keyfiles a legacy integration string before overwriting it (refusing the write entirely if ~/.oto is unusable), and loadConfig migrates the root config layer before parsing it under OTO_WORKSTREAM plus scrubs integration strings from every parsed layer — closing the CJS half of verification Gap 2 (CR-04 + legacy-overwrite).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-11T01:57:02Z
- **Completed:** 2026-07-11T02:04:55Z
- **Tasks:** 2 (both TDD)
- **Files modified:** 3

## Accomplishments

- Reproduced and closed the verifier's legacy-overwrite probe: `config-set exa_search true` on a config holding a legacy string now creates `~/.oto/exa_api_key` (mode 0600) containing that string before the boolean lands — verified for all three integrations (exa/brave/firecrawl).
- Fail-closed guard (T-14-07-01): when `~/.oto` is a regular file so keyfile migration throws, `config-set` on an integration key exits non-zero with a sanitized "legacy key migration failed — config not modified" error and config.json stays byte-identical — the only stored credential is never destroyed. Non-integration keys remain unaffected.
- Closed CR-04 (T-14-07-02): `loadConfig` now calls `migrateLegacyIntegrationKeys(rootConfigPath)` before `readFileSync` in the OTO_WORKSTREAM branch, so a legacy root string self-heals to a keyfile + boolean even when a workstream config exists.
- Loader contract enforcement (T-14-07-03): new `_scrubIntegrationStrings` helper applied to both `rootParsed` and `fileData` — `loadConfig`'s return value can never contain an integration string, even when file migration is impossible; consumers can no longer leak plaintext.

## Task Commits

1. **Task 1 RED: failing config-set migrate-before-overwrite tests** - `201a996` (test)
2. **Task 1 GREEN: migrate-before-overwrite + fail-closed guard in cmdConfigSet** - `e8b4a49` (feat)
3. **Task 2 RED: failing root-layer migration and loader-scrub tests** - `746bd6d` (test)
4. **Task 2 GREEN: root migration before parse + _scrubIntegrationStrings** - `a60eda6` (feat)

## TDD Gate Compliance

Both tasks followed RED → GREEN: each `test(...)` commit precedes its `feat(...)` commit. Task 1 RED verified failing 4/5 (the fifth is an intentional pass-through guard for non-integration keys). Task 2 RED verified failing 3/4 (the missing-workstream variant already passed via the pre-existing recursion fallback and is kept as a regression guard). No refactor pass was needed.

## Files Created/Modified

- `oto/bin/lib/config.cjs` - New 9-line commented block in `cmdConfigSet` after the Phase 14 validation block: `migrateLegacyIntegrationKeys(planningDir config path)` wrapped in try/catch that `error()`s (exit 1) before `setConfigValue` can run. Migration call (line 355) precedes `setConfigValue` (line 384).
- `oto/bin/lib/core.cjs` - Root-layer migration hook (2 commented lines) inserted after `rootConfigPath` is computed and before the root `readFileSync`; `_scrubIntegrationStrings` helper (definition + 2 call sites on `rootParsed` and `fileData`). 15 changed lines total.
- `tests/14-migration-hardening.test.cjs` - 9 spawned-process regression tests (186 lines): legacy-overwrite ×3 with 0600-mode and no-leak assertions, fail-closed byte-identity, non-integration guard, CR-04 root-plus-workstream, missing-workstream variant, and loader-scrub with broken keyfile base in both workstream and no-workstream modes.

## Decisions Made

- Followed the plan's literal placement for the config.cjs guard (a sibling `isSecretKey` block after the existing validation block) rather than reordering `warnIfNoKeyDetected` — placing migration before the validation block would have broken the D-05 rejection contract (existing tests assert no `~/.oto` is created on string rejection).
- Added a fourth scrub test (no-workstream variant) beyond the plan's three Task 2 behaviors so both `_scrubIntegrationStrings` call sites (`rootParsed` and `fileData`) have direct coverage.

## Verification

- `node --test tests/14-migration-hardening.test.cjs tests/14-config-boolean.test.cjs tests/14-secrets-keyfile.test.cjs tests/14-no-plaintext-guard.test.cjs` — 31/31 pass.
- Full repository suite (`node --test --test-concurrency=4 tests/*.test.cjs`) — 676 pass, 0 fail, 3 skipped: no regressions from the shared-file edits.
- `node --check` clean on both `core.cjs` and `config.cjs`.
- Acceptance greps all pass: the fail-closed message appears on exactly 1 line; `grep -c migrateLegacyIntegrationKeys core.cjs` == 2 with the root hook (line 339) preceding `rootParsed =` (line 342); `grep -c _scrubIntegrationStrings core.cjs` == 3; the test file contains `exa_search`, `brave_search`, `firecrawl`, `0o600`, a before/after byte-equality assertion, and a `workstreams/ws1` fixture.
- Sync-hygiene budgets respected: config.cjs diff 9 lines (≤ 10), core.cjs diff 15 lines (≤ 15), all commented as Phase 14 gap-closure hooks.

## Deviations from Plan

None on product code — both tasks executed as written. One environment note: the full-suite run regenerated `reports/rebrand-dryrun.{json,md}` (test-generated artifacts, out of this plan's scope); those two specific files were restored to HEAD and not committed.

## Known Stubs

None — no placeholder values, empty-data wirings, or TODO markers were introduced.

## Threat Flags

None — no security surface beyond the plan's threat model was introduced. Register dispositions T-14-07-01..04 are implemented and test-asserted (fail-closed, root-before-parse, loader scrub, no-marker output assertions in every test); T-14-07-05 (migration race) remains accepted per plan.

## Issues Encountered

- Initial worktree base was stale (`0643e92` instead of `d465d6c`); corrected via the prescribed pre-work `git reset --hard` to the Wave-1-merged base before any changes.

## User Setup Required

None.

## Next Phase Readiness

- The CJS half of Gap 2 is fully closed: no CJS read or write path can return, leak, or destroy a legacy integration string.
- Plan 14-08 owns the SDK-side counterpart and the `sdk/dist` rebuild; nothing in this plan touched `sdk/`.

## Self-Check: PASSED

- `tests/14-migration-hardening.test.cjs` and this summary exist on disk.
- Commits `201a996`, `e8b4a49`, `746bd6d`, `a60eda6` are ancestors of HEAD with no tracked file deletions.
- Working tree clean before the metadata commit.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-11*
