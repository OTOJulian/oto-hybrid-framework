---
phase: 05-hooks-port-consolidation
fixed_at: 2026-05-01T20:30:37Z
review_path: .planning/phases/05-hooks-port-consolidation/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-05-01T20:30:37Z
**Source review:** .planning/phases/05-hooks-port-consolidation/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Config Directory Is Embedded In Shell Commands Without Shell Escaping

**Files modified:** `bin/lib/runtime-claude.cjs`, `tests/05-merge-settings.test.cjs`
**Commit:** 19b4b06
**Applied fix:** Added single-quote shell escaping for Claude hook command paths and covered dangerous config directories containing spaces, quotes, command substitution syntax, backticks, and single quotes.

### WR-01: Install-Time Token Substitution Can Modify User-Owned Hook Files

**Files modified:** `bin/lib/install.cjs`, `tests/phase-03-install-claude.integration.test.cjs`
**Commit:** 3d52cdf
**Applied fix:** Moved hook token substitution into the copied-source-file loop so only files from the hook source allowlist are mutated, and added an install regression for pre-existing user hook files.

### WR-02: Validate-Commit Can Be Bypassed With Common Git Commit Forms

**Files modified:** `oto/hooks/oto-validate-commit.sh`, `tests/05-validate-commit.test.cjs`
**Commit:** 975571f
**Applied fix:** Expanded commit command and message extraction to handle `git -C ... commit`, quoted `-m` and `--message`, `--message=...`, unquoted single-token messages, and unparsable commit commands.

### WR-03: SessionStart JSON Escaping Misses Control Characters

**Files modified:** `oto/hooks/oto-session-start`, `tests/05-session-start.test.cjs`
**Commit:** 6650a60
**Applied fix:** Replaced manual shell string escaping with Node `JSON.stringify` escaping over stdin and added a SessionStart regression with form-feed and backspace characters in `.oto/STATE.md`.

## Verification

- `node --test --test-concurrency=4 tests/05-build-hooks.test.cjs tests/05-merge-settings.test.cjs tests/05-session-start-fixture.test.cjs tests/05-session-start.test.cjs tests/05-token-substitution.test.cjs tests/05-validate-commit.test.cjs tests/phase-02-build-hooks.test.cjs tests/phase-03-runtime-claude.test.cjs tests/phase-03-install-claude.integration.test.cjs`
- Result: 43 passed, 0 failed.

---

_Fixed: 2026-05-01T20:30:37Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
