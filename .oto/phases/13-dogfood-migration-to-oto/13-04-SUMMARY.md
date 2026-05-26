---
phase: 13-dogfood-migration-to-oto
plan: 04
subsystem: tests
tags: [dogfood, planning-root, regression-guard, live-probe]

requires:
  - phase: 13-dogfood-migration-to-oto
    provides: "Plan 13-03 reference hygiene complete"
provides:
  - "D-09 node:test guard for .oto/ clean cutover"
  - "D-08 live-probe evidence that oto resolves .oto/ with no path override"
  - "Full-suite verification with the new guard included"
affects: [phase-13, dogfood-migration, tests, oto-sdk]

tech-stack:
  added: []
  patterns:
    - "Guard this repo's migration through exported planningRoot/planningDir APIs"
    - "Use live oto-sdk and CJS probes with no OTO_PROJECT/OTO_WORKSTREAM override"

key-files:
  created:
    - "tests/13-oto-root-guard.test.cjs"
    - ".oto/phases/13-dogfood-migration-to-oto/13-04-SUMMARY.md"
  modified:
    - ".oto/STATE.md"
    - ".oto/ROADMAP.md"

key-decisions:
  - "Asserted the exported resolver surface instead of editing or exposing internal core.cjs helpers."
  - "Accepted the operator-approved D-08 probe as the no-path-override evidence for DOG-02."
  - "Restored generated rebrand dry-run reports after npm test so the committed change set stayed scoped."

patterns-established:
  - "For this repo, .planning/ absence and .oto/ resolver behavior are now standard-suite invariants."

requirements-completed: [DOG-01, DOG-02, DOG-03]

duration: 15 min
completed: 2026-05-26
---

# Phase 13 Plan 04: Live Probe and Guard Summary

**The repo now has a durable test guard for `.oto/` self-management, and live tooling probes confirm no path override is needed.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-26T05:11:20Z
- **Completed:** 2026-05-26T15:58:30Z
- **Tasks:** 4 completed
- **Files modified:** 1 test file plus this summary and tracking metadata

## Accomplishments

- Added `tests/13-oto-root-guard.test.cjs`.
- Verified in isolation that the guard passes with 4 tests, 0 failures.
- Verified the guard is included in the standard `npm test` glob.
- Ran the full suite successfully with the new guard included.
- Ran live `oto-sdk` and CJS probes from the repo root with no `--project-dir`, `OTO_PROJECT`, or `OTO_WORKSTREAM` override.
- Captured operator approval of the live-probe output for D-08.

## D-09 Guard Coverage

The committed guard asserts:

- `.planning/` does not exist in this repo.
- `.oto/` and `.oto/STATE.md` exist.
- Exported `planningRoot(REPO_ROOT)` resolves to `<repo>/.oto`.
- Exported `planningDir(REPO_ROOT)` resolves to `<repo>/.oto`.
- `.oto/STATE.md` declares `oto_state_version` and not `gsd_state_version`.

## Verification

### Isolated Guard Test

Command:

```bash
node --test tests/13-oto-root-guard.test.cjs
```

Result:

```text
# tests 4
# pass 4
# fail 0
```

### Full Suite

The first sandboxed `npm test` run hung during the install-smoke section and was stopped. The suite was rerun with escalation.

Command:

```bash
npm test
```

Result:

```text
1..570
# tests 628
# suites 12
# pass 627
# fail 0
# cancelled 0
# skipped 1
# todo 0
```

The Phase 13 guard appeared in the full-suite output as tests 41-44.

`npm test` rewrote `reports/rebrand-dryrun.json` and `reports/rebrand-dryrun.md`; those generated reports were restored after verification so the committed change set remained scoped to Phase 13.

## D-08 Live Probe Evidence

All commands below were run from `/Users/Julian/Desktop/oto-hybrid-framework` with no path/config override.

Binary identity:

```text
$ which oto-sdk
/usr/local/bin/oto-sdk

$ realpath "$(which oto-sdk)"
/Users/Julian/Desktop/oto-hybrid-framework/bin/oto-sdk.js
```

No legacy planning directory and no override env:

```text
$ test ! -d .planning && echo "no .planning dir"
no .planning dir

$ printf 'OTO_PROJECT=%s OTO_WORKSTREAM=%s\n' "$OTO_PROJECT" "$OTO_WORKSTREAM"
OTO_PROJECT= OTO_WORKSTREAM=
```

Read query:

```text
$ oto-sdk query state-snapshot
{
  "status": "executing",
  "last_activity": "2026-05-26 -- Plan 13-03 complete"
}
```

Structural init query:

```text
$ oto-sdk query init.plan-phase 13
{
  "phase_found": true,
  "phase_dir": ".oto/phases/13-dogfood-migration-to-oto",
  "state_path": ".oto/STATE.md",
  "roadmap_path": ".oto/ROADMAP.md",
  "requirements_path": ".oto/REQUIREMENTS.md",
  "context_path": ".oto/phases/13-dogfood-migration-to-oto/13-CONTEXT.md",
  "plan_count": 4
}
```

Phase-list query:

```text
$ oto-sdk query phases.list
{
  "directories": [
    "11-oto-sdk-package-port-path-wiring",
    "12-query-registry-workflow-consumption",
    "13-dogfood-migration-to-oto"
  ],
  "count": 18
}
```

CJS parity probe:

```text
$ node oto/bin/lib/oto-tools.cjs init plan-phase 13
{
  "phase_found": true,
  "phase_dir": ".oto/phases/13-dogfood-migration-to-oto",
  "state_path": ".oto/STATE.md",
  "roadmap_path": ".oto/ROADMAP.md",
  "requirements_path": ".oto/REQUIREMENTS.md",
  "context_path": ".oto/phases/13-dogfood-migration-to-oto/13-CONTEXT.md",
  "plan_count": 4
}
```

The plan text named `oto/bin/oto-tools.cjs`; the live repo path is `oto/bin/lib/oto-tools.cjs`. The corrected CJS command above is the actual shipped local tool path.

## Task Commits

1. **Task 1-3: Guard test, isolated/full verification, and D-08 live probe** - `9fb3700` (test)
2. **Task 4: Plan metadata and summary closeout** - pending in this summary commit

## Files Created/Modified

- `tests/13-oto-root-guard.test.cjs` - Durable regression guard.
- `.oto/phases/13-dogfood-migration-to-oto/13-04-SUMMARY.md` - Plan completion summary.
- `.oto/STATE.md` and `.oto/ROADMAP.md` - Plan progress tracking.

## Deviations from Plan

### Auto-fixed Issues

- The plan's CJS probe path was stale (`oto/bin/oto-tools.cjs`). The actual repo path is `oto/bin/lib/oto-tools.cjs`; the live CJS parity probe used the correct file.
- `npm test` rewrote generated dry-run reports; they were restored after verification to keep the phase commit scoped.

---

**Total deviations:** 2 auto-fixed.
**Impact on plan:** None; the intended guard and live-probe evidence were completed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All four Phase 13 plans are complete. The phase is ready for the execute-phase closeout gates: code review, regression confirmation, phase-goal verification, and final tracking updates.

---
*Phase: 13-dogfood-migration-to-oto*
*Completed: 2026-05-26*
