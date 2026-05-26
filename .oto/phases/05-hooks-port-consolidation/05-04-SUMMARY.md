---
phase: 05-hooks-port-consolidation
plan: 04
subsystem: hooks
tags: [claude, hooks, settings-json, installer, node-test]

requires:
  - phase: 05-hooks-port-consolidation
    provides: 05-02 token substitution helpers and 05-03 consolidated SessionStart hook
provides:
  - Claude settings.json hook registration for HK-01 through HK-06
  - Idempotent mergeSettings and unmergeSettings with _oto marker ownership
  - Install-time OTO_VERSION token substitution in copied hook files
  - Installed hook fleet version recording in .install.json
  - Passing mergeSettings round-trip and installer regression coverage
affects: [phase-05, hooks, installer, runtime-claude, phase-08-runtime-parity]

tech-stack:
  added: []
  patterns:
    - JSON settings merge with top-level _oto marker ownership
    - Install-time hook token substitution after copyTree
    - User-content-preserving uninstall via unmergeSettings

key-files:
  created:
    - .planning/phases/05-hooks-port-consolidation/05-04-SUMMARY.md
  modified:
    - bin/lib/runtime-claude.cjs
    - bin/lib/install-state.cjs
    - bin/lib/install.cjs
    - tests/05-merge-settings.test.cjs
    - tests/phase-03-runtime-claude.test.cjs

key-decisions:
  - "Use a strict JSON-first parser with JSONC comment fallback; invalid settings.json throws instead of overwriting user data."
  - "Register validate-commit as PreToolUse/Bash and context-monitor as PostToolUse/Bash|Edit|Write|MultiEdit|Agent|Task."
  - "Recompute installed file hashes after install-time hook token substitution so .install.json describes final bytes."

patterns-established:
  - "Claude hook entries are owned by _oto.hooks command_contains markers and removed only through unmergeSettings."
  - "installRuntime creates settings.json on fresh Claude installs when an adapter exports mergeSettings."
  - "Phase 3 adapter regression tests should now assert the current Claude hook merge contract, not the old identity stub."

requirements-completed: [HK-01, HK-02, HK-03, HK-04, HK-05, HK-06, HK-07]

duration: 9 min
completed: 2026-05-01
---

# Phase 05 Plan 04: Claude Hook Install Pipeline Summary

**Claude hook registration and install-time version substitution now wire the retained hook fleet into real installs with user-safe merge and uninstall behavior**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-01T19:51:35Z
- **Completed:** 2026-05-01T20:00:10Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Replaced the Claude adapter's Phase 3 identity `mergeSettings` stub with real `_oto`-scoped hook registration and a matching `unmergeSettings`.
- Registered exactly 6 retained hook markers: SessionStart, prompt-guard, validate-commit, read-injection-scanner, context-monitor, and statusLine.
- Extended install state validation and writes with `hooks: { version: OTO_VERSION }` while keeping schema version 1 backward-compatible.
- Wired `applyTokensToTree` into `installRuntime` so copied hooks receive the package version at install time.
- Promoted `tests/05-merge-settings.test.cjs` from a todo scaffold to 5 passing tests covering matcher shape, round-trip preservation, idempotency, unmerge, and Pitfall E hook shape.

## Task Commits

Each planned task was committed atomically:

1. **Task 1: Implement mergeSettings + unmergeSettings in runtime-claude.cjs** - `3501149` (feat)
2. **Task 2: Extend install-state.cjs schema with optional hooks.version field** - `86d5d85` (feat)
3. **Task 3: Wire applyTokensToTree + writeState hooks.version + unmergeSettings into install.cjs** - `14d1467` (feat)
4. **Task 4: Fill tests/05-merge-settings.test.cjs with round-trip coverage** - `30f9554` (test)
5. **Verification fix: Update stale Claude runtime regression test** - `50a0304` (fix)

## Files Created/Modified

- `bin/lib/runtime-claude.cjs` - Adds hook-entry construction, JSONC-tolerant settings parsing, idempotent `mergeSettings`, and `_oto`-scoped `unmergeSettings`.
- `bin/lib/install-state.cjs` - Accepts optional `hooks.version` while preserving Phase 3 state compatibility.
- `bin/lib/install.cjs` - Applies hook token substitution after copy, creates/merges Claude settings on fresh installs, records hook version state, and unmerges settings on uninstall.
- `tests/05-merge-settings.test.cjs` - Replaces Wave 0 todo with 5 real tests for D-12, D-13, D-14, HK-03, HK-06, and Pitfall E.
- `tests/phase-03-runtime-claude.test.cjs` - Updates the stale Phase 3 identity-stub expectation to the Phase 5 Claude hook merge contract.
- `.planning/phases/05-hooks-port-consolidation/05-04-SUMMARY.md` - This execution summary.

## Verification

- `node -e "const r=require('./bin/lib/runtime-claude.cjs'); ..."` - PASS, required adapter fields present, 6 markers emitted, validate-commit is PreToolUse/Bash, context-monitor is PostToolUse/broad, fixed-installedAt merge is byte-idempotent.
- `node -e "const {validateState,CURRENT_SCHEMA_VERSION}=require('./bin/lib/install-state.cjs'); ..."` - PASS, Phase 3 states still validate, valid `hooks.version` validates, malformed hooks reject, schema version remains 1.
- `node -e "require('./bin/lib/install.cjs')"` plus `rg` acceptance checks - PASS, `applyTokensToTree`, mergeSettings context, `hooks.version`, and `unmergeSettings` wiring present; old `adapter.mergeSettings(existing, '')` call absent.
- Temporary install smoke via `installRuntime`/`uninstallRuntime` - PASS, hook line 2 contains `0.1.0-alpha.1` instead of `{{OTO_VERSION}}`, state has `hooks.version`, settings has 6 `_oto` hooks, uninstall removes `_oto`.
- `node --test tests/05-merge-settings.test.cjs` - PASS, 5 pass / 0 fail / 0 todo.
- `node --test tests/phase-03-install-claude.integration.test.cjs` - PASS, 10 pass / 0 fail.
- `node --test tests/05-*.test.cjs` - PASS, 12 pass / 0 fail / 1 todo (expected 05-05 Wave 4 fixture todo).
- `npm test` - PASS, 241 pass / 0 fail / 1 todo (expected 05-05 Wave 4 fixture todo).

## Decisions Made

- Kept the `_oto` marker as JSON data rather than Markdown-style comments because `settings.json` must remain parseable.
- Preserved user-authored statusLine values if they are not already oto-owned; oto only replaces an absent or previously oto-owned statusLine.
- Recomputed state hashes after token substitution to keep the install state accurate for the final installed hook bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserved accurate state hashes after token substitution**
- **Found during:** Task 3 (install.cjs wiring)
- **Issue:** The plan places install-time token substitution after the copy loop, but `fileEntries` hashes were already calculated before substitution. Without a recompute, `.install.json` could describe pre-substitution bytes.
- **Fix:** After `applyTokensToTree` reports changes, recompute sha256 values for installed files before `writeState`.
- **Files modified:** `bin/lib/install.cjs`
- **Verification:** Phase 3 reinstall integration still reports byte-identical `state.files`; temporary install smoke confirms substituted hook bytes and valid state.
- **Committed in:** `14d1467`

**2. [Rule 1 - Bug] Updated stale Phase 3 Claude runtime test**
- **Found during:** Plan-level `npm test`
- **Issue:** `tests/phase-03-runtime-claude.test.cjs` still asserted Claude `mergeSettings` was an identity no-op, which is intentionally false after this plan.
- **Fix:** Replaced the stale identity assertion with the Phase 5 hook registration contract and added `unmergeSettings` to the lifecycle export check.
- **Files modified:** `tests/phase-03-runtime-claude.test.cjs`
- **Verification:** `node --test tests/phase-03-runtime-claude.test.cjs` passes; final `npm test` passes.
- **Committed in:** `50a0304`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were directly caused by the planned hook registration change and kept existing verification/state guarantees accurate. No architecture change or scope creep.

## Issues Encountered

- Full-suite verification initially failed on a stale Phase 3 identity-stub test. The production behavior was correct per 05-04, so the test was updated and the full suite passed on rerun.
- Git staging and commit operations required escalated filesystem permission to write `.git/index.lock`; commits were still normal `git commit` invocations without `--no-verify`.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None in files created or modified by this plan. The remaining Phase 5 todo is the expected 05-05 SessionStart fixture test, outside this plan's owned files.

## Threat Flags

None - the new settings parser, install-time token substitution, state write, and settings uninstall surfaces were already covered by the plan's threat model.

## Next Phase Readiness

Ready for 05-05. The Claude installer now creates version-substituted hooks, writes the `_oto` settings marker, and can unmerge those entries; Wave 4 can capture the deterministic SessionStart fixture against the installed hook output.

---
*Phase: 05-hooks-port-consolidation*
*Completed: 2026-05-01*

## Self-Check: PASSED

- Summary file exists at `.planning/phases/05-hooks-port-consolidation/05-04-SUMMARY.md`.
- Key modified files exist: `bin/lib/runtime-claude.cjs`, `bin/lib/install-state.cjs`, `bin/lib/install.cjs`, `tests/05-merge-settings.test.cjs`, and `tests/phase-03-runtime-claude.test.cjs`.
- Task and verification-fix commits exist in git history: `3501149`, `86d5d85`, `14d1467`, `30f9554`, and `50a0304`.
- Final verification passed: `node --test tests/05-*.test.cjs`, `node --test tests/phase-03-install-claude.integration.test.cjs`, and `npm test`.
