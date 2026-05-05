---
phase: 260505-bxx-port-gsds-codex-command-to-skill-adapter
plan: 01
type: quick
tags: [codex, installer, skills, adapter-pattern]
requirements:
  - QUICK-260505-bxx-01
  - QUICK-260505-bxx-02
  - QUICK-260505-bxx-03
  - QUICK-260505-bxx-04
key-files:
  modified:
    - bin/lib/codex-transform.cjs
    - bin/lib/runtime-codex.cjs
    - bin/lib/install.cjs
    - tests/phase-08-smoke-codex.integration.test.cjs
  created:
    - tests/phase-08-codex-skills.test.cjs
commits:
  - 1df96a5  # RED: failing tests for skill conversion + install override
  - 48036f5  # GREEN: port convertClaudeCommandToCodexSkill + getCodexSkillAdapterHeader
  - f56522c  # GREEN: wire installCommandsOverride / uninstallCommandsOverride hooks
metrics:
  duration_minutes: ~35
  completed: 2026-05-04
  tests_pass: 429
  tests_fail: 0
  tests_skipped: 1
---

# Quick 260505-bxx: Port GSD's Codex Command-to-Skill Adapter Summary

Codex 0.128.0 commands invocable as `$oto-<name>` via skills/ adapter ports — `oto/commands/oto/<name>.md` now installs as `~/.codex/skills/oto-<name>/SKILL.md` wrapped in a `<codex_skill_adapter>` header, while Claude install path stays byte-identical to before.

## What Was Ported

| Upstream (foundation-frameworks/get-shit-done-main/bin/install.js) | oto (bin/lib/codex-transform.cjs)        | Notes                                                        |
| ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `getCodexSkillAdapterHeader(skillName)` (L1918-1966)               | `getCodexSkillAdapterHeader`             | Verbatim port; "GSD workflows" → "oto workflows" only        |
| `convertClaudeCommandToCodexSkill(content, name)` (L1969-1984)     | `convertClaudeCommandToCodexSkill`       | Verbatim port; fallback "Run GSD workflow" → "Run oto workflow" |
| `copyCommandsAsCodexSkills(srcDir, ...)` (L4051-4102)              | `runtime-codex.installCommandsOverride`  | Same recursive walk + wipe-prior-`oto-*` semantics; rooted at `oto/commands/oto/` so the inner namespace becomes the skill prefix (`progress.md` → `oto-progress`, mirroring upstream's `gsd-progress` shape) |

Helpers reused as-is from `codex-transform.cjs` (no copy): `extractFrontmatterAndBody`, `extractFrontmatterField`, `toSingleLine`, `yamlQuote`, `convertClaudeToCodexMarkdown`. The `$ARGUMENTS` → `{{GSD_ARGS}}` token replacement is delegated to the existing `convertClaudeToCodexMarkdown` (not duplicated).

## Integration Extension Point

Two new optional adapter hooks added to `bin/lib/install.cjs`:

1. **`adapter.installCommandsOverride(ctx)`** — when present, replaces the default per-file `commands` copy/transform branch in the `installRuntime` for-loop. Returns `Array<{ path, sha256 }>` which `install.cjs` folds into `fileEntries`, feeding the existing state-driven uninstall machinery for free.

2. **`adapter.uninstallCommandsOverride(ctx)`** — called from `uninstallRuntime` after state-driven file removal but before the final `oto/` tree wipe. Used to clean adapter-specific leftovers not in `state.files` (e.g. legacy `commands/oto/` from pre-skill installs, and empty `skills/oto-*/` parent dirs left behind after state-driven `SKILL.md` removal).

**Why this is clean:**

- Claude and Gemini adapters do **not** declare these hooks → they fall through to the existing default copy path. No regression.
- Adapter-specific behavior stays in adapter files (`runtime-codex.cjs`); `install.cjs` only knows "if hook exists, defer to it".
- Returned entries enter `fileEntries`, so the cross-install orphan cleanup (`install.cjs:113-119`) handles re-installs that drop a command — the second install drops the orphan SKILL.md from `state.files` and the existing loop unlinks it.

## Smoke Results (Live `bin/install.js` against tmpdir)

```
$ rm -rf /tmp/oto-codex-smoke && node bin/install.js install --codex --config-dir /tmp/oto-codex-smoke
installed: codex — 353 files copied, marker injected, state at /tmp/oto-codex-smoke/oto/.install.json

$ ls /tmp/oto-codex-smoke/skills/ | grep '^oto-' | wc -l
76                                       # one skill folder per command file under oto/commands/oto/

$ head -10 /tmp/oto-codex-smoke/skills/oto-progress/SKILL.md
---
name: "oto-progress"
description: "Check project progress, show context, and route to next action ..."
metadata:
  short-description: "Check project progress, show context, and route to next action ..."
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning `$oto-progress`.

$ ls /tmp/oto-codex-smoke/commands/oto 2>&1
ls: /tmp/oto-codex-smoke/commands/oto: No such file or directory     # ← override replaces default copy

$ node bin/install.js uninstall --codex --config-dir /tmp/oto-codex-smoke
uninstalled: codex — 353 files removed, marker stripped, state cleared

$ ls /tmp/oto-codex-smoke/skills/ | grep -c '^oto-'
0                                        # all oto-* skill dirs removed

$ CODEX_HOME=/tmp/oto-codex-smoke-cversion codex --version
codex-cli 0.128.0
exit: 0                                  # regression check on the prior hooks fix — clean
```

Claude regression guard:

```
$ rm -rf /tmp/oto-claude-smoke && node bin/install.js install --claude --config-dir /tmp/oto-claude-smoke
installed: claude — 331 files copied
$ ls /tmp/oto-claude-smoke/commands/oto/ | wc -l
76                                       # all 76 commands still per-file under commands/oto/
$ test -f /tmp/oto-claude-smoke/commands/oto/progress.md && echo yes
yes
$ ls /tmp/oto-claude-smoke/skills/ | grep -c '^oto-'
0                                        # claude install does NOT produce skills/oto-* dirs
```

## Test Results

- `npm test`: **429 pass / 0 fail / 1 skipped** (was 419 pass before; +10 new tests in `tests/phase-08-codex-skills.test.cjs`)
- New file `tests/phase-08-codex-skills.test.cjs` (232 lines, 10 tests):
  - 6 tests on `convertClaudeCommandToCodexSkill` + `getCodexSkillAdapterHeader` covering frontmatter shape, $ARGUMENTS/.claude rewrites, short-description truncation, fallback descriptions, and adapter prose translation rules.
  - 4 integration tests using a tmpdir fixture repo: install emits SKILL.md per command, re-install drops orphans, uninstall removes skills + legacy commands/oto/, and Claude install is unaffected.
- Updated `tests/phase-08-smoke-codex.integration.test.cjs` D-17 spine assertion: now asserts `skills/oto-help/SKILL.md` instead of `commands/oto/help.md`, plus an explicit guard that `commands/oto/` is NOT produced by `--codex`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated upstream `.planning/config.json` reference to oto's `.oto/config.json` in adapter prose**

- **Found during:** Task 2 (full test suite after wiring).
- **Issue:** The verbatim upstream prose mentioned `model_overrides` from `.planning/config.json` — but oto's project config lives at `.oto/config.json` (per `oto/bin/install.js`). The pre-existing `tests/phase-04-planning-leak.test.cjs` planning-leak guard correctly flagged the path-like `.planning/` reference in `bin/lib/codex-transform.cjs` as a regression in shipped payload.
- **Fix:** Changed the prose line from "from `.planning/config.json` and `~/.oto/defaults.json`" to "from per-project `.oto/config.json` and `~/.oto/defaults.json`". Functional behavior unchanged (the prose is LLM-facing instruction; the actual config file the installer reads at `oto/bin/install.js` was already `.oto/config.json`).
- **Files modified:** `bin/lib/codex-transform.cjs`
- **Commit:** f56522c

**2. [Rule 1 - Bug] Updated existing `D-17 codex spine` integration test to assert new contract**

- **Found during:** Task 2 (full test suite).
- **Issue:** The pre-existing `tests/phase-08-smoke-codex.integration.test.cjs:59-65` asserted `commands/oto/help.md` exists after `--codex` install. That captures the OLD behavior we're changing — a Codex install should now emit skills, not commands. The plan explicitly says "no file at `<tmp>/commands/oto/foo.md` (the override replaces the default copy)". The old assertion was a regression test for the old behavior.
- **Fix:** Updated the loop to assert `skills/oto-{help,progress,new-project}/SKILL.md` instead, and added an explicit `assert.equal(fs.existsSync(commands/oto), false)` guard so we never silently regress to dual-output.
- **Files modified:** `tests/phase-08-smoke-codex.integration.test.cjs`
- **Commit:** f56522c

**3. [Rule 1 - Bug] `uninstallCommandsOverride` also removes empty `skills/oto-*/` parent dirs**

- **Found during:** Task 2 (test `QUICK-260505-bxx-03`).
- **Issue:** State-driven removal via `install.cjs:182-187` unlinks the tracked `SKILL.md` files but leaves the now-empty parent `skills/oto-foo/` directory behind. The plan's done-criterion ("after uninstall every `skills/oto-*/` directory is gone") was failing.
- **Fix:** Extended `uninstallCommandsOverride` to also remove any directory under `skills/` whose name starts with `oto-`. (The plan suggested this would be handled automatically by state.files; in practice `fs.rm(file)` doesn't remove parent dirs.)
- **Files modified:** `bin/lib/runtime-codex.cjs`
- **Commit:** f56522c

No deviations from the upstream conversion algorithm itself — the `<codex_skill_adapter>` body is preserved verbatim except for the explicit "GSD workflows" → "oto workflows" / "GSD agents" → "oto agents" / "~/.gsd/" → "~/.oto/" rebrands the plan called out.

## Self-Check: PASSED

- `bin/lib/codex-transform.cjs` — exists, exports `convertClaudeCommandToCodexSkill` and `getCodexSkillAdapterHeader` (verified via require + functional smoke).
- `bin/lib/runtime-codex.cjs` — exists, declares `installCommandsOverride` and `uninstallCommandsOverride` adapter methods.
- `bin/lib/install.cjs` — exists, dispatches to `adapter.installCommandsOverride` / `adapter.uninstallCommandsOverride` when present.
- `tests/phase-08-codex-skills.test.cjs` — exists, 232 lines, 10 tests, all passing.
- Commits: `1df96a5`, `48036f5`, `f56522c` — all present in `git log`.
- `npm test` final run: 429 pass / 0 fail / 1 skipped.
- Live `node bin/install.js install --codex --config-dir <tmp>` → 76 `oto-*` skill dirs.
- Live `codex --version` (with CODEX_HOME pointed at the tmpdir) → exit 0.
