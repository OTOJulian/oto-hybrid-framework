---
phase: 04-core-workflows-agents-port
plan: 08
subsystem: mr-01-dogfood
tags: [human-uat, claude-code, dogfood, mr-01]

requires:
  - phase: 04-core-workflows-agents-port
    provides: "Plans 04-01 through 04-07 delivered and verified the Phase 4 Claude runtime payload"
provides:
  - "MR-01 operator dogfood approval for the Claude Code core spine"
  - "Dual UAT and technical evidence records for disposable install behavior"
  - "Cleanup confirmation for the disposable dogfood environment"
affects: [phase-04, phase-05-hooks, phase-08-runtime-parity]

tech-stack:
  added: []
  patterns:
    - "MR-01 dogfood uses mktemp-scoped project, install prefix, pack dir, npm cache, and Claude config"
    - "Operator UAT records command-level transcript summaries plus technical evidence in VERIFICATION.md"

key-files:
  created:
    - .planning/phases/04-core-workflows-agents-port/04-HUMAN-UAT.md
    - .planning/phases/04-core-workflows-agents-port/04-08-SUMMARY.md
  modified:
    - .planning/phases/04-core-workflows-agents-port/04-VERIFICATION.md
    - oto/bin/lib/core.cjs
    - oto/bin/lib/model-profiles.cjs
    - tests/phase-04-mr01-install-smoke.test.cjs

key-decisions:
  - "Skipped research-before-planning in the scratch dogfood because MR-01 validates the core spine, not research-heavy planning behavior."
  - "Stopped before scratch `/oto:complete-milestone` because milestone closeout is outside the Phase 4 MR-01 blocking command list."

patterns-established:
  - "Use a tiny one-phase scratch project for end-to-end runtime dogfood."
  - "Treat installer/runtime blockers found during dogfood as Phase 4 blockers, fix them, rebuild a fresh disposable env, and retry."
  - "Keep the install validation roster separate from the profiled-agent roster so unprofiled retained agents are still checked."

requirements-addressed: [MR-01]
requirements-completed: [MR-01]

duration: operator-driven
completed: 2026-04-30
---

# Phase 04 Plan 08: MR-01 Dogfood Summary

**MR-01 is approved. Claude Code drove the OTO core spine end-to-end in a disposable scratch project.**

## Performance

- **Started:** 2026-04-29T23:50:59Z (initial preflight)
- **Completed:** 2026-04-30T22:30:14Z
- **Tasks:** 2
- **Mode:** operator-driven human UAT

## Accomplishments

- Built and installed a fresh tarball into disposable paths only.
- Fixed three dogfood blockers before approval:
  - `oto-sdk` compatibility binary missing from the installed package.
  - Runtime support directories (`oto/workflows`, `oto/references`, `oto/templates`, `oto/contexts`) missing from Claude installs.
  - Agent install detection resolving from package location instead of `CLAUDE_CONFIG_DIR`.
- Fixed one post-approval review hardening issue:
  - Install validation now checks all 23 retained agents, not only the 17 agents with explicit model-profile rows.
- Confirmed the final disposable install had 23 agents, 296 manifest entries, and `agents_installed=true`.
- Ran the required MR-01 core spine:
  - `/oto:new-project`
  - `/oto:discuss-phase`
  - `/oto:plan-phase`
  - `/oto:execute-phase 1`
  - `/oto:verify-work 1`
  - `/oto:progress`
  - `/oto:pause-work`
  - `/oto:resume-work`
- Verified the scratch project completed cleanly:
  - Scratch Phase 01 verification passed: 4/4 must-haves.
  - Scratch UAT passed: 3/3.
  - Scratch code review was clean: 0 findings.
  - Pause/resume handoff worked after `/clear`.

## Task Commits

1. **Task 1: Prepare dogfood env and preflight evidence** - `865acbf`
2. **Task 1 blocker fix: ship oto-sdk compatibility binary** - `4254cf0`
3. **Task 1 retry docs: include temp PATH** - `e4869c6`
4. **Task 1 blocker fix: install workflow support payload** - `b3a64e2`
5. **Task 1 blocker fix: resolve agent install detection** - `351408c`

## Dogfood Evidence

| Evidence | Value |
|----------|-------|
| Scratch project | `/tmp/oto-mr01-rerun3-qbykSp` |
| Claude config | `/tmp/oto-mr01-rerun3-qbykSp/.claude` |
| Temp install prefix | `/tmp/oto-bin-prefix-rerun3-ixTeAl` |
| Claude Code version | `2.1.123 (Claude Code)` |
| Installed agents | 23 |
| Manifest entries | 296 |
| `init.new-project` agent status | `agents_installed=true`, `missing_agents=[]` |
| Scratch UAT | 3 passed, 0 issues |
| Scratch verification | passed, 4/4 must-haves |
| Scratch code review | clean, 0 findings |
| Cleanup | temp project, prefix, pack dir, and npm cache removed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed `oto-sdk` into the packed distribution**
- **Issue:** `/oto:new-project` failed because `oto-sdk` was not available inside the disposable Claude session.
- **Fix:** Shipped the compatibility binary through the package tarball.
- **Verification:** Fresh retry reached the new-project workflow.
- **Committed in:** `4254cf0`

**2. [Rule 3 - Blocking] Installed support payload directories for Claude**
- **Issue:** Commands resolved `oto-sdk` but could not load support docs referenced under `oto/workflows`, `oto/references`, `oto/templates`, and `oto/contexts`.
- **Fix:** Extended runtime adapters to install support payload directories and updated MR-01 smoke coverage.
- **Verification:** Fresh retry found command, workflow, reference, template, context, and manifest entries.
- **Committed in:** `b3a64e2`

**3. [Rule 3 - Blocking] Resolved installed agents from runtime config dir**
- **Issue:** `init.new-project` warned that agents were missing even though 23 `oto-*.md` files existed under the disposable Claude config.
- **Fix:** `getAgentsDir()` now prefers runtime config env vars such as `CLAUDE_CONFIG_DIR`; dropped `oto-pattern-mapper` was removed from `MODEL_PROFILES`.
- **Verification:** Fresh retry reported `agents_installed=true`, `missing_agents=[]`; Phase 4 test glob passed 14/14.
- **Committed in:** `351408c`

**4. [Rule 2 - Missing Critical] Check all retained agents during install validation**
- **Issue:** The post-dogfood code review found `checkAgentsInstalled()` still derived its expected list from `MODEL_PROFILES`, which intentionally omits retained agents that inherit the runtime default model (`oto-code-reviewer`, `oto-code-fixer`, `oto-domain-researcher`, etc.).
- **Fix:** Added an explicit `EXPECTED_AGENTS` roster with all 23 retained agents and made install validation use that roster instead of the profiled subset.
- **Verification:** `EXPECTED_AGENTS` matches `tests/fixtures/phase-04/retained-agents.json` exactly; missing-agent checks now include `oto-code-reviewer` and still exclude dropped `oto-pattern-mapper`; focused Phase 4 tests passed.
- **Committed in:** `95262de`

**Total deviations:** 3 blocking dogfood issues fixed before approval; 1 review hardening issue fixed before phase verification.

## Issues Encountered

- The scratch project's `/oto:progress` suggested `/clear` and `/oto:complete-milestone`. The operator ran `/clear` for pause/resume validation but intentionally did not run `/oto:complete-milestone` because milestone closeout is outside MR-01's blocking command list.
- Research-before-planning was intentionally declined for this tiny scratch project. MR-01 validates the required core spine, not research-heavy planning.

## User Setup Required

None. The disposable dogfood environment was removed after evidence capture.

## Next Phase Readiness

Phase 4 can proceed to phase-level verification and closeout. MR-01 is satisfied for Claude Code daily-use stability at the Phase 4 boundary.

## Self-Check: PASSED

- `04-HUMAN-UAT.md` exists with `Status: APPROVED`, transcript summary, sign-off, and cleanup evidence.
- `04-VERIFICATION.md` contains MR-01 preflight, blocker/fix history, and post-dogfood technical evidence.
- Disposable temp project, install prefix, pack dir, and npm cache were removed after evidence capture.
- Phase 4 automated test glob passed: 14/14.

---
*Phase: 04-core-workflows-agents-port*
*Completed: 2026-04-30*
