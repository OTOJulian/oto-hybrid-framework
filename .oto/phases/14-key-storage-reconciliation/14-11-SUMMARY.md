---
phase: 14-key-storage-reconciliation
plan: 11
subsystem: config-security
tags: [nodejs, commonjs, config, key-migration, regression-tests]

requires:
  - phase: 14-key-storage-reconciliation
    provides: Boolean-only integration flags, 0600 keyfile storage, and legacy-key migration helpers
provides:
  - Guarded CJS config reads that fail open for unrelated keys and fail closed for sensitive keys
  - Boolean integration flag output plus migrate-before-warning ordering in the CJS CLI
  - Working false fallback for an absent search_gitignored workflow setting
  - Regression coverage for degraded keyfile storage and CJS output behavior
affects: [phase-14-verification, settings-integrations, phase-16-hardening]

tech-stack:
  added: []
  patterns: [sensitive migration failure gating, boolean passthrough with legacy-string masking]

key-files:
  created:
    - tests/14-configget-guard.test.cjs
  modified:
    - oto/bin/lib/config.cjs
    - oto/workflows/settings-integrations.md

key-decisions:
  - "CJS config-get mirrors SDK failure semantics: unrelated reads continue after migration failure, while sensitive reads return a sanitized value-withheld error."
  - "Boolean integration flags remain visible as true/false; only residual non-boolean values retain defensive masking."
  - "The settings workflow handles an absent search_gitignored key with a shell false fallback because the native SDK handler ignores --default."

patterns-established:
  - "Migration guard: catch read-time migration failures, then gate only sensitive-key reads."
  - "CLI secret masking: pass boolean flags through while withholding legacy string values."

requirements-completed: [SECR-02, SECR-03, SECR-04]

duration: 6 min
completed: 2026-07-12
---

# Phase 14 Plan 11: Config Read Guard and Output Reconciliation Summary

**CJS config reads now survive degraded keyfile storage without leaking sensitive values, while boolean flags and workflow defaults remain honest and usable.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-12T01:44:02Z
- **Completed:** 2026-07-12T01:50:05Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Guarded the last bare CJS migration call so unrelated reads fail open and integration reads fail closed with a sanitized `value withheld` message.
- Preserved true/false output for boolean integration flags and moved the no-key warning after legacy migration.
- Added five regression cases covering the exact broken home key-directory reproduction, masking behavior, and warning ordering.
- Replaced the ignored SDK `--default` flag with the established `2>/dev/null || echo false` workflow fallback.

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard cmdConfigGet migration; unmask booleans; migrate before warning**
   - `424abcf` — TDD RED regression contract
   - `105f373` — GREEN CJS implementation
2. **Task 2: Regression tests — Gap 3 reproduction plus WR-01/WR-02 behavior** — `7393411`
3. **Task 3: WR-03 — guard the workflow's search_gitignored read** — `e1aedaa`

## Files Created/Modified

- `oto/bin/lib/config.cjs` — Adds guarded read-time migration, boolean passthrough, and migrate-before-warning ordering.
- `tests/14-configget-guard.test.cjs` — Pins fail-open/fail-closed behavior, sanitized output, boolean echo, and migration ordering.
- `oto/workflows/settings-integrations.md` — Falls back to false when `search_gitignored` is absent.

## Decisions Made

- Mirrored the SDK's existing sensitive-key failure boundary exactly instead of introducing a new CJS-specific policy.
- Kept defensive masking for non-boolean legacy values while allowing the Phase 14 boolean contract to remain observable.
- Used the raw CLI mode for the text-echo assertion; structured mode continues to return the result object by design.

## TDD Gate Compliance

- **RED:** `424abcf` introduced four behavioral tests; all four failed for the expected pre-fix causes (raw `EEXIST`, missing sanitized withholding, boolean masking, and warning-before-migration).
- **GREEN:** `105f373` made the same four tests pass and preserved the existing 28-test focused Phase 14 set.
- **REFACTOR:** No separate refactor was needed; the production change was already the minimal guarded implementation specified by the plan.

## Test Evidence

- `node --test tests/14-configget-guard.test.cjs` — 5/5 pass.
- `node --test tests/14-migration-hardening.test.cjs tests/14-config-boolean.test.cjs tests/14-secrets-keyfile.test.cjs` — 28/28 pass.
- `node --test tests/14-settings-workflow-contract.test.cjs` — 7/7 pass.
- `node --test tests/14-*.test.cjs` — 51/51 pass.
- Migration call-site audit — both `config.cjs` calls and both `core.cjs` calls are inside `try/catch` guards.
- Workflow contract audit — zero `--default` occurrences and exactly one guarded `search_gitignored` false fallback.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The isolated worktree had no local `node_modules`, so SDK-backed workflow tests initially failed to resolve the declared `ws` dependency. Verification used a temporary symlink to the main checkout's already-installed dependency tree; the link was removed after each run and no dependency files were committed.
- The config-set text assertion initially exercised structured output. Adding the CLI's existing `--raw` flag tested the plan's intended `exa_search=false` echo without changing production output semantics.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap 3 and WR-01/WR-02/WR-03 are closed and regression-locked for independent Phase 14 verification.
- WR-05 remains explicitly deferred to Phase 16 hardening, as scoped in the plan.

## Self-Check: PASSED

- All three plan-owned implementation/test files and `14-11-SUMMARY.md` exist.
- Task commits `424abcf`, `105f373`, `7393411`, and `e1aedaa` are present.
- `.oto/STATE.md` and `.oto/ROADMAP.md` are unchanged from the assigned base.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-12*
