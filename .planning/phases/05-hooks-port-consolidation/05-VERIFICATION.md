---
phase: 05-hooks-port-consolidation
verified: 2026-05-01T21:22:53Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "Validate-commit hook rejects a commit that violates the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit"
  gaps_remaining: []
  regressions: []
---

# Phase 5: Hooks Port & Consolidation Verification Report

**Phase Goal:** Port and consolidate hooks from both upstreams into a single coherent fleet, with one SessionStart entrypoint (no double-injection) and version-tagged source files.
**Verified:** 2026-05-01T21:22:53Z
**Status:** passed
**Re-verification:** Yes - after HK-06 gap closure and validate-commit parser review fixes.

## Goal Achievement

Phase 5 achieved its roadmap goal. The retained hook fleet exists, Claude settings registration wires the six hook entries, SessionStart has a locked fixture with no upstream identity residue, runtime hook fixtures produce the expected warnings/blocks, install-time version replacement works, and the previous HK-06 active phase/plan commit-gating gap is closed.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SessionStart on Claude Code emits exactly one identity block per session, has no upstream identity residue, and has a locked snapshot fixture. | VERIFIED | `oto/hooks/oto-session-start` emits one `<EXTREMELY_IMPORTANT>` block with `You are using oto.` and `oto:using-oto`; `tests/05-session-start.test.cjs` and `tests/05-session-start-fixture.test.cjs` passed in the Phase 05 run. |
| 2 | Statusline hook renders current phase/state from `.oto/STATE.md` in the terminal status bar. | VERIFIED | `oto/hooks/oto-statusline.js` walks upward for `.oto/STATE.md`, parses milestone/status/phase, and `renderStatusline()` spot-check output included `v0.1.0 Release`, `executing`, and `Hooks Port & Consolidation (5/10)`. |
| 3 | Context-monitor hook fires after each turn and warns when usage crosses threshold. | VERIFIED | `bin/lib/runtime-claude.cjs` registers `oto-context-monitor.js` on `PostToolUse` matcher `Bash|Edit|Write|MultiEdit|Agent|Task` with timeout 10; direct bridge-file fixture at 24% remaining emitted `CONTEXT CRITICAL`. |
| 4 | Prompt-guard and read-injection-scanner hooks fire on appropriate tool events and block/warn known-bad patterns. | VERIFIED | `runtime-claude.cjs` registers prompt guard on `PreToolUse` `Write|Edit` and read scanner on `PostToolUse` `Read`; direct fixture inputs emitted `PROMPT INJECTION WARNING` and `READ INJECTION SCAN`. |
| 5 | Validate-commit hook rejects a commit violating the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit. | VERIFIED | `oto/hooks/oto-validate-commit.sh` now validates Conventional Commit messages, then requires `.oto/STATE.md` with active `Phase:` and `Plan:` lines. Direct probes blocked missing state, inactive phase, and missing plan with exit 2; a valid message with active phase/plan exited 0. |
| 6 | Every hook source file carries an `oto-hook-version` token rewritten at install time; stale-hook/version state works on upgrade path. | VERIFIED | All six hook source files have line-2 version tokens. Install copies hook files, substitutes `{{OTO_VERSION}}`, writes `hooks.version`, and a temp reinstall probe overwrote a stale `# oto-hook-version: 0.0.0-stale` hook back to `0.1.0-alpha.1`. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `oto/hooks/oto-session-start` | Single consolidated SessionStart hook | VERIFIED | Bash hook, line-2 token, one identity block, no banned upstream identity strings, project-state reminder behind `hooks.session_state`. |
| `oto/hooks/oto-statusline.js` | Statusline renderer | VERIFIED | Reads `.oto/STATE.md`, formats milestone/status/phase, exports `renderStatusline` for deterministic checks. |
| `oto/hooks/oto-context-monitor.js` | PostToolUse context warning hook | VERIFIED | Reads statusline bridge metrics from temp, debounces warnings, emits warning/critical additional context. |
| `oto/hooks/oto-prompt-guard.js` | PreToolUse Write/Edit injection scanner | VERIFIED | Parses hook stdin and warns on injected content targeting `.oto/`. |
| `oto/hooks/oto-read-injection-scanner.js` | PostToolUse Read scanner | VERIFIED | Parses Read response content and warns on standard/summarization injection patterns. |
| `oto/hooks/oto-validate-commit.sh` | Commit validation hook | VERIFIED | Enforces Conventional Commits and HK-06 active phase/plan invariant; parser supports actual `git commit` segment plus supported Git global options. |
| `oto/hooks/__fixtures__/session-start-claude.json` | Locked SessionStart fixture | VERIFIED | Valid JSON fixture, literal `{{OTO_VERSION}}`, and no banned upstream identity strings. |
| `bin/lib/runtime-claude.cjs` | Hook registration merge/unmerge | VERIFIED | Registers exactly six `_oto` marker entries and preserves/removes user settings correctly. |
| `bin/lib/install.cjs` | Install-time token substitution and settings/state wiring | VERIFIED | Uses `tokenReplace`/`shouldSubstitute` during copied hook-file install, writes `hooks.version`, and skips user-owned hook files. Plan checker still notes the older `applyTokensToTree` wording, but the implemented inline copy-loop behavior is verified and safer. |
| `bin/lib/install-state.cjs` | Optional `hooks.version` schema | VERIFIED | `validateState` accepts optional `hooks.version` string and rejects malformed values. |
| `scripts/build-hooks.js` | Build from `oto/hooks/` to `oto/hooks/dist/` | VERIFIED | Emits exactly six hook files and preserves exec bits for bash hooks; JS syntax validation retained. |
| `tests/05-*.test.cjs` | Phase 5 focused tests | VERIFIED | All Phase 05 tests have executable assertions and no todos; `node --test --test-concurrency=4 tests/05-*.test.cjs` passed 22/22. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/build-hooks.js` | `oto/hooks/` | `HOOKS_DIR` plus `fs.readdirSync` | VERIFIED | Build retargets canonical hook source tree and emits `oto/hooks/dist`. |
| `runtime-claude.cjs` | Claude `settings.json` hook fleet | `mergeSettings` | VERIFIED | SessionStart, statusLine, PreToolUse, and PostToolUse entries are registered with `_oto.hooks`. |
| `install.cjs` | `copy-files.cjs` token helpers | `tokenReplace`, `shouldSubstitute` | VERIFIED | Install substitutes tokens only for files copied from the hooks source allowlist. |
| `install.cjs` | `runtime-claude.cjs` | `adapter.mergeSettings` / `adapter.unmergeSettings` | VERIFIED | Install merges Claude settings; uninstall removes only oto-owned settings entries. |
| `oto-session-start` | `oto/skills/using-oto/SKILL.md` | Defensive read with fallback | VERIFIED | Missing skill emits Phase 6 fallback string; fixture locks this expected temporary behavior. |
| `oto-session-start` | `.oto/config.json` | `hooks?.session_state===true` check | VERIFIED | Project-state reminder remains opt-in. |
| `oto-validate-commit.sh` | `.oto/STATE.md` | active phase/plan checks before final accept | VERIFIED | `gsd-sdk query verify.key-links 05-06-PLAN.md --raw` verified both `.oto/STATE.md` and test-to-hook links. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `oto-session-start` | `additionalContext` | `oto/skills/using-oto/SKILL.md` or fallback plus optional `.oto/STATE.md` | Yes | FLOWING |
| `oto-statusline.js` | Rendered state string | `.oto/STATE.md` frontmatter/body parser | Yes | FLOWING |
| `oto-context-monitor.js` | Warning message | `/tmp/claude-ctx-<session>.json` bridge file written by statusline | Yes | FLOWING |
| `oto-prompt-guard.js` | Injection warning | Hook stdin `tool_input.content` / `new_string` | Yes | FLOWING |
| `oto-read-injection-scanner.js` | Injection warning | Hook stdin `tool_response` content | Yes | FLOWING |
| `runtime-claude.cjs` | Hook settings entries | `mergeSettings(existingText, ctx)` | Yes | FLOWING |
| `install.cjs` | Installed hook bytes/version state | `oto/hooks/dist` copy plus `tokenReplace` and `writeState` | Yes | FLOWING |
| `oto-validate-commit.sh` | Commit decision | Hook stdin `tool_input.command` plus `.oto/STATE.md` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Plan inventory | `gsd-sdk query phase-plan-index 05 --raw` | 6 plans, `incomplete: []` | PASS |
| Schema drift | `gsd-sdk query verify.schema-drift 05 --raw` | `valid: true`, `issues: []`, `checked: 6` | PASS |
| Validate-commit syntax | `bash -n oto/hooks/oto-validate-commit.sh` | Exit 0 | PASS |
| Focused HK-06 tests | `node --test tests/05-validate-commit.test.cjs` | 7 pass, 0 fail, 0 todo | PASS |
| Phase 05 test suite | `node --test --test-concurrency=4 tests/05-*.test.cjs` | 22 pass, 0 fail, 0 todo | PASS |
| Full test suite | `npm test` | 252 pass, 0 fail, 0 todo | PASS |
| HK-06 active state gating | Direct temp-project hook probe | Missing state, inactive phase, and missing plan all exited 2; active phase/plan exited 0 | PASS |
| Validate-commit parser hardening | Direct temp-project hook probe | `git -p commit -m bad`, `git -P commit -m bad`, `git --no-replace-objects commit -m bad`, and `git --config-env=user.name=USER commit -m bad` all exited 2 with Conventional Commits block reason | PASS |
| Statusline state render | Direct `renderStatusline()` temp `.oto/STATE.md` probe | Output included milestone, status, and phase | PASS |
| Context monitor threshold | Direct bridge-file fixture | Emitted `CONTEXT CRITICAL` | PASS |
| Prompt/read scanners | Direct hook stdin fixtures | Emitted `PROMPT INJECTION WARNING` and `READ INJECTION SCAN` | PASS |
| Stale hook overwrite | Temp install, mutate installed hook token, reinstall | Reinstall restored `# oto-hook-version: 0.1.0-alpha.1` and `.install.json.hooks.version` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| HK-01 | 05-01, 05-03, 05-04, 05-05 | Single consolidated SessionStart hook | SATISFIED | One SessionStart registration, one identity block, fixture lock, no upstream identity leakage. |
| HK-02 | 05-01, 05-04 | Statusline hook | SATISFIED | Registered as `statusLine`; direct render check reads `.oto/STATE.md`. |
| HK-03 | 05-01, 05-04 | Context-monitor hook | SATISFIED | Registered on `PostToolUse` broad matcher with timeout 10; direct bridge check emits warning. |
| HK-04 | 05-01, 05-04 | Prompt-guard hook | SATISFIED | Registered on `PreToolUse` `Write|Edit`; direct malicious write fixture warns. |
| HK-05 | 05-01, 05-04 | Read-injection-scanner hook | SATISFIED | Registered on `PostToolUse` `Read`; direct poisoned read fixture warns. |
| HK-06 | 05-01, 05-03, 05-04, 05-06 | Validate-commit hook | SATISFIED | Active phase/plan invariant is enforced and tested; reported Git global-option bypasses are blocked. |
| HK-07 | 05-01, 05-02, 05-04 | Hook version tags rewritten at install time | SATISFIED | Source tokens present, install substitutes copied hooks only, state records hook version, and reinstall overwrites stale owned hook token. |

No orphaned Phase 5 requirement IDs found. `.planning/REQUIREMENTS.md` maps HK-01 through HK-07 to Phase 5, and those IDs appear in Phase 05 plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `bin/lib/runtime-claude.cjs` | 53 | `return {}` for empty settings text | Info | Defensive default for missing settings; not a stub. |
| `scripts/build-hooks.js` | 22 | `return null` for non-JS syntax check | Info | Expected path for bash hooks; `bash -n oto/hooks/oto-validate-commit.sh` passed. |
| `oto/hooks/oto-statusline.js` | multiple | `return null` / `return {}` fallback paths | Info | Defensive absent-file and parse-failure handling; rendered-state path verified. |

No blocker stubs, todos, placeholder tests, hollow props, or console-only implementations were found in the Phase 5 source/test surface.

### Human Verification Required

None required for this re-verification. The Phase 5 hook contracts were verified through deterministic hook stdin fixtures, temp install/reinstall probes, and focused/full test suites. A real Claude Code smoke remains useful before release, but no phase-blocking human gate is open in this verification.

### Gaps Summary

No gaps remain. The original HK-06 gap is closed: valid Conventional Commits are no longer accepted unless `hooks.session_state` is enabled and `.oto/STATE.md` contains both an active phase and active plan. Post-gap parser hardening also blocks the previously reported Git global-option bypass forms.

---

_Verified: 2026-05-01T21:22:53Z_
_Verifier: Codex (gsd-verifier)_
