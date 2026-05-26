---
phase: 260505-bxx-port-gsds-codex-command-to-skill-adapter
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/codex-transform.cjs
  - bin/lib/runtime-codex.cjs
  - bin/lib/install.cjs
  - tests/phase-08-codex-skills.test.cjs
autonomous: true
requirements:
  - QUICK-260505-bxx-01  # Codex commands install as ~/.codex/skills/oto-<name>/SKILL.md
  - QUICK-260505-bxx-02  # SKILL.md body wraps a <codex_skill_adapter> header
  - QUICK-260505-bxx-03  # Uninstall removes new skills/oto-* AND legacy commands/oto/* leftovers
  - QUICK-260505-bxx-04  # Claude install path is unchanged (no regression)

must_haves:
  truths:
    - "After `node bin/install.js install --codex`, ~/.codex/skills/ contains one oto-<name>/ folder per file under oto/commands/oto/, each with a SKILL.md."
    - "Each emitted SKILL.md begins with frontmatter (name, description, metadata.short-description) followed by a <codex_skill_adapter>...</codex_skill_adapter> block, then the original command body with .claude→.codex and $ARGUMENTS→{{GSD_ARGS}} translations applied."
    - "After `oto uninstall --codex`, every skills/oto-*/ directory is gone AND any legacy commands/oto/ tree previously installed by oto is removed."
    - "After `oto install --claude`, ~/.claude/commands/oto/<name>.md still exists exactly as before (no Claude regression)."
    - "All existing tests in `npm test` still pass; a new test in tests/phase-08-codex-skills.test.cjs covers the conversion (input command md → expected SKILL.md output)."
  artifacts:
    - path: "bin/lib/codex-transform.cjs"
      provides: "convertClaudeCommandToCodexSkill(content, skillName) and getCodexSkillAdapterHeader(skillName) — ports the upstream gsd functions, strings replaced (gsd→oto, GSD_ARGS retained as the existing oto token)."
      contains: "convertClaudeCommandToCodexSkill"
    - path: "bin/lib/runtime-codex.cjs"
      provides: "installCommandsOverride(ctx) hook that walks oto/commands/oto/, emits skills/oto-<name>/SKILL.md per file, and uninstallCommandsOverride hook that removes skills/oto-* AND legacy commands/oto/ leftovers."
      contains: "installCommandsOverride"
    - path: "bin/lib/install.cjs"
      provides: "Generic dispatch: when adapter declares installCommandsOverride, call it instead of the default commands copy/transform branch; mirror with uninstallCommandsOverride hook called from uninstallRuntime."
      contains: "installCommandsOverride"
    - path: "tests/phase-08-codex-skills.test.cjs"
      provides: "Unit coverage of conversion + install-override behavior using a tmpdir source tree."
      min_lines: 60
  key_links:
    - from: "bin/lib/install.cjs (installRuntime)"
      to: "adapter.installCommandsOverride"
      via: "if (typeof adapter.installCommandsOverride === 'function') skip default commands branch and call override"
      pattern: "installCommandsOverride"
    - from: "bin/lib/runtime-codex.cjs (installCommandsOverride)"
      to: "convertClaudeCommandToCodexSkill in codex-transform.cjs"
      via: "require + call per .md file"
      pattern: "convertClaudeCommandToCodexSkill"
    - from: "bin/lib/install.cjs (uninstallRuntime)"
      to: "adapter.uninstallCommandsOverride"
      via: "called before/after marker strip; removes skills/oto-* and legacy commands/oto/"
      pattern: "uninstallCommandsOverride"
---

<objective>
Port GSD's Codex command-to-skill adapter into oto so each `oto/commands/oto/<name>.md`
installs as `~/.codex/skills/oto-<name>/SKILL.md` wrapped in a `<codex_skill_adapter>`
header. This makes oto commands invocable as `$oto-<name>` in real Codex 0.128.0
(Codex no longer reads `commands/` — it reads `skills/`).

Purpose: unblock real-world Codex usage of oto commands without abandoning the Claude
install path. Reuses the upstream conversion algorithm (`convertClaudeCommandToCodexSkill`
+ `getCodexSkillAdapterHeader`) verbatim — only the prefix changes from `gsd-` to `oto-`
and the path token translation is delegated to the existing `convertClaudeToCodexMarkdown`.

Output: three modified `.cjs` files in `bin/lib/`, one new test file, and a working
`oto install --codex` that produces ~76 entries under `~/.codex/skills/oto-*/SKILL.md`.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

@bin/install.js
@bin/lib/install.cjs
@bin/lib/runtime-codex.cjs
@bin/lib/runtime-claude.cjs
@bin/lib/codex-transform.cjs
@bin/lib/copy-files.cjs
@oto/commands/oto/progress.md
@oto/commands/oto/help.md
@tests/phase-03-runtime-codex.test.cjs
@tests/phase-08-codex-toml.test.cjs

<!-- Upstream reference (the algorithm to port — DO NOT rewrite from scratch) -->
@foundation-frameworks/get-shit-done-main/bin/install.js

<interfaces>
<!-- Key contracts the executor needs. Use these directly — no codebase exploration. -->

From foundation-frameworks/get-shit-done-main/bin/install.js (lines to port — search by these names):

- Line 1918 `getCodexSkillAdapterHeader(skillName)` — returns the literal `<codex_skill_adapter>...</codex_skill_adapter>` block. Copy verbatim, but rename `GSD workflows`→`oto workflows` in the prose. Keep `{{GSD_ARGS}}` literal — that token is what oto's existing `convertClaudeToCodexMarkdown` replaces `$ARGUMENTS` with (see bin/lib/codex-transform.cjs:37).

- Line 1969 `convertClaudeCommandToCodexSkill(content, skillName)` — the conversion entry point:
    ```js
    function convertClaudeCommandToCodexSkill(content, skillName) {
      const converted = convertClaudeToCodexMarkdown(content);
      const { frontmatter, body } = extractFrontmatterAndBody(converted);
      let description = `Run oto workflow ${skillName}.`;        // upstream says GSD; rename to oto
      if (frontmatter) {
        const maybeDescription = extractFrontmatterField(frontmatter, 'description');
        if (maybeDescription) description = maybeDescription;
      }
      description = toSingleLine(description);
      const shortDescription = description.length > 180 ? `${description.slice(0,177)}...` : description;
      const adapter = getCodexSkillAdapterHeader(skillName);
      return `---\nname: ${yamlQuote(skillName)}\ndescription: ${yamlQuote(description)}\nmetadata:\n  short-description: ${yamlQuote(shortDescription)}\n---\n\n${adapter}\n\n${body.trimStart()}`;
    }
    ```
  All helpers (`extractFrontmatterAndBody`, `extractFrontmatterField`, `toSingleLine`,
  `yamlQuote`, `convertClaudeToCodexMarkdown`) already exist in bin/lib/codex-transform.cjs.

- Line 4051 `copyCommandsAsCodexSkills(srcDir, skillsDir, prefix, ...)` — the install-side
  recursion that flattens nested folders into hyphenated skill names, wipes prior
  `${prefix}-*/` directories, and writes one `SKILL.md` per leaf. Pattern: `prefix='oto'`
  for oto. NOTE: oto's source layout is `oto/commands/oto/<name>.md` (single nesting),
  so the recursion is shallow but the same code handles it.

From bin/lib/install.cjs:67-99 (current dispatch):
```js
for (const srcKey of SRC_KEYS) {
  const srcAbs = path.join(repoRoot, adapter.sourceDirs[srcKey]);
  const dstAbs = path.join(configDir, adapter.targetSubdirs[srcKey]);
  // ... copyTree → walk → optional transformFn per-file
}
```
The override extension point: BEFORE this loop body runs for `srcKey === 'commands'`,
check `adapter.installCommandsOverride`. If present, call it (it returns `fileEntries`
in the same shape) and `continue` — skipping default copy.

From bin/lib/install.cjs:163-228 (uninstallRuntime):
- State-driven removal already handles arbitrary file paths via `state.files[]`.
  Because `installCommandsOverride` returns its emitted file paths into `fileEntries`,
  the existing state-based uninstall removes the new skills/oto-* tree automatically.
- The legacy commands/oto/ leftover from prior installs is NOT in state. Add an
  adapter hook `cleanupLegacyPaths` (or extend with explicit removal at the top of
  uninstallRuntime when adapter.uninstallCommandsOverride is present).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Codex command→skill conversion to codex-transform.cjs</name>
  <files>bin/lib/codex-transform.cjs, tests/phase-08-codex-skills.test.cjs</files>
  <behavior>
    Test file `tests/phase-08-codex-skills.test.cjs` (new) covers:
    - `convertClaudeCommandToCodexSkill(progressMd, 'oto-progress')` returns a string that:
      1. Starts with `---\nname: "oto-progress"\n` (yamlQuote → JSON.stringify form).
      2. Contains a `description:` field sourced from the input frontmatter `description`.
      3. Contains `metadata:\n  short-description:` truncated to ≤180 chars when input description is shorter, equal to description otherwise.
      4. Contains `<codex_skill_adapter>` and `</codex_skill_adapter>` markers.
      5. Adapter prose mentions `$oto-progress` as the invocation token.
      6. Adapter prose translates `AskUserQuestion → request_user_input`, `Task() → spawn_agent`, `{{GSD_ARGS}}`.
      7. Body has `$ARGUMENTS` replaced by `{{GSD_ARGS}}` and `~/.claude/` replaced by `~/.codex/`.
    - `convertClaudeCommandToCodexSkill(emptyFrontmatterMd, 'oto-foo')` falls back to `description: "Run oto workflow oto-foo."`.
    - `getCodexSkillAdapterHeader('oto-help')` interpolates `$oto-help` into the invocation rule line.
  </behavior>
  <action>
    1. Open `bin/lib/codex-transform.cjs`. Append two new functions BEFORE the `module.exports` block:
       - `getCodexSkillAdapterHeader(skillName)` — port verbatim from `foundation-frameworks/get-shit-done-main/bin/install.js:1918-1966`. Replace the two occurrences of "GSD workflows" with "oto workflows" in the prose. Leave `{{GSD_ARGS}}` token literal (it's what `convertClaudeToCodexMarkdown` already produces from `$ARGUMENTS`). Leave the H2 section labels (A/B/C) as-is.
       - `convertClaudeCommandToCodexSkill(content, skillName)` — port from upstream lines 1969-1984. Change the fallback description string from `Run GSD workflow ${skillName}.` to `Run oto workflow ${skillName}.` (this is the ONLY semantic rename). All helpers (`extractFrontmatterAndBody`, `extractFrontmatterField`, `toSingleLine`, `yamlQuote`, `convertClaudeToCodexMarkdown`) are already defined in this file — call them directly.
    2. Add both functions to `module.exports`.
    3. Create `tests/phase-08-codex-skills.test.cjs` covering the behaviors listed in `<behavior>` above. Use `node:test` + `node:assert/strict` (project convention; see tests/phase-08-codex-toml.test.cjs as the format template). Read the live `oto/commands/oto/progress.md` from disk as the input fixture (it has rich frontmatter so it exercises real input). Tests must be plain assertions — no snapshots, no extra deps.
    4. Run `npm test` and confirm the new tests pass.

    DO NOT touch any function that currently exists in codex-transform.cjs. The existing
    `convertClaudeAgentToCodexAgent`, `generateCodexAgentToml`, etc. must continue to work
    exactly as before (they back agent emission, not skill emission).

    Keep all of the upstream `<codex_skill_adapter>` body verbatim. The translation rules
    inside it (AskUserQuestion → request_user_input, Task() → spawn_agent) are functional
    instructions to the LLM at runtime, not strings we want to localize.
  </action>
  <verify>
    <automated>npm test -- --test-name-pattern="codex skill|convertClaudeCommandToCodexSkill"</automated>
  </verify>
  <done>
    - `bin/lib/codex-transform.cjs` exports `convertClaudeCommandToCodexSkill` and `getCodexSkillAdapterHeader`.
    - `node -e "console.log(require('./bin/lib/codex-transform.cjs').convertClaudeCommandToCodexSkill(require('node:fs').readFileSync('oto/commands/oto/progress.md','utf8'),'oto-progress'))"` prints valid frontmatter + adapter block + body, with no thrown errors.
    - All new tests in `tests/phase-08-codex-skills.test.cjs` pass.
    - `npm test` total still passes (no regressions).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire installCommandsOverride hook through install.cjs and runtime-codex</name>
  <files>bin/lib/install.cjs, bin/lib/runtime-codex.cjs, tests/phase-08-codex-skills.test.cjs</files>
  <behavior>
    Tests appended to `tests/phase-08-codex-skills.test.cjs`:
    - `installRuntime(codexAdapter, { repoRoot: <fixture>, flags: { configDir: tmp } })` against a fixture repo with two stub command files (e.g. `oto/commands/oto/foo.md`, `oto/commands/oto/bar.md`) produces:
        * `<tmp>/skills/oto-foo/SKILL.md` (file exists, starts with `---\nname: "oto-foo"`).
        * `<tmp>/skills/oto-bar/SKILL.md` (file exists, starts with `---\nname: "oto-bar"`).
        * NO file at `<tmp>/commands/oto/foo.md` (the override replaces the default copy).
    - Same install run records both SKILL.md paths in `<tmp>/oto/.install.json` `files[]`.
    - A second `installRuntime` call with a DIFFERENT command set (e.g. only foo.md) leaves `skills/oto-foo/` and removes `skills/oto-bar/` (state-driven cleanup of orphans already in install.cjs:113-119).
    - `uninstallRuntime` after an install removes `skills/oto-*/SKILL.md` AND removes a manually-pre-seeded `<tmp>/commands/oto/legacy.md` file (legacy cleanup), without touching unrelated files like `<tmp>/commands/non-oto/keep.md`.
    - `installRuntime(claudeAdapter, ...)` against the same fixture STILL produces `<tmp>/commands/oto/foo.md` (Claude regression guard — the override hook is Codex-only).

    Use `node:test` + `node:fs/promises` + `os.tmpdir()` for isolation. Clean up with `try/finally`.
  </behavior>
  <action>
    1. **Edit `bin/lib/runtime-codex.cjs`** — Add two new adapter functions:

       a. Add `convertClaudeCommandToCodexSkill` to the require list at the top:
          ```js
          const {
            convertClaudeAgentToCodexAgent,
            convertClaudeToCodexMarkdown,
            convertClaudeCommandToCodexSkill,   // ← new
            generateCodexAgentToml,
          } = require('./codex-transform.cjs');
          ```

       b. Add an `installCommandsOverride(ctx)` method on the exported adapter object.
          Signature: `async installCommandsOverride(ctx)` where ctx provides
          `{ repoRoot, configDir, otoVersion }`. Behavior:
            - Source: `path.join(repoRoot, this.sourceDirs.commands)` → resolves to
              `<repoRoot>/oto/commands` (the `oto/commands/oto/` subtree lives below).
            - Target: `path.join(configDir, 'skills')`.
            - Recursively walk source. For each `.md` file, derive `skillName` by joining
              path segments after `<sourceDir>/` with `-` and prefixing `oto-`.
              Example: `oto/commands/oto/progress.md` → `oto-oto-progress`? NO — the
              upstream port collapses the duplicate. Match upstream behavior: the source
              for oto is `oto/commands/oto/` (two-level "oto" namespace; the inner `oto/`
              IS the prefix). Use `prefix = 'oto'` and root the recursion at
              `oto/commands/oto/` (via `path.join(repoRoot, 'oto', 'commands', 'oto')`).
              Then `progress.md` → `oto-progress`. **Hardcode the source dir as
              `path.join(repoRoot, 'oto', 'commands', 'oto')`** — this matches oto's
              actual layout and produces the same name shape as `~/.codex/skills/gsd-progress/`.
              Subdirectories under that (none currently exist, but be defensive) flatten
              to `oto-<dir>-<file>`.
            - Wipe prior `oto-*` directories under `<configDir>/skills/` first
              (mirrors upstream lines 4058-4064).
            - For each leaf .md, read the content, run
              `convertClaudeCommandToCodexSkill(content, skillName)`, and write to
              `<configDir>/skills/<skillName>/SKILL.md`.
            - Return `Array<{ path, sha256 }>` — paths relative to `configDir`, sha256
              computed via the existing `sha256Text` helper at the top of the file.
              install.cjs will fold these into `fileEntries` (which feeds the install
              state file → the existing state-driven uninstall removes them next time).

       c. Add an `uninstallCommandsOverride(ctx)` method. Signature:
          `async uninstallCommandsOverride(ctx)` where ctx is `{ configDir }`. Behavior:
            - Remove any directory matching `<configDir>/commands/oto/` (legacy leftover
              from pre-Codex-skill installs that may not be tracked in state.files).
              Use `fs.rm(path, { recursive: true, force: true })`.
            - DO NOT touch `<configDir>/skills/oto-*` — state-driven removal already
              handles those because they are in `state.files`.
            - DO NOT touch `<configDir>/commands/` itself if other non-oto subtrees exist.

    2. **Edit `bin/lib/install.cjs`** at TWO points:

       a. Inside `installRuntime` (the for-loop at lines 67-99), special-case `srcKey === 'commands'`:
          ```js
          for (const srcKey of SRC_KEYS) {
            if (srcKey === 'commands' && typeof adapter.installCommandsOverride === 'function') {
              const overrideEntries = await adapter.installCommandsOverride({
                repoRoot, configDir, otoVersion: OTO_VERSION,
              });
              for (const entry of overrideEntries || []) fileEntries.push(entry);
              continue;
            }
            // ... existing default branch unchanged ...
          }
          ```

       b. Inside `uninstallRuntime`, after state-driven removal but before
          `removeTree(path.join(configDir, 'oto'))` (around line 213), call:
          ```js
          if (typeof adapter.uninstallCommandsOverride === 'function') {
            await adapter.uninstallCommandsOverride({ configDir });
          }
          ```
          This runs whether or not `state.files` referenced commands/ paths.

    3. **Append tests** to `tests/phase-08-codex-skills.test.cjs` per the
       `<behavior>` block above. Build a tmpdir fixture repo containing minimal
       `oto/commands/oto/foo.md` and `oto/commands/oto/bar.md` with valid
       frontmatter. Pass that as `repoRoot`. Cleanup with `fs.rm(..., {recursive:true})`
       in `try/finally`.

    4. Run `npm test`. All tests pass.

    5. Manually smoke-test:
       ```sh
       rm -rf /tmp/oto-codex-smoke
       node bin/install.js install --codex --config-dir /tmp/oto-codex-smoke
       ls /tmp/oto-codex-smoke/skills/ | head
       cat /tmp/oto-codex-smoke/skills/oto-progress/SKILL.md | head -30
       node bin/install.js uninstall --codex --config-dir /tmp/oto-codex-smoke
       ls /tmp/oto-codex-smoke/skills/ 2>/dev/null    # should be empty or missing
       ```
       Confirm ~76 skill folders present after install, all `oto-*`-prefixed; uninstall
       leaves no `oto-*` directories.

    6. Verify Claude install path is unchanged:
       ```sh
       rm -rf /tmp/oto-claude-smoke
       node bin/install.js install --claude --config-dir /tmp/oto-claude-smoke
       ls /tmp/oto-claude-smoke/commands/oto/ | head    # should list the .md files as before
       ```

    DO NOT add `installCommandsOverride` to the Claude or Gemini adapters. They keep
    using the default per-file copy + transform path.

    DO NOT change the `commands` entries in `runtime-codex.cjs`'s `sourceDirs` /
    `targetSubdirs` maps. The override sidesteps them; downstream code that inspects
    those maps (e.g. uninstall purge in install.cjs:215-227) should still see the
    historical values so legacy cleanup paths work.
  </action>
  <verify>
    <automated>npm test &amp;&amp; rm -rf /tmp/oto-codex-smoke /tmp/oto-claude-smoke &amp;&amp; node bin/install.js install --codex --config-dir /tmp/oto-codex-smoke &amp;&amp; test "$(ls /tmp/oto-codex-smoke/skills/ | grep -c '^oto-')" -ge 70 &amp;&amp; test -f /tmp/oto-codex-smoke/skills/oto-progress/SKILL.md &amp;&amp; grep -q '&lt;codex_skill_adapter&gt;' /tmp/oto-codex-smoke/skills/oto-progress/SKILL.md &amp;&amp; node bin/install.js uninstall --codex --config-dir /tmp/oto-codex-smoke &amp;&amp; test "$(ls /tmp/oto-codex-smoke/skills/ 2>/dev/null | grep -c '^oto-')" = "0" &amp;&amp; node bin/install.js install --claude --config-dir /tmp/oto-claude-smoke &amp;&amp; test -f /tmp/oto-claude-smoke/commands/oto/progress.md</automated>
  </verify>
  <done>
    - `node bin/install.js install --codex --config-dir <tmp>` produces ≥70 directories under `<tmp>/skills/` named `oto-<name>/SKILL.md`.
    - `<tmp>/skills/oto-progress/SKILL.md` contains `<codex_skill_adapter>`, `name: "oto-progress"`, and `$oto-progress` in the invocation prose.
    - `<tmp>/commands/oto/` does NOT exist after a Codex install (override replaces default).
    - `node bin/install.js uninstall --codex --config-dir <tmp>` removes all `oto-*` skill dirs AND any pre-existing `<tmp>/commands/oto/` legacy tree.
    - `node bin/install.js install --claude --config-dir <tmp2>` still produces `<tmp2>/commands/oto/progress.md` (Claude regression guard).
    - `npm test` passes (existing 418+ tests + new ones in phase-08-codex-skills.test.cjs).
    - `codex --version` exits 0 against the new install (regression check on the prior hooks fix; not blocking if codex CLI not present locally — note in summary).
  </done>
</task>

</tasks>

<verification>
After both tasks:

1. **Conversion algorithm (Task 1):**
   - `npm test` → all phase-08 codex-skills tests pass.
   - Manual: `node -e "...convertClaudeCommandToCodexSkill(progressMd,'oto-progress')..."` matches the live `~/.codex/skills/gsd-progress/SKILL.md` shape (modulo the `oto-`/`gsd-` rename and the `oto workflows` prose tweak).

2. **Install integration (Task 2):**
   - `node bin/install.js install --codex --config-dir /tmp/oto-codex-smoke`
       → `ls /tmp/oto-codex-smoke/skills/oto-* | wc -l` ≈ 76.
   - `cat /tmp/oto-codex-smoke/skills/oto-progress/SKILL.md` shows: `---\nname: "oto-progress"\n…\n<codex_skill_adapter>\n…\n## A. Skill Invocation\n- This skill is invoked by mentioning \`$oto-progress\`.\n…</codex_skill_adapter>\n\n<objective>\n…</objective>`.
   - `node bin/install.js uninstall --codex --config-dir /tmp/oto-codex-smoke` removes all `oto-*` skill dirs AND any seeded `commands/oto/legacy.md`.
   - `node bin/install.js install --claude --config-dir /tmp/oto-claude-smoke` → Claude commands still under `commands/oto/<name>.md` (no regression).
   - `codex --version` exits 0 with the new install applied (sanity check on Phase 8 hooks fix).

3. **Manual real-world check (post-merge, in the user's own ~/.codex):**
   In real Codex 0.128.0, type `$oto-progress` → skill triggers and runs the progress workflow.
   This is a smoke step the user performs after the implementation lands; we don't gate the plan on it.
</verification>

<success_criteria>
- All criteria in `<must_haves>` truths are observably true.
- `npm test` passes (no regressions; new conversion + install-override tests added).
- Real `oto install --codex` against `~/.codex` produces the expected ~76 skill dirs.
- Real `oto uninstall --codex` cleans them all up + legacy `commands/oto/` if present.
- Claude install path is byte-identical to pre-change for `commands/oto/<name>.md`.
- The upstream `<codex_skill_adapter>` body is preserved verbatim (modulo the
  `GSD workflows`→`oto workflows` rename) so the runtime translation prompts the LLM
  reads are unchanged from the working gsd-progress reference.
</success_criteria>

<output>
After completion, create `.planning/quick/260505-bxx-port-gsds-codex-command-to-skill-adapter/260505-bxx-SUMMARY.md` summarizing:
- What was ported (function names from upstream → mapped names in oto).
- The integration extension point added (`installCommandsOverride` /
  `uninstallCommandsOverride`) and why it's a clean adapter-only addition (Claude
  and Gemini adapters do not declare these → they fall through to the existing
  default copy path).
- The smoke results (skill count, sample SKILL.md head, uninstall verification).
- Any deviations from the upstream algorithm and why.
</output>
