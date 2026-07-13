---
phase: 14-key-storage-reconciliation
plan: 14
subsystem: sdk
tags: [config-mutation, fail-closed, secrets, workstreams, vitest]

requires:
  - phase: 14-key-storage-reconciliation
    provides: boolean-only integration flags, compensated secret set/clear, and mutation event emission
provides:
  - ENOENT-only empty-config fallback for SDK read-modify-write mutations
  - Byte- and keyfile-preserving rejection for malformed config secret operations
  - Workstream-preserving event-enabled mutation dispatch
  - Fail-closed TTY secret entry when echo suppression is unavailable
affects: [14-19-terminal-verification, sdk-query-registry, secret-storage]

tech-stack:
  added: []
  patterns: [fail-closed config mutation, compensating secret write, full handler signature forwarding]

key-files:
  created:
    - sdk/src/query/config-mutation-failclosed.test.ts
    - sdk/src/query/secret-input-failclosed.test.ts
  modified:
    - sdk/src/query/config-mutation.ts
    - sdk/src/query/secret-commands.ts
    - sdk/src/query/index.ts
    - sdk/src/query/registry.test.ts
    - oto/bin/lib/config.cjs

key-decisions:
  - "Only ENOENT represents a fresh config; every other read, parse, or root-shape failure aborts without writing."
  - "TTY secret entry refuses input when readline echo suppression cannot be established."
  - "Event-enabled registry wrappers preserve the complete QueryHandler signature, including workstream."

patterns-established:
  - "Fail-closed mutation reads: sanitize errors, preserve original bytes, and validate a plain-object root before mutation."
  - "Secret input capability gate: establish hidden-entry support before displaying a prompt or accepting key bytes."

requirements-completed: [SECR-04]

duration: 8 min
completed: 2026-07-13
---

# Phase 14 Plan 14: Fail-Closed Config Mutation and Scoped Event Routing Summary

**SDK config mutations now preserve unreadable or malformed config bytes, secret operations restore keyfile state, event wrappers retain workstream scope, and TTY key entry refuses insecure echo fallback.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-13T00:50:32Z
- **Completed:** 2026-07-13T00:58:14Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added a shared `readConfigForMutation` path used by all three SDK mutators, with ENOENT-only initialization, plain-object validation, sanitized errors, and byte-preservation coverage.
- Proved secret set/clear compensation preserves malformed config and prior keyfile state, while repairing the stale registry dispatch expectations.
- Forwarded workstream scope through mutation event wrappers and made hidden TTY entry reject before prompting when echo suppression is unavailable.

## Task Commits

Each task was committed atomically, with separate RED/GREEN commits where production behavior changed:

1. **Task 1 RED: config mutation preservation regressions** - `dc5cb90`
2. **Task 1 GREEN: fail-closed mutators and sanitized CJS message** - `e2941a4`
3. **Task 2: secret rollback and three-argument dispatch coverage** - `26d7dfa`
4. **Task 3 RED: workstream and hidden-input reproductions** - `c092f24`
5. **Task 3 GREEN: workstream forwarding and secure-input capability gate** - `73f647c`

## Files Created/Modified

- `sdk/src/query/config-mutation.ts` - Reads mutation targets through an ENOENT-only, fail-closed helper.
- `oto/bin/lib/config.cjs` - Uses a fixed path-only error for `setConfigValue` read/parse failures.
- `sdk/src/query/config-mutation-failclosed.test.ts` - Covers malformed/non-object roots, byte preservation, secret compensation, ENOENT, read errors, and temp-file cleanup.
- `sdk/src/query/registry.test.ts` - Pins three-argument dispatch and event-enabled root/workstream routing.
- `sdk/src/query/index.ts` - Forwards `workstream` through event-enabled mutation wrappers.
- `sdk/src/query/secret-commands.ts` - Rejects insecure interactive entry before writing the prompt.
- `sdk/src/query/secret-input-failclosed.test.ts` - Mocks a readline implementation without `_writeToOutput` and verifies fail-closed behavior.

## Decisions Made

- Treated missing config (`ENOENT`) as the only safe empty-object fallback. Malformed JSON, read errors, arrays, `null`, strings, and numbers all abort the mutation.
- Kept the CJS change message-only because its `setConfigValue` path already exits before writing.
- Preserved the current readline implementation for supported Node versions while making loss of its suppression hook an actionable execution error.
- Left `sdk/dist` rebuilding to Plan 14-19's single-rebuild terminal gate, as required by the plan.

## TDD Gate Compliance

| Task | RED evidence | GREEN evidence | Result |
|---|---|---|---|
| 1 | `dc5cb90`: 11 intended failures reproduced destructive fallback and root-shape defects | `e2941a4`: focused suite passed 70/70 | PASS |
| 2 | Test-only contract over Task 1 behavior; no new production implementation | `26d7dfa`: secret compensation and registry contract passed 68/68 | PASS |
| 3 | `c092f24`: 3 intended failures reproduced dropped scope and insecure input fallback | `73f647c`: focused suite passed 57/57 | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Git index writes for the isolated worktree required sandbox escalation because its administrative index lives under the main repository's `.git/worktrees` directory. Escalated commits completed normally.
- The reviewed seven-suite SDK gate still prints the pre-existing CLI usage block documented as IR-02 in `14-REVIEW.md`; all 215 tests pass and this plan does not modify that CLI import behavior.

## User Setup Required

None - no external service configuration required.

## Verification

- Plan-level Vitest command: **5 files, 130 tests passed**.
- Reviewed SDK gate: **7 files, 215 tests passed**.
- TypeScript: `npx tsc --noEmit` exited 0.
- CJS compatibility: `node --test tests/14-config-boolean.test.cjs` passed **8/8**.
- All task acceptance greps/counts matched; `git diff --check` was clean.
- No files under `sdk/dist` changed.
- `.oto/STATE.md` and `.oto/ROADMAP.md` were not modified; the phase orchestrator remains their single writer.

## Next Phase Readiness

- CR-03, WR-03, WR-08, and WR-10 are closed at the source level with regression coverage.
- Ready for the remaining Phase 14 gap-closure plans and Plan 14-19's single SDK rebuild plus terminal convergence gate.
- Phase 14 is not declared complete by this plan alone.

## Self-Check: PASSED

- Both required new test artifacts exist and exceed their minimum line counts.
- All five task commits resolve from git history with no tracked-file deletions.
- Every task acceptance criterion and plan-level verification command passed.
- No unplanned threat surface or implementation stubs were introduced.
- Orchestrator-owned state and roadmap files remain byte-unchanged from the worktree base.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
