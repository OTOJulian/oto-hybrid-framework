---
phase: 05-hooks-port-consolidation
reviewed: 2026-05-01T20:21:18Z
depth: standard
files_reviewed: 19
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
  - tests/fixtures/phase-05/settings-empty.json
  - tests/fixtures/phase-05/settings-existing.json
  - tests/phase-02-build-hooks.test.cjs
  - tests/phase-03-runtime-claude.test.cjs
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-01T20:21:18Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the Phase 5 hook consolidation files at standard depth, including installer token substitution, Claude settings merge/unmerge, hook sources, fixtures, and phase-focused tests. The phase tests pass, but the install/runtime path has one shell command injection issue and several correctness gaps around user-file boundaries and hook parsing.

Verification run:

```bash
node --test --test-concurrency=4 tests/05-build-hooks.test.cjs tests/05-merge-settings.test.cjs tests/05-session-start-fixture.test.cjs tests/05-session-start.test.cjs tests/05-token-substitution.test.cjs tests/phase-02-build-hooks.test.cjs tests/phase-03-runtime-claude.test.cjs
```

Result: 26 passed, 0 failed.

## Critical Issues

### CR-01: Config Directory Is Embedded In Shell Commands Without Shell Escaping

**File:** `bin/lib/runtime-claude.cjs:11-13`

**Issue:** `buildOtoEntries` builds Claude hook command strings with `node "${cd}/hooks/${rel}"` and `bash "${cd}/hooks/${rel}"`. Double quotes preserve spaces, but they do not neutralize command substitution, variable expansion, embedded quotes, or other shell syntax when Claude executes the command string. A `--config-dir` or `CLAUDE_CONFIG_DIR` value containing a quote or shell expansion can break out of the quoted path and run arbitrary shell commands whenever the installed hook fires.

**Fix:**

```javascript
function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildOtoEntries(configDir) {
  const cd = String(configDir || '').replace(/\\/g, '/');
  const hookPath = (rel) => `${cd}/hooks/${rel}`;
  const node = (rel) => `node ${shellQuote(hookPath(rel))}`;
  const bash = (rel) => `bash ${shellQuote(hookPath(rel))}`;
  // existing return object...
}
```

Add a regression test using a `configDir` containing `"`, `$(`, backticks, and spaces, and assert generated commands remain a single safely quoted argument.

## Warnings

### WR-01: Install-Time Token Substitution Can Modify User-Owned Hook Files

**File:** `bin/lib/install.cjs:96-98` (via `bin/lib/copy-files.cjs:81-87`)

**Issue:** `installRuntime` calls `applyTokensToTree(hooksTargetAbs, ...)`, and `applyTokensToTree` walks every substitutable file under the runtime's `hooks` directory. Because `copyTree` preserves unrelated existing files in that directory, install can rewrite user-authored hook files if they are `.js`, `.cjs`, `.sh`, or named `oto-session-start` and happen to contain `{{OTO_VERSION}}`. That violates the installer boundary: only files copied from `oto/hooks/dist` should be mutated.

**Fix:**

```javascript
// Prefer applying tokens only to copied hook files while processing result.files.
if (srcKey === 'hooks' && shouldSubstitute(file.relPath)) {
  const original = await fsp.readFile(file.absPath, 'utf8');
  const replaced = tokenReplace(original, { OTO_VERSION });
  if (replaced !== original) {
    await fsp.writeFile(file.absPath, replaced);
  }
}
```

Alternatively, change `applyTokensToTree` to accept an explicit allowlist of relative paths from `sourceRelPaths` and skip all other files.

### WR-02: Validate-Commit Can Be Bypassed With Common Git Commit Forms

**File:** `oto/hooks/oto-validate-commit.sh:25-35`

**Issue:** The hook only validates messages it can extract from quoted `-m "..."` or `-m '...'`. Valid Git forms such as `git commit -m bad`, `git commit --message "bad"`, `git commit --message=bad`, or `git -C repo commit -m "bad"` are not extracted, leaving `MSG` empty and allowing the commit to proceed unvalidated. That undermines HK-06's Conventional Commits enforcement.

**Fix:**

```bash
if [[ "$CMD" =~ (^|[[:space:]])git([[:space:]].*)?[[:space:]]commit([[:space:]]|$) ]]; then
  MSG=""
  if [[ "$CMD" =~ (^|[[:space:]])(-m|--message)[[:space:]]+\"([^\"]+)\" ]]; then
    MSG="${BASH_REMATCH[3]}"
  elif [[ "$CMD" =~ (^|[[:space:]])(-m|--message)[[:space:]]+\'([^\']+)\' ]]; then
    MSG="${BASH_REMATCH[3]}"
  elif [[ "$CMD" =~ (^|[[:space:]])--message=([^[:space:];&|]+) ]]; then
    MSG="${BASH_REMATCH[2]}"
  elif [[ "$CMD" =~ (^|[[:space:]])-m[[:space:]]+([^[:space:];&|]+) ]]; then
    MSG="${BASH_REMATCH[2]}"
  else
    echo '{"decision":"block","reason":"Commit message must be provided with -m/--message so oto can validate Conventional Commits."}'
    exit 2
  fi
fi
```

Add tests that pipe Claude-style hook JSON for quoted, unquoted, `--message`, and unparsable commit commands.

### WR-03: SessionStart JSON Escaping Misses Control Characters

**File:** `oto/hooks/oto-session-start:29-36`

**Issue:** `escape_for_json` escapes backslash, quote, newline, carriage return, and tab, but JSON strings also require escaping the rest of U+0000 through U+001F. If the future `using-oto` skill content or opt-in `.oto/STATE.md` head contains backspace, form feed, or another raw control character, the hook emits invalid JSON and Claude cannot consume the SessionStart response.

**Fix:**

```bash
escape_for_json() {
  node -e 'let d=""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => process.stdout.write(JSON.stringify(d).slice(1, -1)));'
}

using_oto_escaped=$(printf '%s' "$using_oto_content" | escape_for_json)
state_escaped=$(printf '%s' "$state_head" | escape_for_json)
```

Add a fixture test where `.oto/STATE.md` includes a form-feed or backspace character and assert `JSON.parse(stdout)` succeeds.

## Info

### IN-01: Build Step Does Not Syntax-Check Bash Hooks

**File:** `scripts/build-hooks.js:56-63`

**Issue:** `build-hooks` validates JavaScript hooks with `vm.Script`, but extensionless/bash hooks are copied without `bash -n`. The current tests run against the checked-in scripts and pass, but a future shell syntax error would still be packaged into `oto/hooks/dist` during `prepare`.

**Fix:** For files identified as bash hooks, run `bash -n <src>` before copying when `bash` is available on the platform, and add a test with an invalid `.sh` source.

---

_Reviewed: 2026-05-01T20:21:18Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
