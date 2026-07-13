---
phase: quick-260713-ffa
plan: 01
subsystem: framework-prompts
tags: [review-calibration, gap-closure, convergence, agents, workflows]

# Dependency graph
requires:
  - phase: 14 (retro evidence)
    provides: Demonstrated runaway gap-closure loops that motivated the bounded-convergence contract
provides:
  - oto/references/model-calibration.md — severity anchor + convergence rules for the Claude 5 / GPT-5.6 model generation
  - required_reading wiring of model-calibration.md into oto-code-reviewer and oto-verifier
  - Removal of severity-inflating "go soft" bullet lists from both review agents
  - Bounded-convergence contract in execute-phase.md gaps_found handling (max 2 cycles, stalled-blocker stop, DISPOSITIONS.md triage)
  - Disposition-aware --gaps planning in plan-phase.md (REVIEW.md/DISPOSITIONS.md reads, ACCEPT/DEFER exclusion, scoped re-review)
affects: [execute-phase, plan-phase, code-review, verification, gap-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Central severity/convergence anchor loaded via required_reading in review agents"
    - "Bounded convergence: max 2 gap cycles, then DISPOSITIONS.md developer triage"

key-files:
  created:
    - oto/references/model-calibration.md
  modified:
    - oto/agents/oto-code-reviewer.md
    - oto/agents/oto-verifier.md
    - oto/workflows/execute-phase.md
    - oto/workflows/plan-phase.md

key-decisions:
  - "Scoped the 'go soft' removal gate to the two in-scope agents; seven other agent files also contain the phrase but are locked out of scope"
  - "Gap-mode planner block gated with ${MODE === 'gap_closure' ? ...} mirroring the file's existing template-conditional idiom"

patterns-established:
  - "model-calibration.md as single source of truth for review severity tiers and convergence rules"

requirements-completed: [QUICK-260713-FFA]

# Metrics
duration: 9min
completed: 2026-07-13
---

# Quick Task 260713-ffa: Recalibrate Review Machinery Severity & Convergence Summary

**Severity anchor (model-calibration.md) wired into both review agents plus a bounded-convergence contract (max 2 gap cycles → DISPOSITIONS.md triage) in execute-phase and plan-phase gap mode**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-13T15:11:10Z
- **Completed:** 2026-07-13T15:20:00Z
- **Tasks:** 3
- **Files modified:** 5 repo files (+5 installed copies under ~/.claude)

## Accomplishments

- Created `oto/references/model-calibration.md` with the exact user-specified body: personal-tool threat model, Critical/Warning/Info severity tiers, and convergence rules (max 2 gap-closure cycles, disposition-aware re-reviews)
- Wired the calibration reference into `oto-verifier.md` (existing `<required_reading>` block) and `oto-code-reviewer.md` (new `<required_reading>` block after `</role>`)
- Deleted the severity-inflating "go soft" failure-mode bullet lists from both agents while preserving the FORCE stance paragraphs and Required finding classification blocks intact
- Added the bounded-convergence contract to `execute-phase.md` gaps_found handling: routing table now notes the cycle-count precondition; the gaps_found block counts prior `gap_closure: true` plans / re-verification history and routes to `{phase_num}-DISPOSITIONS.md` (FIX/ACCEPT/DEFER with evidence) developer triage after 2 cycles or non-decreasing blockers; gap-cycle description states the bound explicitly
- Added disposition awareness to `plan-phase.md` --gaps mode: planner prompt reads prior REVIEW.md/DISPOSITIONS.md, excludes ACCEPT/DEFER findings from new plans, and scopes the re-review to files changed by gap plans
- Synced all five files to their installed counterparts under ~/.claude — all `diff -q` clean (byte-identical)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create model-calibration.md and wire into review agents** - `a9de198` (feat)
2. **Task 2: Bounded-convergence contract in execute-phase.md and plan-phase.md** - `3a570b4` (feat)
3. **Task 3: Sync installed copies + verification** - no repo changes (writes only under ~/.claude; verification gates run)

## Files Created/Modified

- `oto/references/model-calibration.md` - Severity & convergence anchor (verbatim user-specified body)
- `oto/agents/oto-verifier.md` - Added model-calibration.md to required_reading; removed 5 "go soft" bullets + heading
- `oto/agents/oto-code-reviewer.md` - New required_reading block referencing model-calibration.md; removed 5 "go soft" bullets + heading
- `oto/workflows/execute-phase.md` - Bounded-convergence contract in gaps_found routing, presentation block, and cycle description
- `oto/workflows/plan-phase.md` - REVIEW.md/DISPOSITIONS.md added to gap-mode files_to_read; gap_mode_dispositions planner block
- `~/.claude/oto/references/model-calibration.md`, `~/.claude/agents/oto-code-reviewer.md`, `~/.claude/agents/oto-verifier.md`, `~/.claude/oto/workflows/execute-phase.md`, `~/.claude/oto/workflows/plan-phase.md` - installed copies, byte-identical to repo

## Decisions Made

- Used `${MODE === 'gap_closure' ? ... : ''}` template conditional for the gap-mode planner block, mirroring the file's existing `${TDD_MODE === 'true' ? ...}` idiom
- Wrote "ACCEPT or DEFER" as plain text (no bold markers between the words) so the plan's literal grep gate matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scoped the "go soft" verification gate to in-scope agents**
- **Found during:** Task 1 verification
- **Issue:** The plan's gate `! grep -rn "go soft" oto/agents/` fails because seven OTHER agent files (oto-doc-verifier, oto-ui-auditor, oto-security-auditor, oto-plan-checker, oto-nyquist-auditor, oto-integration-checker, oto-eval-auditor) also contain "go soft" bullet lists — but the plan's locked scope forbids touching them, and the must_haves truth only requires the two target agents to be clean
- **Fix:** Ran the gate scoped to `oto/agents/oto-code-reviewer.md` and `oto/agents/oto-verifier.md` (both clean); did NOT modify the out-of-scope agents
- **Files modified:** none beyond plan scope
- **Verification:** `grep -n "go soft" oto/agents/oto-code-reviewer.md oto/agents/oto-verifier.md` → no matches
- **Committed in:** a9de198 (Task 1 commit)

**2. [Rule 1 - Bug] Removed duplicate `</role>` tag introduced by the required_reading insertion**
- **Found during:** Task 1 (oto-code-reviewer.md edit)
- **Issue:** Inserting the new block left two `</role>` closing tags
- **Fix:** Removed the stray duplicate; structure now `</role>` → `<required_reading>` → `<adversarial_stance>`
- **Files modified:** oto/agents/oto-code-reviewer.md
- **Verification:** Single `</role>` in file; verification greps pass
- **Committed in:** a9de198 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking gate-scope correction, 1 self-introduced structural bug)
**Impact on plan:** No scope creep; all five in-scope files match the plan's must_haves.

## Issues Encountered

- `npm test` regenerates `reports/rebrand-dryrun.{json,md}` as a side effect (dry-run against empty input); restored both to committed state after each run to keep the tree clean.

## Deferred Issues

- **Pre-existing test failure (out of scope):** `tests/13-oto-root-guard.test.cjs` — "phase-13 guard: moved STATE.md declares oto_state_version (D-06)" fails because `.oto/STATE.md` declares `gsd_state_version: 1.0` instead of `oto_state_version`. Confirmed pre-existing at both the worktree base commit (2bb81c3) and main HEAD (a305f6b); unrelated to this task's prompt-text changes. npm test result: 735 pass / 1 fail (this one) / 3 skipped.
- **"go soft" bullet lists remain in 7 out-of-scope agent files** (oto-doc-verifier, oto-ui-auditor, oto-security-auditor, oto-plan-checker, oto-nyquist-auditor, oto-integration-checker, oto-eval-auditor). A follow-up quick task could apply the same recalibration if desired.

## TDD Gate Compliance

Not applicable — prompt-text-only change, plan type `execute`, no tdd tasks.

## Known Stubs

None — no code paths or UI; pure prompt/reference text.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Review agents now load the calibration anchor on every run; installed copies in lockstep with repo
- The Phase 14-style runaway loop is structurally bounded: after 2 gap cycles or a stalled blocker count, workflows route to DISPOSITIONS.md developer triage

## Self-Check: PASSED

- All 5 repo files exist; commits a9de198 and 3a570b4 present in git log
- No file deletions in either commit (`git diff --diff-filter=D 2bb81c3..HEAD` empty)
- All 5 installed copies under ~/.claude byte-identical to repo (`diff -q` clean)
- Working tree clean except this SUMMARY.md (left uncommitted for orchestrator docs commit)

---
*Phase: quick-260713-ffa*
*Completed: 2026-07-13*
