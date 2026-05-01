---
phase: 05-hooks-port-consolidation
reviewed: 2026-05-01T20:35:17Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - .gitignore
  - bin/lib/copy-files.cjs
  - bin/lib/install-state.cjs
  - bin/lib/install.cjs
  - bin/lib/runtime-claude.cjs
  - oto/hooks/README.md
  - oto/hooks/__fixtures__/session-start-claude.json
  - oto/hooks/oto-session-start
  - oto/hooks/oto-validate-commit.sh
  - scripts/build-hooks.js
  - tests/05-build-hooks.test.cjs
  - tests/05-merge-settings.test.cjs
  - tests/05-session-start-fixture.test.cjs
  - tests/05-session-start.test.cjs
  - tests/05-token-substitution.test.cjs
  - tests/05-validate-commit.test.cjs
  - tests/fixtures/phase-05/settings-empty.json
  - tests/fixtures/phase-05/settings-existing.json
  - tests/phase-02-build-hooks.test.cjs
  - tests/phase-03-runtime-claude.test.cjs
  - tests/phase-03-install-claude.integration.test.cjs
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-01T20:35:17Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Re-reviewed the Phase 5 hook consolidation files at standard depth, with specific focus on the previous CR-01, WR-01, WR-02, and WR-03 findings. The critical shell injection issue and all three warning-level correctness gaps are resolved.

- CR-01 resolved: Claude hook commands now use POSIX single-quote shell escaping in `bin/lib/runtime-claude.cjs`, with regression coverage for quotes, command substitution syntax, backticks, and spaces.
- WR-01 resolved: install-time token replacement now applies only to hook files that came from `oto/hooks/dist`, preserving pre-existing user hook files.
- WR-02 resolved: `oto-validate-commit.sh` now handles common `-m`, `--message`, `--message=`, unquoted message, and `git -C repo commit` forms, and blocks commit commands without a parseable message.
- WR-03 resolved: `oto-session-start` now escapes JSON content through `JSON.stringify`, with control-character regression coverage.

Verification run:

```bash
node --test --test-concurrency=4 tests/05-build-hooks.test.cjs tests/05-merge-settings.test.cjs tests/05-session-start-fixture.test.cjs tests/05-session-start.test.cjs tests/05-token-substitution.test.cjs tests/05-validate-commit.test.cjs tests/phase-02-build-hooks.test.cjs tests/phase-03-runtime-claude.test.cjs tests/phase-03-install-claude.integration.test.cjs
```

Result: 43 passed, 0 failed.

## Info

### IN-01: Build Step Does Not Syntax-Check Bash Hooks

**File:** `scripts/build-hooks.js:56`

**Issue:** The build step validates JavaScript hooks with `vm.Script`, but shell hooks are still copied without a `bash -n` syntax check. The current checked-in shell hooks pass runtime tests, so this is not blocking Phase 5, but a future shell syntax error could still be packaged into `oto/hooks/dist` during `prepare`.

**Fix:** For bash-identified hooks, run `bash -n <src>` before copying when `bash` is available, and add a test with an invalid `.sh` source to confirm the build fails before packaging.

---

_Reviewed: 2026-05-01T20:35:17Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
