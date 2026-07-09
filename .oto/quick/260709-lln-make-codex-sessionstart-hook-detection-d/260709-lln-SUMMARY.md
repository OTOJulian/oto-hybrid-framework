---
phase: quick
plan: 260709-lln
subsystem: hooks
tags: [codex, session-start, hooks, runtime-detection, argv-flag]

# Dependency graph
requires:
  - phase: quick-260709-ks5
    provides: nested hookSpecificOutput envelope shape required by Codex 0.144.0's deny_unknown_fields parser
provides:
  - Deterministic Codex SessionStart runtime detection via an installer-registered --codex argv flag (primary signal), with CODEX_HOME retained as a fallback for pre-flag installs
affects: [codex-hooks, oto-installer, runtime-codex]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "argv-flag runtime detection: installer-owned command strings can carry a deterministic flag instead of relying on ambient env vars that Codex never actually sets on hook subprocesses"

key-files:
  created: []
  modified:
    - oto/hooks/oto-session-start
    - oto/hooks/dist/oto-session-start (gitignored build artifact, rebuilt not committed)
    - tests/05-session-start.test.cjs
    - bin/lib/runtime-codex.cjs
    - tests/phase-03-install-codex.integration.test.cjs
    - ~/.codex/hooks/oto-session-start (out-of-repo, user-approved)
    - ~/.codex/config.toml (out-of-repo, user-approved; backed up to config.toml.bak-260709-lln)

key-decisions:
  - "Made --codex argv flag the PRIMARY Codex detection signal (installer fully owns the config.toml command string, so it's 100% deterministic) and demoted CODEX_HOME to a FALLBACK for pre-flag installs, since Codex does not inject CODEX_HOME into hook subprocesses per openai/codex source (command.envs(&handler.env) only applies per-hook configured env)."

patterns-established:
  - "Runtime-detection cascades that depend on ambient env vars should prefer an installer-owned command-line flag as the primary signal when the installer controls the invocation string."

requirements-completed: [lln-codex-argv-detection]

# Metrics
duration: ~5min
completed: 2026-07-09
---

# Quick Task 260709-lln: Codex SessionStart --codex argv detection Summary

**Codex SessionStart hook detection now keys off an installer-registered `--codex` argv flag as the primary signal instead of the CODEX_HOME env var, which Codex never actually sets on hook subprocesses.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-09T19:43:25Z
- **Completed:** 2026-07-09T19:47:33Z
- **Tasks:** 3
- **Files modified:** 6 (4 in-repo, 2 out-of-repo)

## Accomplishments
- `oto/hooks/oto-session-start` Codex branch now fires on `"${1:-}" = "--codex"` OR non-empty `CODEX_HOME`, with `"${1:-}"` used to stay safe under `set -u`.
- `bin/lib/runtime-codex.cjs` `buildHookEntries` appends ` --codex` to only the SessionStart command; all other hook command lines (PreToolUse/PostToolUse) remain byte-identical.
- Detection-matrix regression tests lock all four branch behaviors: `--codex` argv + clean env → envelope, CODEX_HOME fallback (regression) → envelope, no flag + clean env → flat fallback, Claude priority over Codex signals.
- Live `~/.codex/hooks/oto-session-start` and `~/.codex/config.toml` re-synced with the fix; config.toml backed up first.
- Full `npm test` green: 637 pass, 3 skip, 0 fail.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --codex argv flag as primary Codex signal in oto-session-start + detection-matrix tests** - `f422e60` (feat, TDD RED→GREEN)
2. **Task 2: Register --codex on the Codex SessionStart command in the installer + config.toml assertion** - `1fce5a7` (feat, TDD RED→GREEN)
3. **Task 3: Live ~/.codex sync + full regression** - out-of-repo writes only (no in-repo commit); verified via `npm test` and live-hook invocations below

**Plan metadata:** (docs commit handled by orchestrator, not this executor)

_Note: Both TDD tasks followed RED (test added, confirmed failing) → GREEN (implementation, test passes) in a single commit each, since the change was small and self-contained per task._

## Files Created/Modified
- `oto/hooks/oto-session-start` - Codex branch condition changed to check `--codex` argv first, CODEX_HOME as fallback; comment rewritten to document the new precedence and rationale
- `oto/hooks/dist/oto-session-start` - rebuilt via `node scripts/build-hooks.js` (gitignored, not committed)
- `tests/05-session-start.test.cjs` - `spawnHook` extended with an `args` parameter; new test for `--codex` argv + clean env
- `bin/lib/runtime-codex.cjs` - `buildHookEntries` SessionStart entry now appends ` --codex` to the command string
- `tests/phase-03-install-codex.integration.test.cjs` - new assertions locking the flagged SessionStart command and the unflagged oto-validate-commit.sh command
- `~/.codex/hooks/oto-session-start` (out-of-repo) - manual token-substituted copy of the rebuilt dist hook (`{{OTO_VERSION}}` → `0.4.1`), executable bit preserved
- `~/.codex/config.toml` (out-of-repo) - single SessionStart command line updated to append ` --codex`; backed up to `~/.codex/config.toml.bak-260709-lln` before editing

## Decisions Made
- Kept CODEX_HOME as an accepted fallback branch condition (not removed) per plan's threat register (T-lln-02), since removing it would break any Codex install that predates this fix and hasn't re-run `oto install`.
- Used `"${1:-}"` (not bare `$1`) to read argv 1, per plan's threat T-lln-03, so hooks invoked without arguments (Claude/Gemini registrations, or stale config.toml lines) never abort under `set -u`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Live `~/.codex` install was synced as part of Task 3 (explicitly user-approved out-of-repo writes per plan constraints).

## Next Phase Readiness
- Codex SessionStart detection is now deterministic for any fresh terminal session, closing the gap left by quick task 260709-ks5 (which fixed the JSON schema shape but still depended on CODEX_HOME being coincidentally exported).
- No blockers. Between milestones per `.oto/STATE.md` — next command is `/oto-new-milestone`.

---
*Phase: quick*
*Completed: 2026-07-09*

## Self-Check: PASSED

All claimed files verified present (in-repo and out-of-repo), both task commits (`f422e60`, `1fce5a7`) verified in git log, live `~/.codex` sync and `~/.codex/config.toml.bak-260709-lln` backup confirmed present.
