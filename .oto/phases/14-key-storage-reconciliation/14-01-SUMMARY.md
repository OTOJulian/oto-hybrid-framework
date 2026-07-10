---
phase: 14-key-storage-reconciliation
plan: 01
subsystem: security
tags: [secrets, keyfiles, config, migration, node-test]

requires: []
provides:
  - Allowlisted integration keyfile CRUD with 0600 storage and permission self-healing
  - Boolean-only CJS config enforcement for Exa, Brave, and Firecrawl
  - Legacy config-string migration with keyfile-wins conflict handling
affects: [14-02, 14-03, 14-04, phase-15-exa-mcp-registration]

tech-stack:
  added: []
  patterns: [explicit-baseDir secret helpers, read-time config self-healing, masked one-line security notices]

key-files:
  created:
    - tests/14-secrets-keyfile.test.cjs
    - tests/14-config-boolean.test.cjs
  modified:
    - oto/bin/lib/secrets.cjs
    - oto/bin/lib/config.cjs
    - oto/bin/lib/core.cjs

key-decisions:
  - "CJS integration flags accept booleans only; API keys live in environment variables or 0600 ~/.oto keyfiles."
  - "When a legacy config string conflicts with an existing keyfile, the keyfile wins and only masked values appear in notices."

patterns-established:
  - "Secret helpers take an optional baseDir so filesystem behavior is testable without mutating HOME."
  - "Legacy secret migration runs on both direct config-get and shared loadConfig reads."

requirements-completed: [SECR-01, SECR-02, SECR-03]

duration: 8min
completed: 2026-07-10
---

# Phase 14 Plan 01: CJS Key Storage Reconciliation Summary

**Integration secrets now use allowlisted 0600 keyfiles while CJS config writes accept booleans only and legacy strings self-heal on read.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-10T21:45:59Z
- **Completed:** 2026-07-10T21:53:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added keyfile create/read/delete helpers, environment precedence detection, masked status data, and 0644-to-0600 permission healing for Exa, Brave, and Firecrawl.
- Hard-rejected string writes to all three CJS integration config keys before persistence, while retaining warn-but-allow semantics for an enabled flag without a detected key.
- Migrated legacy config strings through both `config-get` and `loadConfig`, preserving a conflicting existing keyfile and warning about git-history exposure without printing plaintext.

## Task Commits

Each task followed a separate RED/GREEN commit pair:

1. **Task 1 RED: Keyfile storage behavior tests** - `947d47e` (test)
2. **Task 1 GREEN: Secure keyfile helpers and migration** - `fc70eb8` (feat)
3. **Task 2 RED: CJS config behavior tests** - `8cba790` (test)
4. **Task 2 GREEN: Config validation and migration hooks** - `20e356a` (feat)

## Files Created/Modified

- `oto/bin/lib/secrets.cjs` - Allowlisted integration metadata, 0600 keyfile CRUD, source detection, boolean validation, warnings, and atomic legacy migration.
- `oto/bin/lib/config.cjs` - Rejects non-boolean integration values, warns on keyless enablement, and migrates legacy values before direct reads.
- `oto/bin/lib/core.cjs` - Runs best-effort legacy integration migration before shared config loads.
- `tests/14-secrets-keyfile.test.cjs` - Covers modes, permission healing, CRUD, source precedence, validation, migration, conflict handling, and safe no-ops.
- `tests/14-config-boolean.test.cjs` - Covers all three string rejections, boolean writes, warning behavior, and both CJS migration hooks through spawned processes.

## Decisions Made

- Followed the Phase 14 context decisions: environment variables take precedence, existing keyfiles win migration conflicts, and plaintext is never included in command notices.
- Kept migration's atomic writer local to `secrets.cjs` so the module remains Node-builtins-only and does not introduce a `core.cjs` dependency cycle.

## TDD Gate Compliance

| Task | RED | GREEN | Refactor |
|------|-----|-------|----------|
| Keyfile helpers | `947d47e` (11 expected failures: helpers absent) | `fc70eb8` (11/11 pass) | Not needed |
| CJS hooks | `8cba790` (6 expected failures: hooks absent) | `20e356a` (8/8 pass) | Not needed |

## Verification

- `node --test tests/14-secrets-keyfile.test.cjs tests/14-config-boolean.test.cjs` - 19/19 pass.
- All Task 1 and Task 2 grep/count acceptance checks pass, including three `0o600` enforcement sites, no `secrets.cjs` → `core.cjs` dependency, and all three sync-hygiene markers.
- Shared-file hook diffs remain small: `config.cjs` 20 changed lines and `core.cjs` 3 changed lines.
- The repository-wide suite was not used as a completion gate because the supplied execution baseline identifies unrelated existing failures; the exact plan-scoped suite is green.

## Deviations from Plan

None - plan implementation executed exactly as written. The supplied baseline instruction replaced the known-red repository-wide suite with exact plan-scoped verification.

## Issues Encountered

- The repository-wide baseline is known red for unrelated marker-guard and SDK parity/environment failures. Those files were not touched and those failures were not treated as Phase 14-01 regressions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared CJS helper contract is ready for the SDK mirror and secret command work in Plans 14-02 and 14-03.
- No blockers remain for the next plan.

## Self-Check: PASSED

- All five plan files and this summary exist.
- All four RED/GREEN task commits are present, and no tracked files were deleted.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-10*
