---
phase: 01-inventory-architecture-decisions
plan: 02
subsystem: docs
tags: [inventory, schema, generator, node-test]
requires:
  - phase: 01
    provides: Plan 01 load-schema helper and agent-audit verdicts
provides:
  - ARCH-06 file inventory schema and generated upstream inventory
affects: [phase-02, phase-04, phase-09]
tech-stack:
  added: []
  patterns: [deterministic CommonJS generator, generated markdown index from JSON source of truth]
key-files:
  created:
    - schema/file-inventory.json
    - tests/phase-01-inventory.test.cjs
    - scripts/gen-inventory.cjs
    - decisions/file-inventory.json
    - decisions/file-inventory.md
  modified: []
key-decisions:
  - "Generated inventory uses JSON as source of truth and markdown as derived index."
  - "Inventory covers 1,128 upstream files with no exclusions before classification."
patterns-established:
  - "Generated outputs are validated against schema before write."
  - "Inventory rows are sorted by raw ASCII key `${upstream}/${path}` to match tests."
requirements-completed: [ARCH-06]
duration: 5 min
completed: 2026-04-27
---

# Phase 01 Plan 02: Inventory Summary

**Canonical file inventory now classifies every pinned upstream file as keep, drop, or merge with schema-backed validation.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-27T23:04:20Z
- **Completed:** 2026-04-27T23:09:32Z
- **Tasks:** 2 completed
- **Files modified:** 5 created

## Accomplishments

- Created `schema/file-inventory.json` for the Phase 1 inventory contract.
- Created `tests/phase-01-inventory.test.cjs` with schema, row-count, sorting, target-path, merge-source, duplicate, and unclassified-verdict checks.
- Created `scripts/gen-inventory.cjs`, a deterministic zero-dependency CommonJS walker.
- Generated `decisions/file-inventory.json` and `decisions/file-inventory.md`.
- Classified 1,128 upstream files: 363 keep, 760 drop, 5 merge.

## Task Commits

1. **Task 1: Inventory schema and validation test** - `34119f1`
2. **Task 2: Inventory generator** - `4eaa2da`
3. **Task 2: Generated inventory outputs** - `48cfcf6`

## Files Created/Modified

- `schema/file-inventory.json` - JSON Schema for inventory entries.
- `tests/phase-01-inventory.test.cjs` - Automated checks for generated inventory correctness.
- `scripts/gen-inventory.cjs` - Filesystem walker and deterministic classifier.
- `decisions/file-inventory.json` - Machine-readable source of truth.
- `decisions/file-inventory.md` - Generated human-readable inventory index.

## Decisions Made

- The generator writes all upstream files, then classifies by ordered first-match rules.
- Raw ASCII sorting is used instead of `localeCompare` so output order matches the test's direct string comparison.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced localeCompare with raw ASCII sort**
- **Found during:** Task 2 verification
- **Issue:** `localeCompare` placed `.github/dependabot.yml` before `.github/FUNDING.yml`, while the test asserts direct JavaScript `<` ordering.
- **Fix:** Changed sorting to compare `${upstream}/${path}` with raw `<` / `>` operators.
- **Files modified:** `scripts/gen-inventory.cjs`
- **Verification:** `node --test tests/phase-01-inventory.test.cjs` passes.
- **Committed in:** `4eaa2da`

---

**Total deviations:** 1 auto-fixed (Rule 3).
**Impact on plan:** Output became more deterministic and matches the test contract.

## Issues Encountered

None beyond the sort comparator fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03 can now rely on `tests/helpers/load-schema`, the completed `decisions/` directory count, and the generated inventory. Phase 2 and Phase 9 can consume `decisions/file-inventory.json` as the source of truth.

## Self-Check: PASSED

- `node scripts/gen-inventory.cjs` exits 0.
- `node --test tests/phase-01-inventory.test.cjs` passes 9/9.
- `node --test tests/phase-01-decisions-dir.test.cjs` now passes after inventory output generation.
- The 10 dropped agents in `decisions/agent-audit.md` have matching `verdict: "drop"` inventory entries.
- `get-shit-done/bin/gsd-tools.cjs` has `verdict: "merge"` and `deprecation_status: "deprecated"`.

---
*Phase: 01-inventory-architecture-decisions*
*Completed: 2026-04-27*
