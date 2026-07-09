---
phase: quick
plan: 260709-lln
type: execute
wave: 1
depends_on: []
files_modified:
  - oto/hooks/oto-session-start
  - tests/05-session-start.test.cjs
  - bin/lib/runtime-codex.cjs
  - tests/phase-03-install-codex.integration.test.cjs
  - oto/hooks/dist/oto-session-start
autonomous: true
requirements: [lln-codex-argv-detection]
tags: [codex, session-start, hooks, runtime-detection, argv-flag]

must_haves:
  truths:
    - "A fresh Codex session (which does NOT set CODEX_HOME on hook processes) receives the nested hookSpecificOutput SessionStart envelope, because the registered command itself carries `--codex`"
    - "`env -i` invocation of the dist hook with `--codex` emits the envelope shape; the same invocation without the flag and without CODEX_HOME emits the flat fallback shape"
    - "A fresh `oto install --codex` registers the SessionStart command with the `--codex` argv flag in config.toml; other hooks' command lines are unchanged"
    - "The live ~/.codex install (hook file + config.toml SessionStart command) carries the fix"
  artifacts:
    - path: "oto/hooks/oto-session-start"
      provides: "Codex branch fires on `\"${1:-}\" = \"--codex\"` OR non-empty CODEX_HOME; comment names argv flag as primary deterministic signal"
      contains: '"${1:-}" = "--codex"'
    - path: "bin/lib/runtime-codex.cjs"
      provides: "SessionStart hook entry registered as `bash '<path>' --codex`; all other buildHookEntries lines untouched"
    - path: "tests/05-session-start.test.cjs"
      provides: "3 detection-matrix tests: --codex argv clean env -> envelope; CODEX_HOME no flag -> envelope (regression); no flag + clean env -> flat fallback"
  key_links:
    - from: "bin/lib/runtime-codex.cjs buildHookEntries"
      to: "oto/hooks/oto-session-start argv branch"
      via: "config.toml SessionStart command string ends with --codex"
      pattern: "oto-session-start' --codex"
    - from: "oto/hooks/oto-session-start"
      to: "oto/hooks/dist/oto-session-start"
      via: "scripts/build-hooks.js (never hand-edit dist)"
    - from: "oto/hooks/dist/oto-session-start"
      to: "~/.codex/hooks/oto-session-start"
      via: "manual token-substituted copy ({{OTO_VERSION}} -> 0.4.1), user-approved out-of-repo write"
---

<objective>
Make Codex SessionStart hook detection deterministic by switching the primary signal from the CODEX_HOME env var (proven absent in real Codex hook invocations — openai/codex source only applies per-hook configured env via `command.envs(&handler.env)`, never CODEX_HOME) to an installer-registered `--codex` argv flag. The command string in ~/.codex/config.toml is fully owned by oto's installer, so an explicit argv flag is 100% deterministic; the CODEX_HOME env check is kept only as a fallback for pre-flag installs.

Purpose: Quick task 260709-ks5's fix works only when CODEX_HOME happens to be exported in the user's shell — in a fresh terminal, Codex sessions fall through to the flat fallback shape, which Codex 0.144.0's `deny_unknown_fields` parser rejects, silently dropping oto's identity injection.

Output: Updated hook cascade + installer registration + rebuilt dist + re-synced live ~/.codex install + detection-matrix regression tests.
</objective>

<execution_context>
@~/.claude/oto/workflows/execute-plan.md
@~/.claude/oto/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@oto/hooks/oto-session-start
@bin/lib/runtime-codex.cjs
@tests/05-session-start.test.cjs
@.oto/quick/260709-ks5-fix-codex-sessionstart-hook-json-schema-/260709-ks5-SUMMARY.md

<interfaces>
<!-- Key contracts, verified against current source. Use directly — no exploration needed. -->

From oto/hooks/oto-session-start (lines 85-102) — runtime-detection cascade to modify:
```bash
# Runtime-detection cascade. Use printf instead of heredoc for shell compatibility.
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  printf '{\n  "hookSpecificOutput": {...}\n}\n' "$session_context"
elif [ -n "${CODEX_HOME:-}" ]; then
  # (comment block added by 260709-ks5 — will be revised)
  printf '{\n  "hookSpecificOutput": {...}\n}\n' "$session_context"
else
  printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi
```
Note: script runs `set -euo pipefail`; `"${1:-}"` is the safe way to read argv 1 under `set -u`.

From bin/lib/runtime-codex.cjs (lines 20-37) — bash() helper IS shared across hooks; change ONLY the SessionStart entry:
```javascript
function buildHookEntries(configDir) {
  const cd = String(configDir || '').replace(/\\/g, '/');
  const hookPath = (rel) => `${cd}/hooks/${rel}`;
  const node = (rel) => `node ${shellQuote(hookPath(rel))}`;
  const bash = (rel) => `bash ${shellQuote(hookPath(rel))}`;
  return [
    { type: 'SessionStart', command: bash('oto-session-start') },   // <- append flag HERE only
    { type: 'PreToolUse', matcher: 'Write|Edit', command: node('oto-prompt-guard.js'), timeout: 5 },
    { type: 'PreToolUse', matcher: 'Bash', command: bash('oto-validate-commit.sh'), timeout: 5 },
    // ... PostToolUse entries — DO NOT TOUCH
  ];
}
```

From tests/05-session-start.test.cjs — spawnHook helper to extend with argv support:
```javascript
function spawnHook(env, cwd) {
  return spawnSync('bash', [HOOK], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
    cwd: cwd || os.tmpdir(),
    encoding: 'utf8',
  });
}
```

Command-string test audit (already performed — trust these findings):
- tests/phase-08-codex-toml.test.cjs: uses a LOCAL hardcoded HOOKS fixture, not buildHookEntries → NO update needed.
- tests/05-merge-settings.test.cjs:119-120: asserts the CLAUDE adapter's session-start command (no flag) → NO update needed (Claude registration is untouched).
- tests/phase-03-install-codex.integration.test.cjs + tests/phase-08-smoke-codex.integration.test.cjs: assert config.toml markers and oto-validate-commit.sh only — no exact SessionStart command assertion exists → NO expectation updates needed, but Task 2 ADDS a positive assertion so the flag can't silently regress.

Live install facts:
- ~/.codex/config.toml line 77: `command = "bash '/Users/Julian/.codex/hooks/oto-session-start'"` (inside `[[hooks.SessionStart.hooks]]`).
- ~/.codex/hooks/oto-session-start exists at oto-hook-version 0.4.1 (ks5 resync); package.json version is 0.4.1.
- dist is a gitignored build artifact (per ks5 SUMMARY) — rebuild it, do not commit it.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add --codex argv flag as primary Codex signal in oto-session-start + detection-matrix tests</name>
  <files>oto/hooks/oto-session-start, tests/05-session-start.test.cjs, oto/hooks/dist/oto-session-start</files>
  <behavior>
    - Test 1 (new): `--codex` argv, fully clean env (CLAUDE_PLUGIN_ROOT='', CURSOR_PLUGIN_ROOT='', COPILOT_CLI='', NO CODEX_HOME key at all) → nested envelope: single top-level key `hookSpecificOutput`, `hookEventName === 'SessionStart'`, `additionalContext` is a string, NO flat top-level `additionalContext`.
    - Test 2 (regression, already exists as 'Codex branch shape (CODEX_HOME signal)'): no argv flag, CODEX_HOME set → envelope. Keep it passing (env fallback preserved).
    - Test 3 (regression, already exists as 'fallback branch shape'): no argv flag, fully clean env → flat `{additionalContext}` shape. Keep it passing.
  </behavior>
  <action>
    1. In tests/05-session-start.test.cjs, extend `spawnHook(env, cwd)` to `spawnHook(env, cwd, args = [])` spawning `spawnSync('bash', [HOOK, ...args], ...)`. Existing call sites need no changes (default param).
    2. Add the new Test 1 above (RED first: run it, confirm it fails against the current hook because the argv flag is ignored and the flat fallback fires).
    3. In oto/hooks/oto-session-start, change the Codex branch condition from `elif [ -n "${CODEX_HOME:-}" ]; then` to:
       `elif [ "${1:-}" = "--codex" ] || [ -n "${CODEX_HOME:-}" ]; then`
       (`"${1:-}"` is required — bare `$1` aborts under `set -u` when Codex invokes without args via an old config.toml).
    4. Rewrite the branch comment block: the PRIMARY, deterministic signal is the `--codex` argv flag registered by oto's installer in ~/.codex/config.toml (verified in openai/codex source: `command.envs(&handler.env)` only adds per-hook configured env — Codex does NOT inject CODEX_HOME into hook processes). CODEX_HOME remains a FALLBACK for installs registered before the flag existed; keep one line noting its accepted false-positive edge (ks5 SUMMARY). Do not touch the Cursor/Claude/fallback branches or their order.
    5. Rebuild dist: `node scripts/build-hooks.js` — never hand-edit oto/hooks/dist/. Dist is gitignored; do not commit it.
    6. GREEN: run the 05-session-start suite; all tests pass including the two pre-existing Codex/fallback regression tests and the Claude-priority test.
  </action>
  <verify>
    <automated>node --test tests/05-session-start.test.cjs && env -i PATH="$PATH" HOME="$HOME" bash oto/hooks/dist/oto-session-start --codex | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);if(Object.keys(o).length!==1||o.hookSpecificOutput.hookEventName!=='SessionStart')process.exit(1)})" && env -i PATH="$PATH" HOME="$HOME" bash oto/hooks/dist/oto-session-start | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);if(o.hookSpecificOutput||typeof o.additionalContext!=='string')process.exit(1)})"</automated>
  </verify>
  <done>Hook fires the Codex envelope branch on `--codex` argv with a fully clean env; CODEX_HOME fallback and flat-fallback behaviors unchanged; dist rebuilt via build pipeline; 05-session-start suite green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Register `--codex` on the Codex SessionStart command in the installer + config.toml assertion</name>
  <files>bin/lib/runtime-codex.cjs, tests/phase-03-install-codex.integration.test.cjs</files>
  <behavior>
    - Test (new, in the existing INS-05 mergeSettings integration test or a sibling test): after `installRuntime(adapter, ...)` into a tmp configDir, config.toml matches /oto-session-start' --codex"$/m (SessionStart command carries the flag) AND still matches the un-flagged oto-validate-commit.sh command (other hooks unchanged).
  </behavior>
  <action>
    RED first: add the assertion, confirm it fails. Then in bin/lib/runtime-codex.cjs `buildHookEntries`, change ONLY the SessionStart entry to append the flag outside the shell-quoted path:
    `{ type: 'SessionStart', command: \`${bash('oto-session-start')} --codex\` }`
    Do NOT modify the shared `bash()`/`node()` helpers or any other entry — PreToolUse/PostToolUse command lines must remain byte-identical (runtime-claude.cjs and runtime-gemini.cjs have their own buildHookEntries and are out of scope). Run the Codex-adjacent suites to confirm no exact-command expectation broke (audit in <interfaces> found none, but prove it).
  </action>
  <verify>
    <automated>node --test tests/phase-03-install-codex.integration.test.cjs tests/phase-03-runtime-codex.test.cjs tests/phase-08-codex-toml.test.cjs tests/05-merge-settings.test.cjs</automated>
  </verify>
  <done>Fresh `installRuntime` for Codex writes `command = "bash '<configDir>/hooks/oto-session-start' --codex"` into config.toml; all other hook command lines unchanged; new assertion locks the flag; listed suites green.</done>
</task>

<task type="auto">
  <name>Task 3: Live ~/.codex sync (user-approved out-of-repo writes) + full regression</name>
  <files>~/.codex/hooks/oto-session-start (out-of-repo), ~/.codex/config.toml (out-of-repo)</files>
  <action>
    Explicitly user-approved out-of-repo writes — Codex live install only, touch nothing else:
    1. Copy the rebuilt oto/hooks/dist/oto-session-start to ~/.codex/hooks/oto-session-start, substituting the `{{OTO_VERSION}}` token with `0.4.1` (same manual token-substituted copy technique as ks5; not a full `oto install` run). Preserve the executable bit (chmod +x).
    2. Edit ~/.codex/config.toml: in the `[[hooks.SessionStart.hooks]]` block (currently line ~77), change
       `command = "bash '/Users/Julian/.codex/hooks/oto-session-start'"` to
       `command = "bash '/Users/Julian/.codex/hooks/oto-session-start' --codex"`.
       This one line is the ONLY config.toml change — no other keys, hooks, or sections.
    3. Run `npm test` for full regression.
  </action>
  <verify>
    <automated>grep -c "oto-hook-version: 0.4.1" ~/.codex/hooks/oto-session-start | grep -qx 1 && grep -qF "oto-session-start' --codex" ~/.codex/config.toml && env -i PATH="$PATH" HOME="$HOME" bash ~/.codex/hooks/oto-session-start --codex | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);if(Object.keys(o).length!==1||o.hookSpecificOutput.hookEventName!=='SessionStart')process.exit(1)})" && npm test</automated>
  </verify>
  <done>Live hook at oto-hook-version 0.4.1 with the argv branch; live config.toml SessionStart command carries --codex and nothing else changed; live hook emits the envelope under env -i with --codex; npm test fully green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| config.toml → hook argv | The `--codex` flag travels through the installer-owned command string in ~/.codex/config.toml; the file itself is user-writable local config |
| shell env → hook | CODEX_HOME fallback still reads ambient (potentially stale) shell environment |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-lln-01 | Spoofing | oto-session-start argv detection | accept | Anyone who can edit config.toml already controls what command runs; the flag only selects an output JSON shape, no privilege change |
| T-lln-02 | Tampering | CODEX_HOME fallback branch | accept | Carried over from ks5 (documented accepted edge); argv flag now makes the fallback path nearly moot for real installs |
| T-lln-03 | Denial of service | `$1` read under `set -u` | mitigate | Use `"${1:-}"` so argument-less invocations (old config.toml lines, Claude/Gemini registrations) never abort the hook |
| T-lln-04 | Tampering | Live config.toml manual edit | mitigate | Task 3 constrains the edit to the single SessionStart command line, verified by grep; no other keys touched |
</threat_model>

<verification>
- `node --test tests/05-session-start.test.cjs` — full detection matrix green (argv flag, CODEX_HOME fallback, flat fallback, Claude/Cursor priority).
- `env -i PATH="$PATH" HOME="$HOME" bash oto/hooks/dist/oto-session-start --codex` → single-key `hookSpecificOutput` envelope JSON.
- Same invocation without `--codex` (and no CODEX_HOME) → flat `{additionalContext}` JSON.
- Fresh Codex install into tmpdir writes the flagged SessionStart command; other hook lines byte-identical.
- Live ~/.codex hook + config.toml carry the fix; `npm test` fully green.
</verification>

<success_criteria>
- Codex SessionStart detection no longer depends on any env var being coincidentally exported: the installer-registered `--codex` argv flag is the deterministic primary signal.
- CODEX_HOME env check retained as fallback (pre-flag installs keep working); Cursor/Claude/fallback branches and order untouched.
- dist rebuilt only via scripts/build-hooks.js; live sync limited to the two approved out-of-repo writes.
- New tests lock the flag in both the hook (argv → envelope) and the installer (config.toml command string).
</success_criteria>

<output>
After completion, create `.oto/quick/260709-lln-make-codex-sessionstart-hook-detection-d/260709-lln-SUMMARY.md`
</output>
