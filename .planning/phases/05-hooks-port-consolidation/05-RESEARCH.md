# Phase 5: Hooks Port & Consolidation - Research

**Researched:** 2026-04-30
**Domain:** Claude Code hook fleet — port + consolidation from GSD/Superpowers upstreams
**Confidence:** HIGH

## Summary

Phase 5 ports six retained hooks from the rebrand baseline at `oto/hooks/` into a buildable, version-tagged, install-time-registered fleet. Five of the six hooks (`oto-context-monitor.js`, `oto-prompt-guard.js`, `oto-read-injection-scanner.js`, `oto-statusline.js`, `oto-validate-commit.sh`) are already correctly rebranded by Phase 4's bulk pass — they need verification, not rewriting. The sixth, `oto-session-start`, currently contains only the rebranded GSD `gsd-session-state.sh` body (project-state reminder); per D-04 it must be **rewritten** to consolidate Superpowers' identity-block emission with the project-state reminder behind a single SessionStart entrypoint, with the GSD reminder demoted to opt-in.

Three pieces of plumbing change around the hooks: (1) `scripts/build-hooks.js` retargets from top-level `hooks/` to `oto/hooks/` (source) and `oto/hooks/dist/` (output); (2) `bin/lib/copy-files.cjs` (or a sibling) gains an install-time `{{OTO_VERSION}}` token-substitution pass; (3) `bin/lib/runtime-claude.cjs::mergeSettings` — currently a no-op identity function — is filled in to register six hook entries inside an `_oto`-scoped block in `~/.claude/settings.json` with idempotent merge semantics. `bin/lib/install-state.cjs` gains a `hooks.version` field for stale-hook detection.

**Primary recommendation:** Treat `oto-session-start` as the only hook that requires real authoring work this phase. Ship the consolidation hook with the snapshot fixture as a static regression-baseline file (Phase 10 promotes it to CI). For the other five hooks, focus plan effort on verification, on `mergeSettings`, and on the build/install plumbing. Do NOT introduce a `--portable-hooks` style flag, do NOT hand-roll a TOML/JSON template engine for token substitution, and do NOT register hooks for Codex/Gemini in this phase (Phase 8 owns parity).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hook source tree & build layout:**
- **D-01:** Canonical source is `oto/hooks/` (Phase 4 baseline). Installer reads built hooks from `oto/hooks/dist/`. Top-level `hooks/` is legacy upstream layout — leave untouched. Runtime adapter `bin/lib/runtime-claude.cjs` (`sourceDirs.hooks: 'oto/hooks/dist'`) is authoritative.
- **D-02:** `scripts/build-hooks.js` reads from `oto/hooks/` and writes validated copies to `oto/hooks/dist/`. JS hooks pass through `vm.Script` syntax validation; shell hooks copied with executable bit preserved. `npm run prepare` (runs on `npm install -g github:...` per Pitfall 5) invokes the build.
- **D-03:** Token substitution (`{{OTO_VERSION}}` → real semver) happens at **install time** inside the per-runtime adapter, not at build time. Implementation: extend `bin/lib/copy-files.cjs` (or a sibling helper) with a `tokenReplace` pass keyed by file extension allowlist (`.js`, `.cjs`, `.sh`).

**SessionStart consolidation (HK-01, ADR-04, Pitfalls 8 + 15):**
- **D-04:** Single SessionStart entrypoint named `oto-session-start` (no extension; bash). Only hook registered on `SessionStart`. GSD's session-state.sh logic **inlined** into this hook; Superpowers' identity-block emission **inlined and rebranded**. No companion SessionStart hook shipped.
- **D-05:** Identity-block content (rebranded; literal-string scan per Pitfall 15):
  ```
  <EXTREMELY_IMPORTANT>
  You are using oto.

  Below is the full content of your 'oto:using-oto' skill — your introduction to using oto skills.
  For all other skills, use the Skill tool.

  {{contents of oto/skills/using-oto/SKILL.md, escaped for JSON}}
  </EXTREMELY_IMPORTANT>
  ```
  No reference to "superpowers" or "GSD" remains. Block emitted unconditionally (always-on identity primer) — per ADR-04 Consequences, this is the regression baseline.
- **D-06:** The skill file `oto/skills/using-oto/SKILL.md` does not yet exist (ships in Phase 6, SKL-07). Phase 5 SessionStart hook reads the file defensively: if missing, emit a placeholder identity block (`oto v{{OTO_VERSION}} is installed. The 'oto:using-oto' skill ships in Phase 6.`) so Phase 5 ships green and Phase 6 backfills the content. Phase 6 is not a hard precondition for Phase 5 closeout.
- **D-07:** Project-state reminder (GSD's session-state.sh contribution) is appended to the identity block, **opt-in** via `.oto/config.json` `hooks.session_state: true` (renamed from upstream `hooks.community: true` for cleaner semantics). Default off. When opt-in is on, head of `.oto/STATE.md` (first 20 lines) concatenated after the identity block, separated by `\n\n## Project State Reminder\n\n`.
- **D-08:** Runtime-detection cascade preserved verbatim from upstream Superpowers session-start (Cursor → Claude Code → Copilot/SDK-default). Cursor branch left in place. The branches **removed** are OpenCode, Kilo, Windsurf, Augment, Trae, Qwen, CodeBuddy, Cline, Antigravity (these never had branches in upstream Superpowers — confirmed by re-reading the upstream hook).
- **D-09:** SessionStart-output snapshot fixture lives at `oto/hooks/__fixtures__/session-start-claude.json`. Phase 10 promotes it to a CI check; Phase 5 ships it as a static file with a one-line note in `oto/hooks/README.md`.

**Stale-hook detection & version token (HK-07, Pitfall 20):**
- **D-10:** Every hook source file (`.js`, `.cjs`, `.sh`, and extensionless `oto-session-start`) carries `# oto-hook-version: {{OTO_VERSION}}` (or `// oto-hook-version: {{OTO_VERSION}}` for `.js`/`.cjs`) on line 2 (line 1 is the shebang). Plain string replace on `{{OTO_VERSION}}` only.
- **D-11:** Stale-hook detection on upgrade: when `oto install --claude` runs and detects an existing oto hook in `~/.claude/hooks/<name>` whose version token does not match the package's current version, the installer overwrites it (no warning loop) and records the prior version in the marker JSON.

**Hook registration in `~/.claude/settings.json`:**
- **D-12:** `runtime-claude.cjs::mergeSettings` registers exactly one entry per retained hook in `~/.claude/settings.json`, scoped to oto's marker block:
  - `SessionStart` → `<configDir>/hooks/oto-session-start`
  - `PreToolUse` → `<configDir>/hooks/oto-prompt-guard.js` (matchers: any tool call)
  - `PostToolUse` → `<configDir>/hooks/oto-read-injection-scanner.js` (matchers: `Read`)
  - `PostToolUse` → `<configDir>/hooks/oto-validate-commit.sh` (matchers: `Bash` with `git commit` pattern)
  - `Statusline` → `<configDir>/hooks/oto-statusline.js`
  - `Stop` (or per Claude Code's exact event name for context-monitor) → `<configDir>/hooks/oto-context-monitor.js`
- **D-13:** Marker block format follows the existing oto pattern. Since `settings.json` is JSON not Markdown, an `_oto` top-level key with a `version` field and a list of installed hook entries — chosen format aligns with how the runtime-claude adapter manages other settings markers; the installer must round-trip user-authored entries unchanged.
- **D-14:** Uninstall removes only the `_oto`-marked hook entries from `settings.json`; does NOT remove user-authored entries even if they share an event name.

**Statusline (HK-02):**
- **D-15:** Statusline reads from `.oto/STATE.md`. Display shape preserved from upstream (`model | current task | directory | context usage`). No additional fields added in Phase 5.

**Hook source language policy:**
- **D-16:** Keep upstream language choice per hook — bash for `oto-session-start` and `oto-validate-commit.sh`; Node.js for the four `.js` hooks. No conversion to a single language.

**Test surface (Phase-bounded):**
- **D-17:** Phase 5 ships **focused** `node:test` files only — not a full CI rebuild (Phase 10 owns that):
  1. `oto-session-start` outputs a JSON document with exactly one `<EXTREMELY_IMPORTANT>` block, no `superpowers` or `gsd` substring (excluding runtime-detection comments), correct top-level field per platform env var.
  2. The build-hooks script writes 6 files into `oto/hooks/dist/` (matching inventory's keep set) and exits 0 on a clean tree.
  3. Token substitution on a fixture string produces a valid semver-shaped output and round-trips.
  4. `mergeSettings` round-trip: given a fixture `settings.json` with user-authored entries, oto's merge adds its block, a second merge is idempotent, an unmerge removes only oto's block.
- **D-18:** Phase 5 does NOT ship runtime parity tests for Codex/Gemini hooks (Phase 8) nor full SessionStart fixture CI enforcement (Phase 10). Ships the Claude fixture as a static file with a TODO comment pointing at Phase 10.

### Claude's Discretion

- Exact filenames for test files (`05-NN-*.test.cjs` per phase convention)
- Whether to fold the SessionStart fixture writer into the test that verifies the hook output, or keep it as a standalone golden-file
- Whether to add a `--portable-hooks` style flag to the installer in Phase 5 (defaults: not in scope; revisit in Phase 8 parity work — D-12 above stays Claude-focused)
- Whether to refactor `scripts/build-hooks.js` into `bin/lib/build-hooks.cjs` (kept loose; planner can choose based on whether other adapter entry points need it)

### Deferred Ideas (OUT OF SCOPE)

- **Codex hook parity** — Phase 8 (`runtime-codex.cjs::mergeSettings` + Codex `[hooks]` TOML).
- **Gemini hook parity** — Phase 8.
- **Skill-auto-load deferral when phase is active** — Phase 6 (skill body owns this).
- **CI snapshot enforcement of SessionStart output** — Phase 10 (CI-08).
- **License-attribution CI check coverage of hook files** — Phase 10 (CI-06).
- **`--portable-hooks` style installer flag for WSL/Docker** — Out of scope.
- **Hook signing / hash-based integrity** — Pitfall list mentions; deferred until threat justifies.
- **Runtime detection beyond Cursor/Claude/Copilot** — Out of scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HK-01 | Single consolidated SessionStart hook | D-04..D-09 + Superpowers session-start anatomy + GSD session-state.sh anatomy → consolidation algorithm |
| HK-02 | Statusline hook (workflow-aware) | D-15 + GSD `gsd-statusline.js` already rebranded → verify + register |
| HK-03 | Context-monitor hook (warns at thresholds) | D-12 (event name = **PostToolUse**, see Pitfall A below) + GSD `gsd-context-monitor.js` already rebranded → verify + register |
| HK-04 | Prompt-guard hook | D-12 + GSD `gsd-prompt-guard.js` already rebranded → verify + register |
| HK-05 | Read-injection-scanner hook | D-12 (matcher `Read`) + GSD `gsd-read-injection-scanner.js` already rebranded → verify + register |
| HK-06 | Validate-commit hook | D-12 (matcher `Bash` + `git commit` regex) + GSD `gsd-validate-commit.sh` already rebranded → verify + register |
| HK-07 | Hook source files version-tagged with `# oto-hook-version: {{OTO_VERSION}}` | D-03, D-10, D-11 + token-replace pass in copy-files.cjs + marker schema field in install-state.cjs |

## Project Constraints (from CLAUDE.md)

- **Language:** JavaScript (CommonJS `.cjs` for tooling, raw `.js`/`.md`/`.sh` for shipped artifacts). No TypeScript top-level.
- **Runtime:** Node.js >= 22.0.0.
- **Test framework:** `node:test` (built-in, zero-deps). No Vitest at top level.
- **No build step at top level** beyond the syntax-validating hook copy.
- **Install:** copy-not-symlink; files installed under runtime config dir (`~/.claude/`).
- **Personal-use cost ceiling:** do not over-engineer. Hook signing, portable-hooks flag, runtime-parity tests, and CI snapshot enforcement are explicitly OUT-OF-SCOPE for Phase 5.
- **GSD workflow enforcement:** No direct edits outside `/oto-*` workflow.
- **GSD spine:** Code lives under `bin/lib/*.cjs` (library), `scripts/*.js` (build tools), `oto/hooks/` (shipped hook payload).

## Standard Stack

### Core (already in repo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs`, `node:fs/promises` | built-in | File I/O for hook source/dest, settings.json read/write | Zero-dep policy [VERIFIED: package.json] |
| `node:path` | built-in | Cross-platform path joining for `<configDir>/hooks/<name>` | Standard Node [VERIFIED: copy-files.cjs] |
| `node:vm` | built-in | `vm.Script` syntax validation in build-hooks.js (catches duplicate `const` bugs upstream hit in #1107, #1109, #1125, #1161) | Already used; pattern in `scripts/build-hooks.js:13` [VERIFIED: read both copies] |
| `node:crypto` | built-in | sha256 hashing for state file (already used in copy-files.cjs `sha256File`) | [VERIFIED: copy-files.cjs:97] |
| `node:test` | built-in (Node 22+) | Test framework for D-17 test surface | [CITED: CLAUDE.md] |

### Supporting (no new deps required)

| Helper | Source | Purpose | When to Use |
|--------|--------|---------|-------------|
| `bin/lib/copy-files.cjs::copyTree` | exists | Recursive copy with symlink rejection | Reused for hook copy; D-03 token-replace attaches to a sibling helper or as a post-pass |
| `bin/lib/install-state.cjs::{readState,writeState,validateState}` | exists | Marker JSON schema and round-trip | Extend schema with `hooks.version` (D-11) |
| `bin/lib/marker.cjs::{injectMarkerBlock,removeMarkerBlock,findUpstreamMarkers}` | exists | HTML-comment marker pattern for Markdown files | NOT directly reusable for `settings.json` (JSON, not Markdown) — see D-13: use `_oto` top-level key instead |
| `bin/lib/runtime-claude.cjs::mergeSettings` | exists (no-op identity) | Hook registration in `settings.json` | Replace identity body with the D-12 registration logic |
| `scripts/build-hooks.js` | exists (targets top-level `hooks/`) | vm.Script-validating copy | Retarget to `oto/hooks/` → `oto/hooks/dist/` (D-01/D-02) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff (why we don't) |
|------------|-----------|-------------------------|
| `_oto` top-level key in settings.json | HTML-comment markers like CLAUDE.md uses | settings.json is JSON, not Markdown — embedded comments would be stripped by JSONC parser or break strict JSON. `_oto` underscore-prefix is the JSON-idiomatic way to mark "internal" keys (D-13) |
| Plain string replace for `{{OTO_VERSION}}` | A template engine (Handlebars, EJS) | Adds a dep; only one token to substitute. Plain `.replaceAll('{{OTO_VERSION}}', version)` is sufficient and matches GSD upstream's approach |
| Build-time token substitution | Install-time substitution (D-03) | Build runs once; install runs per-runtime. Install-time keeps `oto/hooks/dist/` template-pristine for re-use across multiple `oto install --<runtime>` invocations |
| Registering hooks via Claude Code plugin manifest | Direct `~/.claude/settings.json` edit | oto is npm-installed, not a Claude Code plugin. No plugin manifest path. settings.json is the documented surface for hook registration [CITED: code.claude.com/docs/en/hooks] |

**Installation:** No new packages. All work is internal.

**Version verification:** N/A — phase uses only Node built-ins.

## Architecture Patterns

### Recommended Project Structure (Phase 5 changes only)

```
oto/hooks/                              # source (D-01); already populated by Phase 4
├── oto-session-start                   # bash, extensionless — REWRITE (D-04..D-09)
├── oto-statusline.js                   # already rebranded — verify
├── oto-context-monitor.js              # already rebranded — verify
├── oto-prompt-guard.js                 # already rebranded — verify
├── oto-read-injection-scanner.js       # already rebranded — verify
├── oto-validate-commit.sh              # already rebranded — verify
├── __fixtures__/                       # NEW (D-09)
│   └── session-start-claude.json       # static snapshot baseline; Phase 10 promotes
├── README.md                           # NEW; one-line note on fixture per D-09
└── dist/                               # build output (D-02); ignored in source tree

scripts/build-hooks.js                  # RETARGET: source → oto/hooks/, dest → oto/hooks/dist/

bin/lib/copy-files.cjs                  # EXTEND: token-replace pass (D-03)
bin/lib/install-state.cjs               # EXTEND: hooks.version field (D-11)
bin/lib/runtime-claude.cjs              # EXTEND: mergeSettings (D-12, D-13, D-14)

tests/                                  # NEW (per D-17)
├── 05-01-session-start-output.test.cjs # D-17 (1)
├── 05-02-build-hooks.test.cjs          # D-17 (2)
├── 05-03-token-substitution.test.cjs   # D-17 (3)
└── 05-04-merge-settings.test.cjs       # D-17 (4)
```

### Pattern 1: Single SessionStart Entrypoint (D-04)

**What:** One bash script that consolidates Superpowers identity emission + (opt-in) GSD project-state reminder, with runtime-detection cascade for Cursor/Claude/Copilot.

**When to use:** This is THE SessionStart hook for oto. No companion hooks register on SessionStart.

**Anatomy (synthesized from `foundation-frameworks/superpowers-main/hooks/session-start` lines 1-58 and `foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh` lines 1-35):**

```bash
#!/usr/bin/env bash
# oto-hook-version: {{OTO_VERSION}}
# oto-session-start — consolidated SessionStart hook
# Emits identity block (always) + project-state reminder (opt-in).

set -euo pipefail

# 1. Determine plugin/install root — works whether installed under
#    ~/.claude/hooks/ or invoked directly from a checkout.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 2. Identity-block content (D-05). Defensively read SKILL.md (D-06).
SKILL_PATH="${PLUGIN_ROOT}/skills/using-oto/SKILL.md"
if [ -f "$SKILL_PATH" ]; then
  using_oto_content=$(cat "$SKILL_PATH")
else
  using_oto_content="oto v{{OTO_VERSION}} is installed. The 'oto:using-oto' skill ships in Phase 6."
fi

# 3. JSON-escape function — verbatim from Superpowers session-start lines 23-31.
escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

using_oto_escaped=$(escape_for_json "$using_oto_content")

# 4. Build the identity block (D-05 literal — NO upstream identity strings).
session_context="<EXTREMELY_IMPORTANT>\nYou are using oto.\n\nBelow is the full content of your 'oto:using-oto' skill — your introduction to using oto skills. For all other skills, use the Skill tool.\n\n${using_oto_escaped}\n</EXTREMELY_IMPORTANT>"

# 5. Optional project-state reminder (D-07). Opt-in via .oto/config.json hooks.session_state: true.
if [ -f .oto/config.json ]; then
  ENABLED=$(node -e "try{const c=require('./.oto/config.json');process.stdout.write(c.hooks?.session_state===true?'1':'0')}catch{process.stdout.write('0')}" 2>/dev/null)
  if [ "$ENABLED" = "1" ] && [ -f .oto/STATE.md ]; then
    state_head=$(head -20 .oto/STATE.md)
    state_escaped=$(escape_for_json "$state_head")
    session_context="${session_context}\n\n## Project State Reminder\n\n${state_escaped}"
  fi
fi

# 6. Runtime-detection cascade — VERBATIM from Superpowers lines 46-55 (D-08).
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
else
  printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi

exit 0
```

**Key differences from Superpowers source:**
- Identity literal `You have superpowers.` → `You are using oto.` (D-05)
- Skill name `superpowers:using-superpowers` → `oto:using-oto` (D-05)
- Skill path `${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md` → `${PLUGIN_ROOT}/skills/using-oto/SKILL.md`
- Defensive SKILL.md fallback (D-06) — Superpowers had no fallback (relied on co-installed skill); we need it because Phase 6 backfills.
- Legacy-skills warning logic (`${HOME}/.config/superpowers/skills` check, lines 11-15) — DROPPED. oto has no legacy install path.
- `printf` over heredoc preserved (works around bash 5.3+ heredoc hang per Superpowers issue #571).
- Inline opt-in project-state reminder (D-07) — adapted from `gsd-session-state.sh:10-15`, but renamed `hooks.community` → `hooks.session_state` for cleaner semantics.

### Pattern 2: `mergeSettings` Round-Trip Pattern (D-12, D-13, D-14)

**What:** A pure function `(existingText: string, otoBlock: object) → string` that injects oto's hook entries under a top-level `_oto` key, idempotent on second call, removable cleanly.

**JSON shape (D-13):**
```json
{
  "<existing user keys preserved verbatim>": "...",
  "statusLine": { "type": "command", "command": "node \"<configDir>/hooks/oto-statusline.js\"" },
  "hooks": {
    "SessionStart": [ { "hooks": [ { "type": "command", "command": "bash \"<configDir>/hooks/oto-session-start\"" } ] } ],
    "PreToolUse":   [ { "matcher": "Write|Edit", "hooks": [ { "type": "command", "command": "node \"<configDir>/hooks/oto-prompt-guard.js\"", "timeout": 5 } ] } ],
    "PostToolUse":  [
      { "matcher": "Read", "hooks": [ { "type": "command", "command": "node \"<configDir>/hooks/oto-read-injection-scanner.js\"", "timeout": 5 } ] },
      { "matcher": "Bash", "hooks": [ { "type": "command", "command": "bash \"<configDir>/hooks/oto-validate-commit.sh\"", "timeout": 5 } ] },
      { "matcher": "Bash|Edit|Write|MultiEdit|Agent|Task", "hooks": [ { "type": "command", "command": "node \"<configDir>/hooks/oto-context-monitor.js\"", "timeout": 10 } ] }
    ]
  },
  "_oto": {
    "version": "0.1.0-alpha.1",
    "installed_at": "2026-04-30T...",
    "hooks": [
      { "event": "SessionStart", "command_contains": "oto-session-start" },
      { "event": "PreToolUse",   "matcher": "Write|Edit",      "command_contains": "oto-prompt-guard.js" },
      { "event": "PostToolUse",  "matcher": "Read",            "command_contains": "oto-read-injection-scanner.js" },
      { "event": "PostToolUse",  "matcher": "Bash",            "command_contains": "oto-validate-commit.sh" },
      { "event": "PostToolUse",  "matcher": "Bash|Edit|Write|MultiEdit|Agent|Task", "command_contains": "oto-context-monitor.js" },
      { "event": "statusLine",   "command_contains": "oto-statusline.js" }
    ]
  }
}
```

**Round-trip rules:**
1. **Initial install:** add hook entries under their event keys; create `_oto` block; preserve all other user-authored entries verbatim.
2. **Idempotent re-install:** check existence by `command_contains` substring match against the registered list; do not duplicate.
3. **Stale-version overwrite (D-11):** if `_oto.version !== ctx.otoVersion`, overwrite the matched entries (do NOT touch user-authored entries that share an event), record prior version.
4. **Uninstall (D-14):** for each event in `_oto.hooks`, find the entry whose command contains the registered substring AND was added by oto (use `command_contains` as identity); remove it; remove `_oto` block. User-authored entries with the same event survive.

### Pattern 3: Install-Time Token Substitution (D-03)

**What:** During copy of `oto/hooks/dist/<file>` → `<configDir>/hooks/<file>`, read the file, replace `{{OTO_VERSION}}` (and only that token) with the current `ctx.otoVersion` semver, write to destination.

**Allowlist (file-extension keyed, per D-03):** `.js`, `.cjs`, `.sh`, and the extensionless `oto-session-start`.

**Allowlist exclusions (do-not-touch):**
- Any path containing `foundation-frameworks/` (already in rebrand do-not-rename allowlist)
- `LICENSE*` files (per Pitfall 6, copyright preservation)
- Files under `__fixtures__/` (test fixtures — must remain template-pristine)

**Implementation sketch (sibling to `copyTree` in `copy-files.cjs`):**
```javascript
async function copyTreeWithTokens(src, dst, opts) {
  const TOKEN_FILE_EXTS = new Set(['.js', '.cjs', '.sh', '']); // '' for extensionless oto-session-start
  const TOKEN_DENY_PATHS = ['foundation-frameworks/', '__fixtures__/', 'LICENSE'];
  const replacements = opts?.tokens || {}; // e.g. { OTO_VERSION: '0.1.0' }
  // walk; for each file: if extension in allowlist AND no deny-path match,
  // read text, replace `{{KEY}}` for each KEY in replacements, write.
  // else: plain copyFileSync.
  // Preserve executable bit on .sh.
}
```

### Anti-Patterns to Avoid

- **Markdown HTML-comment markers in settings.json:** Stripped or break strict JSON. Use `_oto` top-level key per D-13.
- **Substituting tokens at build time and committing the result:** Defeats per-install version rewrite (D-03 + D-11 stale detection). Token must remain template-form in `oto/hooks/dist/`.
- **Adding a `--portable-hooks` flag:** Out of scope (CONTEXT Deferred). Personal-use cost ceiling.
- **Registering hooks for Codex or Gemini in `mergeSettings`:** Phase 8 owns this. `runtime-codex.cjs` and `runtime-gemini.cjs` keep their `mergeSettings` as identity stubs in Phase 5.
- **Touching the legacy top-level `hooks/`:** D-01 says leave it. The retarget moves the build to `oto/hooks/`; the legacy dir stays `.gitkeep`-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bash JSON escaping for SessionStart output | A character-by-character escape loop | The 5-line `escape_for_json` from Superpowers session-start (lines 23-31) | Already vetted upstream; uses bash parameter substitution (single C-level pass each, orders of magnitude faster than char loops). Verbatim port [VERIFIED: foundation-frameworks/superpowers-main/hooks/session-start:23-31] |
| JS hook syntax validation | A parser or linter | `vm.Script(content, { filename })` — catches `SyntaxError` without executing | Pattern already in `scripts/build-hooks.js:13`. Caught real upstream bugs (#1107, #1109, #1125, #1161) [VERIFIED: gsd-build-hooks.js:33-49] |
| settings.json read with comment tolerance | A custom JSONC parser | Try `JSON.parse` first; on failure, strip `// ` and `/* */` comments, retry | GSD upstream pattern at `bin/install.js:543-589`. Most user settings.json files are strict JSON; JSONC fallback only for hand-edited cases [VERIFIED: gsd-install.js:543] |
| Hook command path construction | Hand-build platform-specific paths | Single helper that emits `{runner} "{configDir}/hooks/{name}"` with forward-slash normalization | GSD's `buildHookCommand` at `bin/install.js:497-515` — handles Windows-safe forward slashes, optional `$HOME`-relative for portable mode (we skip portable mode per OOS) [VERIFIED: gsd-install.js:497-515] |
| Idempotent merge of array entries | Index-based replace | Membership check via `command_contains` substring on each entry's `hooks[].command` | GSD's `hasGsdUpdateHook = settings.hooks.SessionStart.some(entry => entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-check-update')))` pattern at `bin/install.js:6609-6611` [VERIFIED: gsd-install.js:6609] |
| Per-runtime hook event name detection | Hardcode for Claude only (Phase 5 scope) | Stay Claude-focused. Codex/Gemini need separate adapters in Phase 8 | D-12 + MR-01 phase ordering. Codex/Gemini `mergeSettings` remain identity in Phase 5 |

**Key insight:** Phase 5 is mostly *plumbing* around already-rebranded hook bodies. The temptation to over-engineer the registration framework is real and explicit-cost-ceiling-violating. The five `.js`/`.sh` hooks are stable upstream code that's been running in production for months; Phase 5 doesn't need to improve them, just register and version-tag them correctly.

## Common Pitfalls

### Pitfall A: Wrong Claude Code event name for context-monitor

**What goes wrong:** D-12 in CONTEXT.md says "Stop (or per Claude Code's exact event name for context-monitor)" — leaving the event name underdetermined. Picking `Stop` instead of `PostToolUse` would break the existing context-monitor hook body.

**Why it happens:** The conceptual description "fires after each turn" suggests `Stop` (which fires when Claude finishes responding). But the actual upstream behavior is "fires after each tool use" (PostToolUse), so the agent gets a context warning between tool invocations within a turn — that's the whole point.

**Authoritative answer:**
- Upstream GSD registers context-monitor on `PostToolUse` with matcher `Bash|Edit|Write|MultiEdit|Agent|Task` and `timeout: 10` [VERIFIED: foundation-frameworks/get-shit-done-main/bin/install.js:6643-6651]
- The hook body emits `hookSpecificOutput.hookEventName: "PostToolUse"` (with a `process.env.GEMINI_API_KEY ? "AfterTool" : "PostToolUse"` switch) [VERIFIED: gsd-context-monitor.js:182]
- Claude Code docs confirm `PostToolUse` is the documented event for "fires after Claude completes an action" [CITED: code.claude.com/docs/en/hooks]

**Decision for the planner:** D-12's context-monitor row should be **PostToolUse** with matcher `Bash|Edit|Write|MultiEdit|Agent|Task` and `timeout: 10` — NOT `Stop`. The CONTEXT.md "(or per Claude Code's exact event name)" parenthetical resolves to `PostToolUse`.

**How to avoid:** Plans MUST cite the upstream registration line (`bin/install.js:6643-6651`) when writing the `mergeSettings` body, to prevent regressing this.

### Pitfall B: Pitfall 8 — Hooks fire in unspecified order; double SessionStart injection

**What goes wrong:** Both upstreams register on SessionStart (Superpowers identity + GSD session-state). If both register on the same install, model gets two identity blocks per session.

**Why it happens:** Claude Code's array semantics for `settings.hooks.SessionStart` allow multiple entries; merge order is not guaranteed. Upstream cited [Pitfall 8: PITFALLS.md] and [ADR-04 §Decision].

**How to avoid:**
- D-04 enforces single entrypoint (`oto-session-start`) — only ONE entry registered on SessionStart by `mergeSettings`.
- D-09 snapshot fixture verifies output has exactly one `<EXTREMELY_IMPORTANT>` block.
- `marker.cjs::findUpstreamMarkers` already detects upstream `<EXTREMELY_IMPORTANT>You have superpowers.` in instruction files [VERIFIED: bin/lib/marker.cjs:46-50] — extend the test surface to also scan the SessionStart hook output for upstream substrings.

**Verification step (test 1, D-17):** Run `oto-session-start` in a sandboxed env with only `CLAUDE_PLUGIN_ROOT` set. Capture stdout. Parse as JSON. Assert:
1. exactly one occurrence of `<EXTREMELY_IMPORTANT>` in `hookSpecificOutput.additionalContext`
2. no occurrence of `superpowers`, `Superpowers`, `gsd`, `GSD`, or `Get Shit Done` (excluding the runtime-detection comment block)
3. exactly one identity sentence (`You are using oto.`)
4. top-level structure is `{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "..." } }`

### Pitfall C: Pitfall 15 — Hook injection of literal strings exposes upstream identity

**What goes wrong:** `oto-session-start` (or any rebranded hook) keeps a literal string like `superpowers:using-superpowers` or `<EXTREMELY_IMPORTANT>You have superpowers.` — model loads upstream identity.

**Why it happens:** Identity strings sit inside string literals where word-boundary rebrand rules might not match (the rename engine treats `gsd-` and word-boundary `gsd` differently from `<EXTREMELY_IMPORTANT>You have superpowers.`).

**How to avoid:**
- D-05 specifies the *exact* replacement literal — not a generic rebrand pass.
- D-17 test 1 scans the captured JSON for residual upstream substrings.
- ADR-04 §Consequences explicitly calls out hand-rebrand here: "Superpowers literals such as `<EXTREMELY_IMPORTANT>You have superpowers.` and `using-superpowers` are hand-rebranded inside that hook, not treated as generic rename-map substitutions."

**Verification:** Per D-09, the snapshot fixture is hand-eyeballed once during Phase 5 closeout, then locked. Phase 10 promotes to CI.

### Pitfall D: Pitfall 20 — Token substitution breakage

**What goes wrong:** Forgetting the install-time token-substitution pass; hooks ship with literal `{{OTO_VERSION}}` in `~/.claude/hooks/*`; stale-hook detection fires on every session.

**Why it happens:** Multi-step install pipeline: (1) build copies `oto/hooks/` → `oto/hooks/dist/` (token-pristine); (2) install copies `oto/hooks/dist/` → `<configDir>/hooks/`. If step 2 doesn't substitute, tokens leak.

**How to avoid:**
- D-03 substitution is in `bin/lib/copy-files.cjs` (or sibling) — the install path, not the build path.
- D-17 test 3 round-trips: substitute a known fixture, replace the substituted version back, assert original template is recovered. This catches both forward (substitution missing) and inverse (substitution clobbers other content) bugs.
- D-11 stale-hook detection catches the runtime symptom (version mismatch in marker JSON triggers overwrite).

### Pitfall E: settings.json silent-discard from invalid hook entries

**What goes wrong:** Claude Code silently discards the entire `settings.json` if any hook entry is structurally invalid — disabling all plugins for the user.

**Why it happens:** Upstream GSD hit this and added a `validateHookEntries` pass (`bin/install.js:4793-4865`) that asserts every hook entry has a `hooks: [...]` array, every `command` hook has a `command` field, every `agent` hook has a `prompt` field [VERIFIED: gsd-install.js:4793-4865].

**How to avoid:**
- `mergeSettings` produces only `type: "command"` entries with `command:` populated and `hooks: [...]` arrays.
- D-17 test 4 round-trip implicitly catches this (Claude Code consuming the merged file would fail; we don't run Claude Code in tests, but we do parse the JSON ourselves and assert shape).
- Cite GSD's validator pattern in the plan; consider porting a simplified version.

### Pitfall F: Build pipeline reads wrong hook directory

**What goes wrong:** `scripts/build-hooks.js` (currently top-level `hooks/`-targeted) keeps reading the empty legacy `hooks/` after Phase 5 lands — `oto/hooks/dist/` ends up empty.

**Why it happens:** D-01 says leave the top-level `hooks/` alone (it's `.gitkeep` + `dist/` only). The retarget is required by D-02.

**How to avoid:** D-17 test 2 asserts `oto/hooks/dist/` contains exactly the 6 retained hook files. Failing this test means the build retarget didn't take.

### Pitfall G: Executable-bit lost on `.sh` files (mode-644 trap)

**What goes wrong:** `npm install -g <unpacked-dir>` does not chmod bin targets; if `chmodSync(0o755)` is missing in the build path, `oto-validate-commit.sh` and `oto-session-start` install as 644 and Claude Code reports "permission denied" on hook fire.

**Why it happens:** Upstream issue #2453. Existing `scripts/build-hooks.js:56-62` already handles `.sh` (`fs.chmodSync(dest, 0o755)`); but the extensionless `oto-session-start` won't match `name.endsWith('.sh')`. Need to extend the chmod check to detect bash hooks by **shebang** OR by exact-name match for `oto-session-start`.

**How to avoid:** In the retargeted `build-hooks.js`, treat any file with `#!/usr/bin/env bash` or `#!/bin/bash` shebang as executable (chmod 0o755), regardless of extension. Same for the install-time copy in `copy-files.cjs`.

## Code Examples

### Example 1: Mapped hook event registrations (settings.json shape per D-12)

```json
// Source: synthesized from foundation-frameworks/get-shit-done-main/bin/install.js:6600-6857
// + D-12 selection of retained hooks + D-13 _oto marker block.
// Key change vs upstream: context-monitor → PostToolUse (NOT Stop), per Pitfall A.
{
  "statusLine": {
    "type": "command",
    "command": "node \"/Users/julian/.claude/hooks/oto-statusline.js\""
  },
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "bash \"/Users/julian/.claude/hooks/oto-session-start\"" } ] }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit",
        "hooks": [ { "type": "command", "command": "node \"/Users/julian/.claude/hooks/oto-prompt-guard.js\"", "timeout": 5 } ] }
    ],
    "PostToolUse": [
      { "matcher": "Read",
        "hooks": [ { "type": "command", "command": "node \"/Users/julian/.claude/hooks/oto-read-injection-scanner.js\"", "timeout": 5 } ] },
      { "matcher": "Bash",
        "hooks": [ { "type": "command", "command": "bash \"/Users/julian/.claude/hooks/oto-validate-commit.sh\"", "timeout": 5 } ] },
      { "matcher": "Bash|Edit|Write|MultiEdit|Agent|Task",
        "hooks": [ { "type": "command", "command": "node \"/Users/julian/.claude/hooks/oto-context-monitor.js\"", "timeout": 10 } ] }
    ]
  },
  "_oto": {
    "version": "0.1.0-alpha.1",
    "installed_at": "2026-04-30T12:00:00Z",
    "hooks": [
      { "event": "SessionStart", "command_contains": "oto-session-start" },
      { "event": "PreToolUse",   "matcher": "Write|Edit", "command_contains": "oto-prompt-guard.js" },
      { "event": "PostToolUse",  "matcher": "Read",       "command_contains": "oto-read-injection-scanner.js" },
      { "event": "PostToolUse",  "matcher": "Bash",       "command_contains": "oto-validate-commit.sh" },
      { "event": "PostToolUse",  "matcher": "Bash|Edit|Write|MultiEdit|Agent|Task", "command_contains": "oto-context-monitor.js" },
      { "event": "statusLine",   "command_contains": "oto-statusline.js" }
    ]
  }
}
```

### Example 2: install-state.cjs schema extension (D-11)

```javascript
// Source: existing bin/lib/install-state.cjs + D-11 hooks.version field.
// Add the new optional field to validateState (NOT making it required to preserve
// backward compat with Phase 3-installed states — but writeState always writes it).
function validateState(state) {
  // ... existing checks ...
  // NEW: hooks block (optional in v1 schema; added by Phase 5)
  if (state.hooks !== undefined) {
    if (!state.hooks || typeof state.hooks !== 'object') errors.push('state.hooks must be object');
    else {
      if (typeof state.hooks.version !== 'string') errors.push('state.hooks.version must be string');
      // version is the same as state.oto_version at write time; mismatch implies
      // partial install or stale state.
    }
  }
  return errors;
}
```

### Example 3: Test fixture for SessionStart output (D-17 test 1)

```javascript
// tests/05-01-session-start-output.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('oto-session-start emits exactly one identity block on Claude runtime', () => {
  const hookPath = path.join(__dirname, '..', 'oto', 'hooks', 'oto-session-start');
  const result = spawnSync('bash', [hookPath], {
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', COPILOT_CLI: '' },
    cwd: __dirname, // no .oto/config.json -> opt-in OFF, no project-state reminder
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.ok(output.hookSpecificOutput);
  assert.strictEqual(output.hookSpecificOutput.hookEventName, 'SessionStart');
  const ctx = output.hookSpecificOutput.additionalContext;
  // Exactly one identity block
  const blockMatches = ctx.match(/<EXTREMELY_IMPORTANT>/g) || [];
  assert.strictEqual(blockMatches.length, 1, 'Pitfall 8 / Pitfall C — exactly one identity block');
  // No upstream identity strings (Pitfall 15)
  for (const needle of ['superpowers', 'Superpowers', 'gsd-', '\\bGSD\\b', 'Get Shit Done']) {
    assert.ok(!new RegExp(needle).test(ctx), `Upstream identity leaked: ${needle}`);
  }
  // The oto identity literal
  assert.ok(ctx.includes('You are using oto.'));
  assert.ok(ctx.includes("'oto:using-oto'"));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two SessionStart hooks (GSD's session-state + Superpowers' session-start) | One consolidated `oto-session-start` | ADR-04 (Phase 1) | One identity block per session; one snapshot baseline (Pitfall 8 + 15 mitigated) |
| Bash heredoc for JSON output | `printf '...'` with substitution | Superpowers v5.0.x (issue #571) | Avoids bash 5.3+ heredoc hang; faster |
| Char-by-char escape loop in bash | Five `${s//old/new}` parameter substitutions | Superpowers `escape_for_json` upstream | Single C-level pass each — orders-of-magnitude speedup |
| `# gsd-hook-version: literal` (no token) | `# oto-hook-version: {{OTO_VERSION}}` substituted at install | GSD CHANGELOG 1.38.5 (issue #2136) → ADR-02 + D-10 | Stale-hook detection on upgrade (D-11) |
| Hooks copied directly from source dir | Validated through `vm.Script` then copied to `dist/` | GSD #1107..#1161 cluster | Catches duplicate-`const` and other syntax errors before shipping |
| Hand-edit `~/.claude/settings.json` | Marker-scoped merge with idempotent round-trip | oto Phase 3 marker.cjs + Phase 5 mergeSettings (D-13) | User-authored entries preserved; uninstall is clean |
| Context-monitor on `Stop` (incorrect mental model) | Context-monitor on `PostToolUse` with broad matcher | Established by GSD upstream `bin/install.js:6643-6651` | Warning fires between tools, not after the whole turn — what users want |

**Deprecated/outdated (do NOT carry forward):**
- `gsd-check-update*` — dropped per file-inventory; oto upgrade is `npm install -g github:.../#vX.Y.Z`, no in-process check needed
- `gsd-phase-boundary.sh` — dropped per file-inventory
- `gsd-read-guard.js` — dropped per file-inventory (read-before-edit guidance was Codex-flavored)
- `gsd-workflow-guard.js` — dropped per file-inventory
- `--portable-hooks` flag — dropped (no Windows/WSL support per PROJECT.md)
- "Community hooks" naming → renamed to `hooks.session_state` (D-07) for cleaner semantics
- HTML-comment markers for `settings.json` — JSON, not Markdown; use `_oto` key (D-13)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude Code's `Statusline` registration is the top-level `statusLine: { type: 'command', command: '...' }` shape | Pattern 2, Code Example 1 | If the docs page hide a different shape, statusline won't appear. Verified via GSD upstream `bin/install.js:6884-6887` [VERIFIED] — but the live Claude Code docs page didn't surface this in our fetch (page focused on hook events). LOW risk: GSD has shipped this shape to thousands of users. |
| A2 | The `_oto` JSON key in settings.json doesn't conflict with any future Claude Code reserved key | Pattern 2 | If Claude Code ever adopts `_oto`-prefix as a reserved namespace, our marker block could collide. Mitigation: underscore-prefixed top-level JSON keys are conventionally "internal/private" — vanishingly low collision risk |
| A3 | `oto-session-start` invoked as `bash <path>` (vs being directly executed via shebang + executable bit) — both modes work; we use `bash <path>` in the registered command, matching GSD's pattern at `bin/install.js:6789` | Pattern 2 | If Claude Code passes the hook to `sh` instead of `bash`, our use of `[[ ]]` and `${var//old/new}` would break. Mitigation: explicit `bash <path>` in the command [VERIFIED via GSD] |
| A4 | The `_oto.hooks` array uses `command_contains` substring match for entry identity (vs e.g. a uuid) | Pattern 2 | If a user's hand-authored entry contains `oto-session-start` substring (extremely unlikely), our uninstall would remove it. Mitigation: substring match against the *file basename* not arbitrary content; we own the prefix `oto-`. |

**If this table is empty:** N/A — four assumptions documented above.

## Open Questions (RESOLVED)

1. **Should the SessionStart hook use `bash <path>` or rely on shebang + executable bit?**
   - What we know: GSD upstream uses `bash <path>` in the registered command (`bin/install.js:6789`); shebang in source files is `#!/usr/bin/env bash`.
   - What's unclear: Claude Code may handle `command: "/abs/path/to/hook"` (no `bash` prefix) by execve directly, requiring executable bit; or it may pass to `/bin/sh`.
   - Recommendation: match GSD precedent — use `bash "<configDir>/hooks/oto-session-start"` in the `command` field. Belt-and-suspenders: ALSO chmod 0o755 in the install copy (Pitfall G).
   - **RESOLVED:** Adopted recommendation. Plan 05-04 Task 1 (`buildOtoEntries`) registers `command: "bash \"$CLAUDE/hooks/oto-session-start\""`; Plan 05-02 Task 2 chmod's bash hooks to 0o755 in the build pass.

2. **Does the build script need to handle the extensionless `oto-session-start` file specially?**
   - What we know: Current `scripts/build-hooks.js:38` filters by `/\.(js|cjs|sh)$/`. The extensionless `oto-session-start` would NOT match.
   - What's unclear: D-04 specifies "extensionless (mirrors Superpowers' shape)".
   - Recommendation: extend the regex to `/\.(js|cjs|sh)$|^oto-session-start$/` OR detect bash shebang. The shebang-detection is more portable for future bash hooks. Plan should pick one explicitly.
   - **RESOLVED:** Plan 05-02 Task 1 picks the explicit-name approach via `KEEP_NAME = new Set(['oto-session-start'])` plus the existing extension regex; chosen for explicitness over shebang-sniffing complexity.

3. **Does `oto/hooks/__fixtures__/` need `.gitignore` exclusion?**
   - What we know: D-09 says ship the fixture as a static file. `package.json` `files` allowlist includes `oto/`.
   - What's unclear: Whether `__fixtures__/` should be packed into the npm tarball (it'd add bytes for end-users who don't run tests).
   - Recommendation: For Phase 5, include fixtures in the package (tiny — one JSON file). Phase 10 can revisit when CI snapshot enforcement promotes fixtures to a more formal location.
   - **RESOLVED:** Fixture committed under `oto/hooks/__fixtures__/session-start-claude.json` and packed in the tarball (plan 05-05 Task 1; threat-model entry T-05-05-02 confirms intentional inclusion). Phase 10 may relocate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 22.0.0 | All `.js` hooks, build script, tests | ✓ | (per package.json engines) | — |
| Bash (`bash`, `set -euo pipefail`, `${var//x/y}` substitution) | `oto-session-start`, `oto-validate-commit.sh` | ✓ on macOS (`/bin/bash` 3.2+; `/usr/local/bin/bash` 5.x available) | (system-dependent) | — |
| `head` (POSIX, used in oto-session-start `head -20`) | `oto-session-start` (D-07 opt-in path) | ✓ | POSIX | — |
| Claude Code (target runtime) | Live verification (NOT required for tests) | (user-machine; not required for Phase 5 tests) | — | Tests run hooks directly via `spawnSync('bash', [...])`; do not require Claude Code |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

Phase 5 has zero external CLI dependencies beyond what's already required for the project (Node 22+, bash). Tests run as standalone `node:test` invocations — they spawn the hook, capture stdout, parse JSON, assert shape. No live Claude Code required.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 22+) |
| Config file | none — `node --test --test-concurrency=4 tests/*.test.cjs` (existing pattern from `package.json` `scripts.test`) |
| Quick run command | `node --test --test-concurrency=4 tests/05-*.test.cjs` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HK-01 | SessionStart emits exactly one identity block, correct shape per platform env var, no upstream-identity leakage | unit | `node --test tests/05-01-session-start-output.test.cjs` | ❌ Wave 0 |
| HK-02 | Statusline registered correctly in `_oto` block; round-trip preserves user content | unit (covered by mergeSettings test) | `node --test tests/05-04-merge-settings.test.cjs` | ❌ Wave 0 |
| HK-03 | Context-monitor registered on `PostToolUse` with matcher `Bash\|Edit\|Write\|MultiEdit\|Agent\|Task` and `timeout: 10` | unit (covered by mergeSettings test) | `node --test tests/05-04-merge-settings.test.cjs` | ❌ Wave 0 |
| HK-04 | Prompt-guard registered on `PreToolUse` with matcher `Write\|Edit` | unit (mergeSettings) | same | ❌ Wave 0 |
| HK-05 | Read-injection-scanner registered on `PostToolUse` with matcher `Read` | unit (mergeSettings) | same | ❌ Wave 0 |
| HK-06 | Validate-commit registered on `PreToolUse` with matcher `Bash` (drift from CONTEXT D-12; resolved per upstream + block-semantics — see note below) | unit (mergeSettings) | same | ❌ Wave 0 |
| HK-07 | Token `{{OTO_VERSION}}` substitutes to current version on install; round-trip-replaceable; build produces 6 files in dist/ | unit | `node --test tests/05-02-build-hooks.test.cjs` + `tests/05-03-token-substitution.test.cjs` | ❌ Wave 0 |

**Note on HK-06 matcher:** Upstream GSD registers `gsd-validate-commit.sh` on `PreToolUse` with matcher `Bash` [VERIFIED: gsd-install.js:6798-6807]. The hook body itself filters for `git commit` regex match [VERIFIED: gsd-validate-commit.sh:25]. The CONTEXT.md D-12 description says "PostToolUse with matchers Bash with git commit pattern" — this conflicts with upstream practice. The planner should resolve to **PreToolUse / matcher `Bash`** because:
1. The hook is designed to BLOCK non-conforming commits (`exit 2` returns `decision: block`); blocking only makes sense on PreToolUse, not PostToolUse (the commit has already happened).
2. Upstream GSD has shipped this pattern for many months [VERIFIED: gsd-install.js:6798-6807].
3. The hook body's git-commit regex (`if [[ "$CMD" =~ ^git[[:space:]]+commit ]]`) does the per-call filtering — the matcher just narrows to `Bash`.

**This is a meaningful drift between CONTEXT.md D-12 and upstream truth.** The planner MUST surface this to the user during planning OR resolve to `PreToolUse / Bash` and note the resolution. **Recommendation:** resolve to `PreToolUse / matcher: "Bash"` and document the divergence in the plan.

### Sampling Rate

- **Per task commit:** `node --test tests/05-*.test.cjs` (4 tests, sub-second total)
- **Per wave merge:** `npm test` (full suite — Phase 1-4 tests still pass)
- **Phase gate:** Full suite green before `/oto-verify-work`; SessionStart fixture hand-eyeballed and locked.

### Wave 0 Gaps

- [ ] `tests/05-01-session-start-output.test.cjs` — covers HK-01 (D-17 test 1)
- [ ] `tests/05-02-build-hooks.test.cjs` — covers HK-07 build leg (D-17 test 2)
- [ ] `tests/05-03-token-substitution.test.cjs` — covers HK-07 substitution leg (D-17 test 3)
- [ ] `tests/05-04-merge-settings.test.cjs` — covers HK-02..HK-06 registration + idempotency (D-17 test 4)
- [ ] `oto/hooks/__fixtures__/session-start-claude.json` — static snapshot baseline (D-09)
- [ ] `oto/hooks/README.md` — one-line note on the fixture (D-09)
- [ ] No new framework install needed; `node:test` is built-in.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | hooks run under user's local shell session; no auth surface |
| V3 Session Management | no | not applicable |
| V4 Access Control | no | local-only file system reads |
| V5 Input Validation | yes | hook stdin (Claude Code-supplied JSON) parsed defensively; session_id sanitized to reject path traversal (already done in upstream `gsd-context-monitor.js:52-54` and `gsd-statusline.js:232`); Conventional Commits regex in `oto-validate-commit.sh` |
| V6 Cryptography | no | sha256 used for file integrity in install-state, but no auth/signing in scope (Hook signing is OOS per CONTEXT Deferred) |

### Known Threat Patterns for Claude Code hook fleet

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection in file content read by Read tool (poisoned content survives context compression) | Tampering / Information Disclosure | `oto-read-injection-scanner.js` PostToolUse on `Read` (HK-05) — already rebranded; verifies on import |
| Prompt injection in content written to `.oto/` by Write/Edit tools | Tampering | `oto-prompt-guard.js` PreToolUse on `Write\|Edit` (HK-04) — already rebranded |
| Path traversal via `session_id` in temp-file paths (e.g. `claude-ctx-{session_id}.json`) | Tampering | Reject `session_id` matching `[/\\]|\.\.` — already in `gsd-context-monitor.js:52` and `gsd-statusline.js:232` (preserved in rebranded versions) |
| Stale-hook execution on upgrade (old hook with new version's stdin shape) | Tampering | `# oto-hook-version: {{OTO_VERSION}}` (HK-07) + D-11 stale detection forces overwrite on version mismatch |
| Identity-block leakage of upstream namespace (`superpowers:`, `gsd-`) into model context — would let a model "load" upstream identity as ground truth | Spoofing | D-05 hand-rebrand of literal strings + D-17 test 1 substring scan |
| Two SessionStart hooks racing (Pitfall 8) | Tampering / Information Disclosure | D-04 single entrypoint; `mergeSettings` registers exactly one entry; D-09 fixture verifies one identity block |
| `settings.json` silently discarded due to invalid hook entry shape | Denial of Service (loss of all hooks) | `mergeSettings` only writes well-formed entries; consider porting GSD's `validateHookEntries` (`bin/install.js:4793-4865`) |

## Sources

### Primary (HIGH confidence)
- `foundation-frameworks/superpowers-main/hooks/session-start` (lines 1-58) — identity-block emission, runtime-detection cascade, JSON-escape function, printf-over-heredoc workaround
- `foundation-frameworks/get-shit-done-main/hooks/gsd-session-state.sh` (lines 1-35) — project-state reminder logic + opt-in pattern (D-07 source)
- `foundation-frameworks/get-shit-done-main/hooks/gsd-statusline.js` (lines 1-401) — verified rebrand parity with `oto/hooks/oto-statusline.js`
- `foundation-frameworks/get-shit-done-main/hooks/gsd-context-monitor.js` (lines 1-192) — confirms PostToolUse event in hook body output (line 182)
- `foundation-frameworks/get-shit-done-main/hooks/gsd-prompt-guard.js` (lines 1-97) — PreToolUse, matcher Write|Edit
- `foundation-frameworks/get-shit-done-main/hooks/gsd-read-injection-scanner.js` (lines 1-152) — PostToolUse, matcher Read
- `foundation-frameworks/get-shit-done-main/hooks/gsd-validate-commit.sh` (lines 1-48) — PreToolUse with matcher Bash (NOT PostToolUse — see HK-06 note above)
- `foundation-frameworks/get-shit-done-main/scripts/build-hooks.js` (lines 1-95) — vm.Script validation pattern, executable-bit chmod for `.sh` files
- `foundation-frameworks/get-shit-done-main/bin/install.js`:
  - lines 497-515 — `buildHookCommand` (forward-slash path normalization, optional portable-hooks)
  - lines 543-589 — JSONC stripping for tolerant settings.json parse
  - lines 6562-6588 — hook command variables
  - lines 6600-6857 — full hook registration block (the canonical `mergeSettings` reference)
  - lines 4793-4865 — `validateHookEntries` (silent-discard prevention)
  - lines 6884-6887 — `statusLine` registration shape
- `bin/lib/runtime-claude.cjs` — current `mergeSettings` no-op identity (lines 43); `sourceDirs.hooks: 'oto/hooks/dist'` already correct (line 16)
- `bin/lib/copy-files.cjs` — `copyTree` insertion point for token-replace pass (D-03)
- `bin/lib/install-state.cjs` — schema with `validateState`, `readState`, `writeState`; current schema lacks `hooks.version` field
- `bin/lib/marker.cjs` — HTML-comment marker pattern (NOT applicable to settings.json; D-13 uses `_oto` key instead); `findUpstreamMarkers` already detects upstream identity strings (lines 42-50)
- `scripts/build-hooks.js` — current target uses top-level `hooks/` (D-01/D-02 retarget)
- `oto/hooks/oto-session-start` — current state: only the rebranded `gsd-session-state.sh` body (NOT the consolidated form per D-04); REWRITE required
- `oto/hooks/oto-{statusline,context-monitor,prompt-guard,read-injection-scanner}.js` and `oto-validate-commit.sh` — verified line-1/line-2 token tag present; bodies appear correctly rebranded (full diff vs upstream pending plan-time verification)
- `decisions/ADR-04-sessionstart.md` — single SessionStart entrypoint decision
- `decisions/ADR-02-env-var-prefix.md` — `{{OTO_VERSION}}` token substitution lockdown
- `decisions/file-inventory.json` (lines 4583-4683, 9615-9650) — keep/drop verdicts; consolidated source list for `oto-session-start`
- `.planning/research/PITFALLS.md` — Pitfall 8 (hook ordering / double injection), Pitfall 15 (literal-string identity leakage), Pitfall 20 (token substitution)
- `.planning/REQUIREMENTS.md` — HK-01..HK-07 plus traceability
- `.planning/config.json` — `nyquist_validation: true` (Validation Architecture section required); `hooks.context_warnings: true` (orthogonal to D-12 registration)

### Secondary (MEDIUM confidence)
- [Claude Code Hooks reference](https://code.claude.com/docs/en/hooks) — confirms exact event names (SessionStart, PreToolUse, PostToolUse, Stop, UserPromptSubmit), JSON shape for SessionStart hookSpecificOutput, matcher syntax (exact-string vs regex)
- [Claude Code Hooks: Complete Guide to All 12 Lifecycle Events](https://claudefa.st/blog/tools/hooks/hooks-guide) — Stop fires once per turn (when Claude finishes responding); PostToolUse fires on every tool call inside the agentic loop
- [Pixelmojo: Claude Code Hooks](https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns) — Stop event semantics

### Tertiary (LOW confidence)
- None — all critical claims verified against upstream source or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — only Node built-ins; pattern verified across both upstreams.
- Architecture: HIGH — `mergeSettings` shape directly modeled on GSD upstream (`bin/install.js:6600-6857`); `_oto` JSON-key marker is the only minor design decision (low risk).
- Pitfalls: HIGH — every pitfall references a verified upstream code line or a verified bug ID from upstream CHANGELOGs.
- Validation Architecture: HIGH — D-17 fully specifies the four tests; mapping to HK-01..07 is mechanical.
- Security: MEDIUM — ASVS coverage is honest about scope (no auth/crypto surface); STRIDE-keyed threat patterns derive from real upstream-shipped patches.

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (30 days; Claude Code hooks API is stable, GSD/Superpowers hook registration shape has been stable across many minor releases per CHANGELOG inspection in PITFALLS.md)
