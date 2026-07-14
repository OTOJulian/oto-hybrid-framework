---
phase: quick-260714-nzr
plan: 01
subsystem: agents
tags: [review-agents, model-calibration, required-reading, adversarial-stance, codex-sync]
requires:
  - phase: quick-260713-ffa
    provides: "model-calibration.md reference + finished recalibration pattern in oto-code-reviewer.md and oto-verifier.md"
provides:
  - "All 9 oto review/audit agents now load model-calibration.md via required_reading (7 added here)"
  - "'go soft' failure-mode bullet lists eradicated from repo and all installed runtime copies (.md and .toml)"
  - "ROADMAP.md Phase 14 milestone checkbox checked with completion date"
affects: [review-machinery, verification, agent-sync]
tech-stack:
  added: []
  patterns: ["required_reading calibration anchor for review agents", "runtime-rooted reference paths (~/.claude vs ~/.codex, never cross-runtime)"]
key-files:
  created: []
  modified:
    - oto/agents/oto-plan-checker.md
    - oto/agents/oto-security-auditor.md
    - oto/agents/oto-doc-verifier.md
    - oto/agents/oto-ui-auditor.md
    - oto/agents/oto-nyquist-auditor.md
    - oto/agents/oto-integration-checker.md
    - oto/agents/oto-eval-auditor.md
    - .oto/ROADMAP.md
key-decisions:
  - "Single atomic commit for all 7 agents + ROADMAP per plan's Task 3 instruction (not per-task commits)"
  - "Codex .toml sidecars received deletion-only edits; no required_reading added to TOML (matches 260713-in8 handling)"
patterns-established:
  - "Runtime sync discipline: ~/.claude straight-copy when byte-identical pre-change; ~/.codex always edit-in-place with ~/.codex-rooted paths"
requirements-completed: [QUICK-260714-NZR]
duration: 6min
completed: 2026-07-14
---

# Quick Task 260714-nzr: Extend Review-Machinery Recalibration to Remaining 7 Review Agents Summary

**All 7 remaining review/audit agents (plan-checker, security-auditor, doc-verifier, ui-auditor, nyquist-auditor, integration-checker, eval-auditor) now load model-calibration.md via required_reading with their severity-inflating "go soft" bullet lists deleted — synced to ~/.claude (copy) and ~/.codex (edit-in-place, .md + .toml), plus the stale Phase 14 ROADMAP checkbox fixed**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-14T21:22:40Z
- **Completed:** 2026-07-14T21:28:00Z
- **Tasks:** 3
- **Files modified:** 8 repo files (committed) + 21 installed files (7 ~/.claude .md, 7 ~/.codex .md, 7 ~/.codex .toml — outside repo, not committed)

## Accomplishments

- Wired `model-calibration.md` into all 7 agents' `required_reading`, following each file's existing structural pattern: appended to plan-checker's @-style block, added a prose line to eval-auditor's block, and inserted a new block between the first `</role>` and `<adversarial_stance>` for the other 5
- Deleted every "Common failure modes — how {X} go soft" heading + 5 bullets + one adjacent blank line, leaving FORCE-stance paragraphs and Required finding classification blocks fully intact (verified 1 occurrence of each per file, repo and installed)
- Synced ~/.claude via straight copy (pre-copy drift check against pre-change git state passed for all 7; post-copy `diff -q` identical), and ~/.codex via edit-in-place with `~/.codex`-rooted calibration paths — zero `~/.claude` paths leaked into Codex files
- Applied deletion-only "go soft" removal to all 7 ~/.codex `.toml` sidecars' developer_instructions; no other TOML keys touched
- Fixed `.oto/ROADMAP.md` line 30: Phase 14 checkbox now `[x]` with ` — completed 2026-07-13` matching Phase 15's format

## Task Commits

Per the plan's Task 3 instruction, all repo changes landed in one atomic commit:

1. **Tasks 1-3: recalibration edits + ROADMAP fix + verification** - `4e69350` (feat)

Installed-root changes under ~/.claude and ~/.codex are direct filesystem edits outside the repo and are not committed.

## Files Created/Modified

- `oto/agents/oto-plan-checker.md` - calibration line added to existing @-style required_reading; go-soft block deleted
- `oto/agents/oto-security-auditor.md` - new required_reading block; go-soft block deleted
- `oto/agents/oto-doc-verifier.md` - new required_reading block (anchored on FIRST `</role>`; pre-existing stray `</role>` at EOF left untouched, tag count unchanged at 2); go-soft block deleted
- `oto/agents/oto-ui-auditor.md` - new required_reading block; go-soft block deleted
- `oto/agents/oto-nyquist-auditor.md` - new required_reading block; go-soft block deleted
- `oto/agents/oto-integration-checker.md` - new required_reading block; go-soft block deleted
- `oto/agents/oto-eval-auditor.md` - calibration prose line added to existing required_reading; go-soft block deleted
- `.oto/ROADMAP.md` - Phase 14 milestone checkbox checked with completion date 2026-07-13
- 21 installed files under `~/.claude/agents/` and `~/.codex/agents/` (outside repo)

## Decisions Made

- Followed the plan's single-atomic-commit instruction (Task 3) rather than per-task commits — Tasks 1 and 2 produce one coherent repo change set and Task 2 touches only files outside the repo
- Backed up all 14 ~/.codex files to the session scratchpad before scripted edit-in-place, as a recovery safety net (script validated 5-bullet block shape before deleting; zero errors)

## Deviations from Plan

None - plan executed exactly as written. All pre-verified planning facts held on re-verification (structural anchors, no ~/.claude drift, calibration references present in both runtime roots, doc-verifier stray `</role>` at EOF).

## Gemini Runtime

**gemini: no install, skipped.** Re-checked at execution time: `~/.gemini/oto` and `~/.gemini/agents` do not exist, so there is no oto install to sync (as planning found).

## Verification Results

- `grep "model-calibration"`: present in all 7 repo agents, all 7 ~/.claude copies, all 7 ~/.codex .md copies (21/21)
- `grep "go soft"`: zero matches under `oto/agents/`, across the 7 ~/.claude oto agent files, and across all 14 ~/.codex oto agent files (.md + .toml)
- FORCE stance and Required finding classification: exactly 1 occurrence each per file in repo, ~/.codex .md, and ~/.codex .toml
- Cross-runtime path check: zero `~/.claude` occurrences in edited ~/.codex .md files
- `npm test`: 915 tests, 912 pass, 3 skipped, 0 failures (rebrand-dryrun reports were NOT regenerated — no restore needed)
- `git diff --quiet` clean for `oto-code-reviewer.md`, `oto-verifier.md`, and `oto/workflows/`; no gsd-* file touched in any root
- Commit `4e69350` contains exactly the 7 agent files + `.oto/ROADMAP.md`; no file deletions

## Issues Encountered

None. (One environment note: the session shell is zsh with grep→ugrep, so verification commands used zsh arrays instead of unquoted word-split variables — no impact on outcomes.)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Review-machinery recalibration is now complete across all 9 review/audit agents in every installed runtime root — the 260713-ffa deferral is resolved
- ROADMAP milestone checkboxes now reflect reality for Phases 14 and 15

## Self-Check: PASSED

- SUMMARY.md exists at the expected path
- Commit `4e69350` exists and contains exactly the 8 in-scope repo files (23 insertions, 50 deletions, no file deletions)
- Working tree clean apart from this SUMMARY.md (orchestrator commits docs artifacts)

---
*Phase: quick-260714-nzr*
*Completed: 2026-07-14*
