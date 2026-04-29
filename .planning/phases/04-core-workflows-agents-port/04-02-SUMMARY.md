---
phase: 04-core-workflows-agents-port
plan: 02
subsystem: workflows
tags: [rebrand-engine, oto-payload, workflows, agents, node-test]

requires:
  - phase: 04-core-workflows-agents-port
    provides: 04-01 Phase 4 scaffold tests and retained-agent fixture
provides:
  - Inventory-aware `oto/` baseline payload generated from `foundation-frameworks/get-shit-done-main`
  - Rebranded `/oto-*` command files, retained agents, workflows, contexts, templates, references, hooks, and library files
  - Filled Phase 4 rebrand-smoke test with structural assertions
affects: [phase-04, workflows, agents, installer-payload, verification]

tech-stack:
  added: []
  patterns:
    - "Rebrand apply now honors inventory DROP verdicts and target_path output locations."
    - "Phase 4 smoke tests assert the already-committed `oto/` tree rather than rerunning the engine."

key-files:
  created:
    - oto/
  modified:
    - scripts/rebrand/lib/engine.cjs
    - tests/phase-04-rebrand-smoke.test.cjs

key-decisions:
  - "Use inventory target_path values as the source of truth for generated output layout."
  - "Keep the REQUIREMENTS out-of-scope override for `ultraplan-phase` by deleting the emitted workflow file after generation."

patterns-established:
  - "Generated Phase 4 baseline is committed as `oto/` and future Wave 2 plans patch that tree in place."
  - "Rebrand smoke tests count and spot-check payload roots without regenerating source."

requirements-completed: []
requirements-addressed:
  - WF-01
  - WF-02
  - WF-03
  - WF-04
  - WF-05
  - WF-06
  - WF-07
  - WF-08
  - WF-09
  - WF-10
  - WF-11
  - WF-12
  - WF-13
  - WF-14
  - WF-15
  - WF-16
  - WF-17
  - WF-18
  - WF-19
  - WF-20
  - WF-21
  - WF-22
  - WF-23
  - WF-24
  - WF-25
  - WF-28
  - WF-29
  - WF-30

duration: 6 min
completed: 2026-04-29
---

# Phase 04 Plan 02: Rebrand Baseline Summary

**Inventory-aware GSD spine rebrand into the `oto/` payload with retained agents and structural smoke coverage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-29T22:33:54Z
- **Completed:** 2026-04-29T22:40:27Z
- **Tasks:** 2
- **Files modified:** 339

## Accomplishments

- Ran `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --out oto/ --force --owner OTOJulian`.
- Generated the Phase 4 baseline under `oto/` with 76 command files, 23 retained agents, 97 workflow files, 3 contexts, 44 templates, 53 references, 6 hooks, and 32 library files.
- Removed `oto/workflows/ultraplan-phase.md` per the REQUIREMENTS out-of-scope override; `oto/commands/oto/ultraplan-phase.md` was also absent.
- Replaced `tests/phase-04-rebrand-smoke.test.cjs` with five passing structural checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run rebrand engine apply against upstream into oto/ tree** - `91cb26c` (feat)
2. **Task 2: Implement rebrand-smoke test body and confirm it passes** - `51f5442` (test)

## Files Created/Modified

- `oto/` - Generated baseline payload for commands, agents, workflows, contexts, templates, references, hooks, and copied library files.
- `scripts/rebrand/lib/engine.cjs` - Fixed apply mode to respect inventory DROP verdicts and target paths.
- `tests/phase-04-rebrand-smoke.test.cjs` - Structural smoke checks for commands, agents, nested workflows, payload roots, and `ultraplan-phase` removal.

## Verification

- `node scripts/rebrand.cjs --apply --target foundation-frameworks/get-shit-done-main --out oto/ --force --owner OTOJulian` - PASS, final successful run reported 338 files, 5083 matches, 0 unclassified.
- `test -f oto/commands/oto/new-project.md && test -f oto/agents/oto-planner.md && test ! -f oto/agents/code-reviewer.md && test ! -f oto/commands/oto/ultraplan-phase.md && test ! -f oto/workflows/ultraplan-phase.md && [ "$(find oto/agents -name 'oto-*.md' | wc -l | tr -d ' ')" = "23" ] && [ "$(grep -r '\bgsd-' oto/commands/ oto/agents/ oto/workflows/ oto/templates/ oto/references/ 2>/dev/null | grep -v 'foundation-frameworks' | wc -l | tr -d ' ')" = "0" ]` - PASS.
- `node --test tests/phase-04-rebrand-smoke.test.cjs` - PASS, 5 tests, 0 fail, 0 todo.
- `npm test` - PASS, 229 tests, 0 fail, 9 todo.

## Decisions Made

- Used `decisions/file-inventory.json` `target_path` as the authoritative generated layout because the plan contract required verdict-aware output.
- Preserved the plan's only allowed hand-edit by deleting the deferred `ultraplan-phase` workflow after generation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rebrand apply ignored inventory verdicts and target paths**
- **Found during:** Task 1 (Run rebrand engine apply against upstream into oto/ tree)
- **Issue:** The first engine run emitted 977 files, included 33 agents instead of 23, and placed workflows under `oto/oto/workflows/` because apply mode walked every text file and used only rename-map path rules.
- **Fix:** Updated `scripts/rebrand/lib/engine.cjs` so apply and dry-run skip inventory DROP rows, use `target_path` for inventory rows, and strip a duplicated leading `oto/` when the output root is `oto/`.
- **Files modified:** `scripts/rebrand/lib/engine.cjs`
- **Verification:** Re-ran apply mode and the Task 1 acceptance gate; counts became 76 commands, 23 agents, 97 workflows, and zero un-rebranded `gsd-` / `superpowers-` identifiers in the checked payload roots.
- **Committed in:** `91cb26c`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix aligned the engine with the plan's stated interface. No unrelated source files were changed.

## Known Stubs

- `oto/commands/oto/plan-phase.md`, `oto/commands/oto/debug.md`, `oto/commands/oto/ai-integration-phase.md`, `oto/workflows/ai-integration-phase.md`, `oto/workflows/eval-review.md`, `oto/workflows/ingest-docs.md`, and `oto/workflows/profile-user.md` still require Wave 2 dropped-agent fixups already assigned to plans 04-03, 04-04, and 04-05.
- Nine Phase 4 scaffold tests still contain intentional `t.todo()` placeholders from 04-01 and are assigned to 04-07.

## Issues Encountered

- The initial engine output failed Task 1 acceptance because the engine had not yet implemented the inventory-aware behavior described in the plan. Fixed under the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 04-03. The generated `oto/` tree is in place and the Wave 2 plans can now patch dropped-agent references against a committed baseline.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-29*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/04-core-workflows-agents-port/04-02-SUMMARY.md`.
- Key generated payload files exist under `oto/commands/oto/`, `oto/agents/`, and `oto/workflows/`.
- Task commits `91cb26c` and `51f5442` exist in git history.
- `requirements-addressed` copies the plan frontmatter list from WF-01 through WF-30, excluding WF-26/WF-27 as in the plan.
