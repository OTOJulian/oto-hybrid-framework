---
phase: quick-260716-qbp
plan: 01
subsystem: verification
tags: [oto-verifier, execute-phase, liveness, heartbeat, runtime-sync, drift-guard]
requires:
  - phase: quick-260714-nzr
    provides: "runtime-sync pattern (straight-copy for runtime-neutral files; edit-in-place for Codex agent files; .toml sidecar handling; Gemini skip)"
provides:
  - "oto-verifier operational_requirements: per-requirement heartbeat log, non-interactive command discipline, human_needed fallback for non-runnable gates"
  - "execute-phase verify_phase_goal states an explicit verification_scope (full sweep first pass; closure-changed files + prior-blocker reproductions on re-verification)"
  - "Bounded verifier liveness policy (30-min external timeout, 10-min heartbeat silence = stall, one respawn max, inline on second stall, never a third verifier)"
  - "Runtime-sync drift guard: scripts/check-runtime-sync.cjs + npm-test enforcement + CLAUDE.md rule"
affects: [verification, execute-phase-orchestration, runtime-sync]
tech-stack:
  added: []
  patterns: ["external liveness monitoring via heartbeat file", "one-directional repo->installed byte comparison with CI-safe skips", "claude-only runtime fence in instruction-file template"]
key-files:
  created:
    - scripts/check-runtime-sync.cjs
    - tests/check-runtime-sync.test.cjs
  modified:
    - oto/agents/oto-verifier.md
    - oto/workflows/execute-phase.md
    - CLAUDE.md
    - oto/templates/instruction-file.md
key-decisions:
  - "Agent invariant scoped to agents/*.md only; .toml sidecars excluded per prior in8/nzr decision (documented in a code comment)"
  - "Runtime Sync Guardrail lives in oto/templates/instruction-file.md inside a claude-only runtime fence — CLAUDE.md is render-generated and must byte-equal render(claude) (D-03 test)"
  - "Pre-existing ~/.codex workflow drift (autonomous.md, settings-integrations.md, lib/sdk-require.md) resolved by straight-copying the current repo versions"
patterns-established:
  - "Drift guard is one-directional (repo -> installed): extra installed files are never drift; agent bodies are never content-compared (runtime adaptations are legitimate)"
requirements-completed: [QUICK-260716-QBP]
duration: 11min
completed: 2026-07-16
---

# Quick Task 260716-qbp: Harden oto-verifier Operation and Add Runtime-Sync Drift Guard Summary

**oto-verifier now emits a per-requirement heartbeat log, runs every command non-interactively with timeouts, and downgrades non-runnable gates to human_needed; the execute-phase verifier spawn contract states an explicit verification_scope and a bounded liveness policy (30-min external timeout / 10-min heartbeat silence / one respawn max / inline on second stall); and a new test-enforced drift guard (scripts/check-runtime-sync.cjs) makes repo-vs-installed-root divergence a detectable failure — all synced to ~/.claude and ~/.codex, Gemini skipped (no install)**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-07-16T23:05:36Z
- **Completed:** 2026-07-16T23:16:00Z
- **Tasks:** 3
- **Files modified:** 6 repo files (committed) + 9 installed files (outside repo, not committed)

## Accomplishments

- Inserted `<operational_requirements>` between `</core_principle>` and `<verification_process>` in `oto/agents/oto-verifier.md`: progress heartbeat (`{ISO-8601 timestamp} {requirement ID} {verdict}` appended to `{phase-dir}/{phase}-VERIFICATION-progress.log` after every requirement check), non-interactive-only command execution (stdin closed/piped + per-command timeout), and human_needed fallback for gates that cannot run non-interactively
- `verify_phase_goal` in `oto/workflows/execute-phase.md` now determines `verification_scope` BEFORE spawning (first verification = full sweep; re-verification = closure-changed files + prior-blocker reproductions, mirroring Phase 15's `verification_scope` frontmatter key) and states it in the Task spawn prompt
- Added the VERIFIER LIVENESS POLICY blockquote adjacent to the ORCHESTRATOR RULE: external 30-min timeout, 10+ min of heartbeat-file silence = stall, kill+respawn at most once, second stall = inline verification, never a third verifier
- Shipped `scripts/check-runtime-sync.cjs`: one-directional (repo → installed) byte comparison of `oto/workflows/` and `oto/references/` (including subdirs) per runtime root, plus the `adversarial_stance` → `model-calibration` invariant on installed `agents/*.md`; skips roots without an oto install (CI-safe); `tests/check-runtime-sync.test.cjs` enforces exit 0 under `npm test`
- Live-fixture proof: pre-sync the script exited 1 reporting exactly the expected drift set (5 items: `~/.claude` execute-phase.md differs; `~/.codex` execute-phase.md + autonomous.md + settings-integrations.md differ, lib/sdk-require.md missing; `~/.gemini` skipped)
- Added the Runtime Sync Guardrail rule to CLAUDE.md via its template source (see Deviations)

## Task Commits

1. **Task 1: verifier operation + spawn contract + CLAUDE.md rule** - `64d19e0` (feat)
2. **Task 2: runtime-sync drift guard script + test** - `7d34621` (feat)
3. **Deviation fix: Runtime Sync Guardrail moved into instruction-file template source** - `7060458` (fix)

Task 3's writes are all outside the repo (installed runtime roots) — no repo commit.

## Runtime Sync Actions (Task 3, per root)

**~/.claude (straight-copy branch):**
- Pre-copy check: both installed files still byte-matched the pre-Task-1 repo versions (`git show HEAD~2:...` diff clean) — no drift since planning
- Copied repo `oto/agents/oto-verifier.md` → `~/.claude/agents/oto-verifier.md` (`diff -q` identical)
- Copied repo `oto/workflows/execute-phase.md` → `~/.claude/oto/workflows/execute-phase.md` (`diff -q` identical)

**~/.codex (edit-in-place for agent; straight copy for workflows):**
- `~/.codex/agents/oto-verifier.md`: inserted the identical `<operational_requirements>` section at the same anchor (`</core_principle>` line 62 → `<verification_process>` line 64); Codex adaptations untouched
- `~/.codex/agents/oto-verifier.toml`: inserted the same section at the same anchor inside `developer_instructions`; no other TOML keys touched
- Straight-copied repo `oto/workflows/execute-phase.md` → `~/.codex/oto/workflows/execute-phase.md` (`diff -q` identical)
- Resolved pre-existing drift: straight-copied repo `oto/workflows/autonomous.md` and `oto/workflows/settings-integrations.md` over the stale copies; created `~/.codex/oto/workflows/lib/` and copied `sdk-require.md` into it (all `diff -q` identical)

**~/.gemini:** gemini: no install, skipped. Re-checked at execution time — `~/.gemini/oto` does not exist.

## Decisions Made

- Agent invariant applies to `agents/*.md` only; all 9 `~/.codex` `.toml` sidecars deliberately carry `adversarial_stance` without `model-calibration` (in8/nzr precedent), documented in a code comment (per the plan's flagged planning decision)
- The Runtime Sync Guardrail section is fenced `<!-- runtime:claude -->` in the template so AGENTS.md and GEMINI.md remain byte-identical (kept the commit scope as tight as possible)
- Template blank lines placed BEFORE the runtime fence because the fence stripper consumes trailing whitespace — this keeps non-claude renders byte-identical to their committed files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Runtime Sync Guardrail had to land in the instruction-file template, not directly in CLAUDE.md**
- **Found during:** Task 3 full verification (`npm test` gate)
- **Issue:** The plan's Task 1c instructed a direct CLAUDE.md edit, but CLAUDE.md is render-generated from `oto/templates/instruction-file.md` (its header says "Do not edit"; test D-03 `regen-diff` asserts `render('claude')` byte-equals committed CLAUDE.md). The direct edit broke that test (912 pass / 1 fail).
- **Fix:** Added the section to `oto/templates/instruction-file.md` inside a claude-only runtime fence and regenerated CLAUDE.md via `node scripts/render-instruction-files.cjs`. AGENTS.md and GEMINI.md render byte-identical to their committed versions (verified via `git status`), so the commit widened by exactly ONE file — the mandatory source of truth for the plan-locked CLAUDE.md change. This follows the repo's own generated-file convention, which takes precedence over the plan's literal edit instruction.
- **Files modified:** `oto/templates/instruction-file.md`, `CLAUDE.md` (regenerated)
- **Commit:** `7060458`

## Verification Results

- `grep -c "VERIFICATION-progress"`: 1 in repo `oto/agents/oto-verifier.md`, `~/.claude/agents/oto-verifier.md`, `~/.codex/agents/oto-verifier.md`, `~/.codex/agents/oto-verifier.toml`; also present in `oto/workflows/execute-phase.md`
- `grep -c "verification_scope"`: 4 in repo `oto/workflows/execute-phase.md`, `~/.claude/oto/workflows/execute-phase.md`, `~/.codex/oto/workflows/execute-phase.md`
- `grep -c "check-runtime-sync" CLAUDE.md`: 1
- Cross-runtime path check: 0 `~/.claude` occurrences in the edit-in-place `~/.codex/agents/oto-verifier.md` and `.toml`
- `node scripts/check-runtime-sync.cjs`: exit 0 (`ok: ~/.claude`, `ok: ~/.codex`, `skip: ~/.gemini (no oto install)`)
- `npm test`: 916 tests, 913 pass, 3 skipped (pre-existing), 0 failures — includes the new runtime-sync test
- Commit-scope audit: the 3 commits touch exactly `oto/agents/oto-verifier.md`, `oto/workflows/execute-phase.md`, `scripts/check-runtime-sync.cjs`, `tests/check-runtime-sync.test.cjs`, `CLAUDE.md`, `oto/templates/instruction-file.md` (documented deviation); no deletions; no untracked files left behind

## Issues Encountered

- Worktree branch base did not match the expected commit at startup; corrected with the mandated `git reset --hard 094e4c7` before any work (pre-dispatch plan commit became HEAD)
- First template-fence attempt caused whitespace-only churn in AGENTS.md/GEMINI.md (fence stripper eats trailing blank lines); fixed by placing the separator blank lines before the fence — both files byte-identical to committed state in the final render

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Verifier stalls are now observable (heartbeat file) and bounded (liveness policy) — directly addresses the Phase 15 P10 13h 31m stall
- Repo-vs-runtime-root divergence is now a failing test instead of silent drift; the guard also fixed 3 pre-existing stale files under `~/.codex`
- Follow-up candidate (from the plan's flagged decision): bring `~/.codex` `.toml` sidecars under the model-calibration invariant if desired — separate quick task

## Self-Check: PASSED

- SUMMARY.md exists at the expected path
- `scripts/check-runtime-sync.cjs` and `tests/check-runtime-sync.test.cjs` exist
- Commits `64d19e0`, `7d34621`, `7060458` exist in `git log`
- Working tree clean apart from this SUMMARY.md (orchestrator commits docs artifacts)

---
*Phase: quick-260716-qbp*
*Completed: 2026-07-16*
