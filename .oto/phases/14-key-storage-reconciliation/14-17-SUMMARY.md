---
phase: 14-key-storage-reconciliation
plan: 17
subsystem: security
tags: [workstreams, config-routing, secret-scanning, node-test]

requires: []
provides:
  - Canonical session-aware and root-aware config routing for settings integrations
  - Real-process regressions for session pointers and migrated planning roots
  - Separator-tolerant provider-token detection with positive and negative controls
affects: [phase-14-verification, phase-15-mcp-registration, phase-16-agent-guidance]

tech-stack:
  added: []
  patterns:
    - Resolve workflow workstreams and config paths through oto-tools instead of pointer files
    - Unit-test detection regexes directly while excluding only exact documented synthetic controls from repository findings

key-files:
  created: []
  modified:
    - oto/workflows/settings-integrations.md
    - tests/14-settings-workflow-contract.test.cjs
    - tests/14-no-plaintext-guard.test.cjs

key-decisions:
  - "Use the installed $HOME/.claude/oto/bin/oto-tools.cjs convention while allowing OTO_TOOLS override for real-process tests."
  - "Keep the broadened provider regex strict and exclude only exact known synthetic planning fixtures from repository disclosure findings."

patterns-established:
  - "Canonical workflow routing: workstream get --raw, guarded WS_ARGS, then config-path."
  - "Secret-scan controls: direct regex assertions remain independent from tracked-file fixture exemptions."

requirements-completed: [SECR-01, SECR-04]

duration: 6 min
completed: 2026-07-13
---

# Phase 14 Plan 17: Canonical Routing and Token Guard Summary

**Settings integrations now follow session-scoped workstreams and migrated planning roots, while the no-plaintext guard catches separator-containing provider tokens without flagging documented synthetic fixtures.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-13T00:57:48Z
- **Completed:** 2026-07-13T01:03:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced direct shared-pointer and hardcoded project-config reads with canonical `oto-tools` workstream and config-path resolution.
- Added real-process coverage for session-scoped `CODEX_THREAD_ID` pointers, flat projects, and migrated `.planning` roots.
- Broadened provider-token detection to accept internal hyphens and underscores, with explicit positive, negative, and key-shaped-field controls.
- Preserved the clean tracked-`.oto` scan by exempting only exact synthetic controls already documented in Phase 14 planning artifacts.

## Task Commits

Each TDD task was committed as RED then GREEN:

1. **Task 1 RED: canonical routing regressions** - `fd1caee` (test)
2. **Task 1 GREEN: canonical workflow resolution** - `ceeb009` (feat)
3. **Task 2 RED: separator-containing token controls** - `b62f8b1` (test)
4. **Task 2 GREEN: separator-tolerant detection** - `f8e0fe2` (feat)

## Files Created/Modified

- `oto/workflows/settings-integrations.md` - Resolves workstreams and config paths through the canonical installed `oto-tools` surface.
- `tests/14-settings-workflow-contract.test.cjs` - Executes session-pointer, flat-root, and migrated-root routing against real CLI processes.
- `tests/14-no-plaintext-guard.test.cjs` - Detects separated provider tokens and pins positive/negative regex behavior.

## Decisions Made

- Used the dominant installed path `$HOME/.claude/oto/bin/oto-tools.cjs`, with `OTO_TOOLS` as a testable override.
- Kept `WS=none` as the canonical flat-mode sentinel and derived `WS_ARGS` only for a real workstream name.
- Kept the provider regex broad and directly tested; exact synthetic planning-token exemptions apply only when reporting tracked-file findings.
- Left WR-04 unchanged and owned by Phase 16, as required by the disposition contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exempted exact documented synthetic planning fixtures from repository findings**
- **Found during:** Task 2 (IR-01 token guard)
- **Issue:** The widened provider regex correctly matched 57 synthetic token controls already tracked in Phase 14 plans, while the plan's R3 key-shaped fixture added one more pre-existing tracked match. Those known non-secrets blocked the required clean-repository scan.
- **Fix:** Added an exact-value set for the documented synthetic controls and applied it only in tracked-file finding collection; direct regex unit tests still require every separator-containing control to match.
- **Files modified:** `tests/14-no-plaintext-guard.test.cjs`
- **Verification:** `node --test tests/14-no-plaintext-guard.test.cjs` passed all 7 assertions, including the tracked-`.oto` scan.
- **Committed in:** `f8e0fe2`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** The exception is limited to exact known synthetic literals; detection breadth for any other token-shaped value is unchanged.

## Issues Encountered

- The plan's literal basic-regex `grep` escaped `{20,}` as a repetition operator on this platform, so it could not match the source text. The equivalent extended-regex command, `grep -E`, matched the required provider regex at line 22; the executable unit tests independently prove the behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WR-02 and IR-01 are covered by focused real-process and unit regressions.
- WR-04 remains explicitly deferred to Phase 16 with no persisted-shape change in this plan.
- The orchestrator can merge this isolated plan branch and continue Phase 14's bounded convergence waves; `.oto/STATE.md` and `.oto/ROADMAP.md` were intentionally untouched.

## Self-Check: PASSED

- All three planned modified files exist.
- RED/GREEN commits for both tasks exist in branch history.
- All task acceptance checks and plan-level verification commands pass (with the documented `grep -E` correction).
- Scope diff contains only the three planned files plus this summary.

---
*Phase: 14-key-storage-reconciliation*
*Completed: 2026-07-13*
