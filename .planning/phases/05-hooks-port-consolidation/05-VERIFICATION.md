---
phase: 05-hooks-port-consolidation
verified: 2026-05-01T20:41:59Z
status: gaps_found
score: 5/6 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Validate-commit hook rejects a commit that violates the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit"
    status: failed
    reason: "The hook only enforces Conventional Commits when hooks.session_state is enabled. A direct spot-check accepted a valid Conventional Commit with no .oto/STATE.md and no active phase/plan."
    artifacts:
      - path: "oto/hooks/oto-validate-commit.sh"
        issue: "No active phase or plan lookup; after message validation the hook exits 0."
      - path: "tests/05-validate-commit.test.cjs"
        issue: "Covers commit-message parsing and Conventional Commits, but not missing active phase/plan invariants."
    missing:
      - "Add active phase/plan invariant checks to oto-validate-commit.sh."
      - "Add tests for no .oto/STATE.md, inactive phase, missing plan, and valid active phase/plan commit."
---

# Phase 5: Hooks Port & Consolidation Verification Report

**Phase Goal:** Port and consolidate hooks from both upstreams into a single coherent fleet, with one SessionStart entrypoint (no double-injection) and version-tagged source files.
**Verified:** 2026-05-01T20:41:59Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SessionStart on Claude Code emits exactly one identity block per session, has no upstream identity residue, and has a locked snapshot fixture. | VERIFIED | `oto/hooks/oto-session-start` has one hand-authored identity block and defensive fallback; `oto/hooks/__fixtures__/session-start-claude.json` is present; `node --test tests/05-session-start.test.cjs tests/05-session-start-fixture.test.cjs` passed as part of targeted and full test runs. |
| 2 | Statusline hook renders current phase/state from `.oto/STATE.md` in the terminal status bar. | VERIFIED | `oto/hooks/oto-statusline.js` walks upward for `.oto/STATE.md`, parses milestone/status/phase, and renders it. Spot-check output contained `v0.1.0 Release`, `executing`, and `Hooks Port & Consolidation (5/10)`. |
| 3 | Context-monitor hook fires after each turn and warns when usage crosses threshold. | VERIFIED | `runtime-claude.cjs` registers `oto-context-monitor.js` on `PostToolUse` matcher `Bash|Edit|Write|MultiEdit|Agent|Task` with timeout 10. Direct spot-check with 24% remaining emitted `CONTEXT CRITICAL`. |
| 4 | Prompt-guard and read-injection-scanner hooks fire on appropriate tool events and block/warn known-bad patterns. | VERIFIED | `runtime-claude.cjs` registers prompt guard on `PreToolUse` `Write|Edit` and read scanner on `PostToolUse` `Read`. Direct fixture inputs produced `PROMPT INJECTION WARNING` and `READ INJECTION SCAN`. |
| 5 | Validate-commit hook rejects a commit violating the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit. | FAILED | `oto/hooks/oto-validate-commit.sh` checks `hooks.session_state`, parses `git commit`, and validates Conventional Commits only. Direct spot-check with enabled config, no `.oto/STATE.md`, and `git commit -m "fix: valid message"` exited 0. |
| 6 | Every hook source file carries an `oto-hook-version` token rewritten at install time; stale-hook/version state works on upgrade path. | VERIFIED | All six source hooks have line-2 version tokens. `install.cjs` substitutes `{{OTO_VERSION}}` only for copied hook files and writes `hooks: { version: OTO_VERSION }`; full install integration includes `phase-05: install substitutes tokens only in copied hooks, not pre-existing user hook files`. |

**Score:** 5/6 truths verified

### Deferred Items

None. Later phases cover skills, workstreams/workspaces, runtime parity, upstream sync, and CI/docs/release. None explicitly covers the missing active phase/plan enforcement in `oto-validate-commit.sh`.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `oto/hooks/oto-session-start` | Single consolidated SessionStart hook | VERIFIED | Bash hook, line-2 token, one identity block, `hooks?.session_state` opt-in, Claude/Cursor/fallback branches. |
| `oto/hooks/oto-statusline.js` | Statusline renderer | VERIFIED | Reads `.oto/STATE.md`, formats milestone/status/phase, exports `renderStatusline` for tests. |
| `oto/hooks/oto-context-monitor.js` | PostToolUse context warning hook | VERIFIED | Reads statusline bridge file, debounces, emits warning/critical additional context. |
| `oto/hooks/oto-prompt-guard.js` | PreToolUse Write/Edit injection scanner | VERIFIED | Parses hook stdin and warns on injected content targeting `.oto/`. |
| `oto/hooks/oto-read-injection-scanner.js` | PostToolUse Read scanner | VERIFIED | Parses Read response content and warns on standard/summarization injection patterns. |
| `oto/hooks/oto-validate-commit.sh` | Commit validation hook | PARTIAL | Enforces Conventional Commits and common `git commit` forms, but does not enforce active phase/plan invariant. |
| `oto/hooks/__fixtures__/session-start-claude.json` | Locked SessionStart fixture | VERIFIED | Valid JSON fixture, one identity block, literal `{{OTO_VERSION}}`, no banned upstream strings. |
| `bin/lib/runtime-claude.cjs` | Hook registration merge/unmerge | VERIFIED | Registers exactly six `_oto` markers and settings entries; preserves user settings; unmerges only oto-owned entries. |
| `bin/lib/install.cjs` | Install-time token substitution and settings/state wiring | VERIFIED | Pattern checker expected `applyTokensToTree`, but current code safely uses `tokenReplace` and `shouldSubstitute` inline only for files copied from `oto/hooks/dist`. |
| `bin/lib/install-state.cjs` | Optional `hooks.version` schema | VERIFIED | `validateState` accepts optional hooks object with string version; install writes the field. |
| `scripts/build-hooks.js` | Build from `oto/hooks/` to `oto/hooks/dist/` | VERIFIED | Emits exactly six hook files and preserves exec bits for bash hooks; JS syntax validation retained. |
| `tests/05-*.test.cjs` | Phase 5 focused tests | VERIFIED | All Phase 5 test files have real bodies; full suite reports 249 pass, 0 fail, 0 todo. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/build-hooks.js` | `oto/hooks/` | `HOOKS_DIR` plus `fs.readdirSync` | VERIFIED | Source retargeted to canonical hook tree; output is `oto/hooks/dist`. |
| `runtime-claude.cjs` | Claude `settings.json` hook fleet | `mergeSettings` | VERIFIED | SessionStart, statusLine, PreToolUse, and PostToolUse entries are registered with `_oto.hooks`. |
| `install.cjs` | `copy-files.cjs` token helpers | `tokenReplace`, `shouldSubstitute` | VERIFIED | Inline implementation replaced the originally planned `applyTokensToTree` call and is safer because it skips pre-existing target hook files. |
| `install.cjs` | `runtime-claude.cjs` | `adapter.mergeSettings` / `adapter.unmergeSettings` | VERIFIED | Install merges settings; uninstall removes only oto-owned settings entries. |
| `oto-session-start` | `oto/skills/using-oto/SKILL.md` | Defensive read with fallback | VERIFIED | Missing skill emits Phase 6 fallback string. |
| `oto-session-start` | `.oto/config.json` | `hooks?.session_state===true` check | VERIFIED | Generated key-link checker missed this because it searched literal `hooks.session_state`; executable code is wired. |
| `tests/05-session-start-fixture.test.cjs` | SessionStart fixture and hook | `fs.readFileSync` + `spawnSync` | VERIFIED | Test re-spawns the hook and deep-equals against the fixture. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `oto-session-start` | `additionalContext` | `skills/using-oto/SKILL.md` or fallback plus optional `.oto/STATE.md` | Yes | FLOWING |
| `oto-statusline.js` | Rendered state string | `.oto/STATE.md` frontmatter/body parser | Yes | FLOWING |
| `oto-context-monitor.js` | Warning message | `/tmp/claude-ctx-<session>.json` written by statusline | Yes | FLOWING |
| `oto-prompt-guard.js` | Injection warning | Hook stdin `tool_input.content` / `new_string` | Yes | FLOWING |
| `oto-read-injection-scanner.js` | Injection warning | Hook stdin `tool_response` content | Yes | FLOWING |
| `runtime-claude.cjs` | Hook settings entries | `mergeSettings(existingText, ctx)` | Yes | FLOWING |
| `install.cjs` | Installed hook bytes/version state | `oto/hooks/dist` copy plus `tokenReplace` and `writeState` | Yes | FLOWING |
| `oto-validate-commit.sh` | Commit decision | Hook stdin `tool_input.command` plus `.oto/config.json` | Partial | HOLLOW for active phase/plan invariant; real for Conventional Commits only. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full project test suite | `npm test` | 249 pass, 0 fail, 0 todo | PASS |
| Schema drift | `gsd-sdk query verify.schema-drift 05` | `valid: true`, no issues, checked 5 | PASS |
| Phase 5 core hook tests | `node --test tests/05-session-start.test.cjs tests/05-session-start-fixture.test.cjs tests/05-merge-settings.test.cjs tests/05-validate-commit.test.cjs` | 16 pass, 0 fail | PASS |
| Statusline state render | inline `node -e` temp `.oto/STATE.md` check | Output included milestone, status, and phase | PASS |
| Context monitor threshold | inline `node -e` metrics bridge check | Emitted `CONTEXT CRITICAL` | PASS |
| Prompt/read injection scanners | inline `node -e` fixture input check | Both warning outputs emitted | PASS |
| Validate-commit active phase/plan invariant | inline `node -e` with enabled config but no `.oto/STATE.md` | Exited 0 for `git commit -m "fix: valid message"` | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| HK-01 | 05-01, 05-03, 05-04, 05-05 | Single consolidated SessionStart hook | SATISFIED | One SessionStart registration, hook tests, fixture lock, no upstream identity leakage. |
| HK-02 | 05-01, 05-04 | Statusline hook | SATISFIED | Registered as `statusLine`; direct render check reads `.oto/STATE.md`. |
| HK-03 | 05-01, 05-04 | Context-monitor hook | SATISFIED | Registered on `PostToolUse` broad matcher with timeout 10; direct threshold check emits warning. |
| HK-04 | 05-01, 05-04 | Prompt-guard hook | SATISFIED | Registered on `PreToolUse` `Write|Edit`; direct malicious write fixture warns. |
| HK-05 | 05-01, 05-04 | Read-injection-scanner hook | SATISFIED | Registered on `PostToolUse` `Read`; direct poisoned read fixture warns. |
| HK-06 | 05-01, 05-03, 05-04 | Validate-commit hook | BLOCKED | Conventional Commit enforcement works, but roadmap invariant "no commits without active phase + plan" is missing. |
| HK-07 | 05-01, 05-02, 05-04 | Hook version tags rewritten at install time | SATISFIED | Source token lines present; install integration proves substitution only in copied hooks; install state records hooks version. |

No orphaned Phase 5 requirement IDs found. `.planning/REQUIREMENTS.md` maps exactly HK-01 through HK-07 to Phase 5, and those IDs all appear in Phase 05 plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `scripts/build-hooks.js` | 56 | JS hooks are syntax-checked; bash hooks are copied without `bash -n` | Info | Already recorded as `IN-01` in `05-REVIEW.md`; not blocking current checked-in hooks, which pass tests. |

No blocker stubs found in Phase 5 implementation files. Empty returns in helpers are defensive absent-file paths, not user-visible placeholders. `t.todo()` is absent from Phase 5 tests.

### Human Verification Required

Automated verification found a blocking gap, so status remains `gaps_found`. After HK-06 is fixed, the following real-runtime checks are still useful before milestone closeout:

1. Statusline in Claude Code TUI: install with `oto install --claude`, open a fresh Claude Code session in a project with `.oto/STATE.md`, and confirm the status bar shows phase/state.
2. Context monitor in Claude Code: cross a real context threshold and confirm the PostToolUse warning appears in-session.
3. Hook upgrade path: install one version, bump package version, reinstall, and confirm installed hook line 2 and `.install.json.hooks.version` update.

### Gaps Summary

Phase 5 achieved the consolidated hook fleet, SessionStart snapshot, Claude settings registration, install-time token substitution, and focused automated coverage. The blocking gap is HK-06 as stated in the ROADMAP success criteria: `oto-validate-commit.sh` does not enforce "no commits without an active phase + plan." It only enforces Conventional Commits.

This may be an intentional narrowing to upstream GSD behavior, but it is not accepted by an override. To accept the deviation instead of fixing code, add an override in this VERIFICATION.md frontmatter similar to:

```yaml
overrides:
  - must_have: "Validate-commit hook rejects a commit that violates the workflow invariant (no commits without an active phase + plan); accepts a well-formed commit"
    reason: "Phase 5 intentionally ports upstream validate-commit as Conventional Commits enforcement only; active phase/plan commit gating is not part of the retained hook contract."
    accepted_by: "Julian"
    accepted_at: "2026-05-01T20:41:59Z"
```

Otherwise, close the gap by adding active phase/plan checks and regression tests.

---

_Verified: 2026-05-01T20:41:59Z_
_Verifier: Codex (gsd-verifier)_
