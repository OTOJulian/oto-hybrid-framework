---
phase: quick
plan: 260709-ks5
subsystem: hooks
tags: [codex, session-start, pretooluse, bash, node-test, hookSpecificOutput]

requires: []
provides:
  - Codex-compatible SessionStart hook envelope (hookSpecificOutput.{hookEventName,additionalContext})
  - stderr block-reason surfacing for oto-validate-commit.sh's 7 exit-2 blocking sites
  - Confirmed schema-valid audit of oto-prompt-guard.js, oto-read-injection-scanner.js, oto-context-monitor.js for Codex
  - Re-synced live ~/.codex/hooks/ install at oto-hook-version 0.4.1
affects: [codex-runtime, session-start-hook, pretooluse-hook, hook-schema-compat]

tech-stack:
  added: []
  patterns:
    - "Runtime-detection cascade order matters: Cursor -> Claude -> Codex (new) -> shared fallback (Gemini/Copilot/unknown)"
    - "Codex exit-code-2 contract: stderr carries the block reason as plain text; stdout is not parsed on exit 2"
    - "Hardcode literal (non-interpolated) stderr echo lines to avoid leaking untrusted commit-message content into logs"

key-files:
  created: []
  modified:
    - oto/hooks/oto-session-start
    - tests/05-session-start.test.cjs
    - oto/hooks/oto-validate-commit.sh
    - tests/05-validate-commit.test.cjs

key-decisions:
  - "CODEX_HOME is used as the Codex-detection signal (Codex's own config-dir env var), inserted as a new elif branch between the existing Claude and fallback branches; Cursor/Claude/fallback branches are untouched."
  - "Accepted risk: CODEX_HOME is a persistent env var a user could export globally, so the new elif branch could theoretically fire under a non-Codex session (e.g. Gemini/Copilot) launched from a shell with CODEX_HOME set. No reliable negative marker exists to guard against this, so it is documented (code comment + this SUMMARY) rather than mitigated."
  - "All 7 new stderr echo lines in oto-validate-commit.sh are hardcoded literal strings with zero variable interpolation, to avoid any risk of echoing untrusted commit-message text into stderr/logs."
  - "The COMMIT_STATUS -ne 0 generic fallback site (site 4) is unreachable via crafted command text alone because the embedded Node tokenizer never throws for any input; tested it by swapping in a zero-argument node wrapper that forces the parser invocation to fail abnormally, distinguishing it from the other node -e invocations in the same script."
  - "Live ~/.codex/hooks/ install (oto-session-start, oto-validate-commit.sh) was manually re-synced from the rebuilt dist output via {{OTO_VERSION}} token substitution (0.4.1), not a fresh `oto install` run, keeping the change scoped to only the two affected files per plan constraints."

patterns-established:
  - "New runtime-detection branches for hooks should be inserted between existing branches (never replacing/reordering), with an explanatory comment documenting both the schema requirement being satisfied and any accepted false-positive risk from the env-var signal used."

requirements-completed:
  - ks5-sessionstart-schema
  - ks5-validate-commit-stderr
  - ks5-hook-audit-resync

duration: 8min
completed: 2026-07-09
---

# Quick Task 260709-ks5: Fix Codex SessionStart Hook JSON Schema Summary

**Added an explicit CODEX_HOME branch to oto-session-start emitting Codex 0.144.0's required nested `hookSpecificOutput` envelope, added stderr block-reason echoes to all 7 exit-2 sites in oto-validate-commit.sh for Codex's stderr-as-reason exit-2 contract, confirmed the 3 remaining Codex-registered hooks are already schema-valid, and re-synced the live `~/.codex/hooks/` install.**

## Performance

- **Duration:** ~8 min (plan-authoring commit 15:17:32 to Task 2 commit 15:23:07, plus Task 3 audit/resync/regression)
- **Started:** 2026-07-09T19:17:32Z
- **Completed:** 2026-07-09T19:24:45Z
- **Tasks:** 3 completed
- **Files modified:** 4 (2 source hooks, 2 test files) + 2 out-of-repo live install files

## Accomplishments
- `oto-session-start` now emits Codex 0.144.0's required `{hookSpecificOutput:{hookEventName,additionalContext}}` envelope under Codex (detected via `CODEX_HOME`), instead of falling through to the flat shape that Codex's `deny_unknown_fields` parser silently rejected — oto's identity/context injection now actually reaches the model under Codex.
- `oto-validate-commit.sh` now surfaces its block reason on stderr (plain literal text) on all 7 existing exit-2 blocking sites, matching Codex's "exit code 2 → stderr is the reason" PreToolUse contract, while leaving the existing stdout JSON (Claude's format) untouched.
- Confirmed via source audit that `oto-prompt-guard.js`, `oto-read-injection-scanner.js`, and `oto-context-monitor.js` already emit Codex-schema-valid `hookSpecificOutput` shapes for their registered PreToolUse/PostToolUse events — no code changes needed.
- Re-synced the live `~/.codex/hooks/oto-session-start` and `~/.codex/hooks/oto-validate-commit.sh` (previously stale at `oto-hook-version: 0.3.0`) from the rebuilt dist output, now at `0.4.1`, so the actual running Codex install carries both fixes.
- `npm test` passes with 636 pass, 3 skipped, 0 failures after all changes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add explicit Codex branch to oto-session-start (CODEX_HOME signal) plus regression tests** - `eecc00f` (feat)
2. **Task 2: Fix oto-validate-commit.sh to surface block reason on stderr (Codex exit-2 contract)** - `8806d1e` (fix)
3. **Task 3: Audit remaining 3 Codex-registered hooks, resync live ~/.codex/hooks/ install, full regression** - no repo-file changes (read-only audit + out-of-repo resync + verification only); see "Live Install Resync" below.

_Task 3 modified files outside the repo (`~/.codex/hooks/oto-session-start`, `~/.codex/hooks/oto-validate-commit.sh`) per explicit plan authorization; these are not tracked by this git repository and therefore have no commit hash._

## Files Created/Modified
- `oto/hooks/oto-session-start` - Inserted new `elif [ -n "${CODEX_HOME:-}" ]` branch between the Claude and fallback branches, emitting the nested `hookSpecificOutput` envelope for Codex.
- `tests/05-session-start.test.cjs` - Added 2 regression tests: Codex-branch envelope shape (single top-level key, correct `hookEventName`), and Claude-branch priority when both `CLAUDE_PLUGIN_ROOT` and `CODEX_HOME` are set.
- `oto/hooks/oto-validate-commit.sh` - Added a static-literal `echo "<reason>" >&2` immediately before each of the 7 existing `exit 2` sites, with no variable interpolation.
- `tests/05-validate-commit.test.cjs` - Extended the 4 existing exit-2 tests with stderr assertions (sites 1, 2, 5, 6, 7); added 2 new tests covering the 2 previously-untested sites (subject >72 chars, and the generic parse-failure fallback, per plan-checker feedback).
- `oto/hooks/dist/oto-session-start`, `oto/hooks/dist/oto-validate-commit.sh` - Regenerated via `node scripts/build-hooks.js` (gitignored build artifacts, not committed).
- `~/.codex/hooks/oto-session-start`, `~/.codex/hooks/oto-validate-commit.sh` (outside repo) - Re-synced from dist with `{{OTO_VERSION}}` substituted to `0.4.1`.

## Decisions Made
- Used `CODEX_HOME` as the Codex-detection signal for the new SessionStart branch (see key-decisions in frontmatter for the accepted false-positive risk and rationale).
- Kept all 7 new stderr lines as hardcoded literals (no `$CMD`/`$message` interpolation) to eliminate any risk of echoing untrusted commit-message content into stderr/logs — satisfies threat T-ks5-02's `mitigate` disposition.
- Devised a targeted test technique (zero-argument `node` wrapper swapped into `PATH`) to exercise the otherwise-unreachable `COMMIT_STATUS -ne 0` generic fallback site, since the embedded tokenizer has no natural throw path for any crafted command text.
- Performed the live `~/.codex/hooks/` resync as a manual token-substituted file copy (not a full `oto install` run), per plan scope — touches only the two affected files, not `config.toml`/`AGENTS.md`/other installed artifacts.

## CODEX_HOME False-Positive Risk (Accepted, Documented)

Per the plan checker's warning: `CODEX_HOME` is a persistent config-dir environment variable that a user could export globally in their shell profile (analogous to `CLAUDE_CONFIG_DIR` or `GEMINI_CONFIG_DIR`). Because oto's runtime-detection cascade in `oto-session-start` relies purely on env-var presence (no process-identity or handshake signal is available to hooks), the new Codex `elif` branch could in principle fire during a non-Codex session (e.g., Gemini CLI or Copilot CLI) launched from a shell where `CODEX_HOME` happens to be set from an unrelated prior Codex configuration.

- **No reliable negative marker exists** to distinguish "Codex is genuinely the invoking runtime" from "CODEX_HOME is merely present in the environment" — hooks receive no invoking-process metadata beyond the env vars the runtime itself sets.
- **Disposition: accept.** This mirrors threat T-ks5-01 in the plan's STRIDE register (Tampering, disposition `accept`) — `CODEX_HOME` is read-only detection sourced from the (potentially stale) shell environment, not from parsed/untrusted tool input, so there is no security exposure, only a narrow behavioral edge case.
- **Precedence order mitigates impact:** Cursor and Claude branches are checked first (via `CURSOR_PLUGIN_ROOT` / `CLAUDE_PLUGIN_ROOT`), so a genuine Claude or Cursor session with a stray `CODEX_HOME` set would still get the correct branch. The edge case is narrowed to Gemini/Copilot sessions specifically, which already share the same flat-envelope fallback shape as the pre-fix Codex path — meaning in the worst case, such a session would receive the nested envelope instead of the flat one. Given Gemini's SessionStart output-shape contract is undocumented anywhere in this repo (per the plan's `<interfaces>` note), this is a low-impact edge case, not a correctness regression against any confirmed contract.
- **Where documented:** inline code comment on the new `elif` branch in `oto/hooks/oto-session-start`, and here in the SUMMARY per the plan checker's explicit instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Plan-checker warning, incorporated as in-scope addition] Extended test coverage for the 2 previously-untested exit-2 sites in oto-validate-commit.sh**
- **Found during:** Task 2 (before implementation, per dispatch-time checker feedback)
- **Issue:** The plan's originally-specified 4 test extensions covered only 5 of the 7 exit-2 stderr sites (sites 1, 2, 5, 6, 7); sites 3 (subject >72 chars) and 4 (generic `COMMIT_STATUS -ne 0` parse-failure fallback) had no test coverage.
- **Fix:** Added 2 new tests: one exercising site 3 directly with a >72-char conventional-format subject; one exercising site 4 via a zero-argument `node` wrapper swapped into `PATH` that forces the embedded parser invocation to fail abnormally (since the tokenizer has no natural throw path for any crafted command text), distinguishing it from the script's other `node -e ...` calls by argument count.
- **Files modified:** `tests/05-validate-commit.test.cjs`
- **Verification:** Both new tests pass; full `tests/05-validate-commit.test.cjs` suite (9 tests) passes.
- **Committed in:** `8806d1e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (dispatch-time checker warning, incorporated as instructed)
**Impact on plan:** Closes the test-coverage gap flagged by the plan checker with no scope creep — no production code paths were added beyond what the plan's Task 2 action already specified; only test coverage was extended.

## Issues Encountered
None beyond the CODEX_HOME false-positive risk, which was a known-and-accepted item flagged by the plan checker and documented above (not an issue requiring resolution).

## User Setup Required
None - no external service configuration required. The live `~/.codex/hooks/` resync was performed by the executor per explicit plan/user authorization (out-of-repo write, Codex-only, scoped to the two affected files).

## Next Phase Readiness
- Codex 0.144.0 now receives a schema-valid SessionStart envelope; oto's identity/context injection is unblocked for Codex users.
- `oto-validate-commit.sh`'s block reasons now reach Codex users via stderr on all 7 blocking paths.
- All 3 remaining Codex-registered hooks confirmed already schema-valid; no follow-up needed unless Codex's wire schema changes upstream.
- No blockers. This is a standalone quick task; no downstream phase depends on it structurally.

---
*Phase: quick*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: oto/hooks/oto-session-start
- FOUND: tests/05-session-start.test.cjs
- FOUND: oto/hooks/oto-validate-commit.sh
- FOUND: tests/05-validate-commit.test.cjs
- FOUND: commit eecc00f (Task 1)
- FOUND: commit 8806d1e (Task 2)
- FOUND: live ~/.codex/hooks/oto-session-start at oto-hook-version 0.4.1
- FOUND: live ~/.codex/hooks/oto-validate-commit.sh at oto-hook-version 0.4.1
