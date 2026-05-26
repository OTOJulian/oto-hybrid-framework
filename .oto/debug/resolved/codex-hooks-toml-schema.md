---
status: resolved
trigger: "codex-hooks-toml-schema: oto's Codex installer emits obsolete [[hooks]] flat array-of-tables block; Codex 0.128.0 rejects with 'invalid type: sequence, expected struct HooksToml in hooks'"
created: 2026-05-04T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Focus

hypothesis: confirmed — flat `[[hooks]]` emitter rewritten to nested `[[hooks.<Event>]]` + `[[hooks.<Event>.hooks]]` shape
test: real-environment install (`oto install --codex` against `~/.codex/`) + `codex --version`
expecting: codex 0.128.0 loads config without error
next_action: resolved — archived

## Symptoms

expected: After `oto install --codex`, running `codex --version` succeeds; OTO HOOKS block in `~/.codex/config.toml` validates against Codex 0.128.0 schema.
actual: `codex` fails with `Error loading config.toml: invalid type: sequence, expected struct HooksToml in 'hooks'`. Installer wrote `[[hooks]]` blocks (codex-toml.cjs:62).
errors: Error loading config.toml: invalid type: sequence, expected struct HooksToml in `hooks`
reproduction: 1) Codex >=0.125.0 installed (user has 0.128.0). 2) `oto install --codex`. 3) `codex --version` fails. 4) `oto uninstall --codex` restores Codex.
started: oto v0.1.0 (today). Inherited from upstream GSD (https://github.com/gsd-build/get-shit-done/issues/2773).

## Eliminated

- hypothesis: oto's installer goes through `oto/bin/install.js` (which contains `migrateCodexHooksMapFormat` that migrates [hooks.X] → [[hooks]] — wrong direction)
  evidence: package.json `bin.oto` points to `bin/install.js` (top-level, 118 lines). `bin/install.js` requires `./lib/runtime-codex.cjs` → `./lib/codex-toml.cjs`. The 7755-line `oto/bin/install.js` is upstream GSD reference content, not in the executed code path. No `require('oto/bin/install.js')` anywhere in `bin/`.
  timestamp: 2026-05-04

## Evidence

- timestamp: 2026-05-04
  checked: bin/lib/codex-toml.cjs:61-68 (emitHookEntry)
  found: emits `[[hooks]]` flat header with `type`, `matcher`, `command`, `timeout` as siblings
  implication: this is the obsolete schema. Codex 0.128.0 expects nested `[[hooks.<EventName>]]` matcher groups + `[[hooks.<EventName>.hooks]]` handler arrays.

- timestamp: 2026-05-04
  checked: bin/lib/runtime-codex.cjs:19-36 (buildHookEntries)
  found: emits 5 entries: SessionStart (no matcher), 2× PreToolUse with matchers (Write|Edit, Bash), 2× PostToolUse with matchers (Read, Bash|Edit|Write|MultiEdit|Agent|Task). `type` is the EVENT NAME (used as table key in new schema).
  implication: SessionStart entries have no matcher → must be emitted in `[[hooks.SessionStart]]` group with no `matcher` field; other groups need `matcher` field.

- timestamp: 2026-05-04
  checked: tests/phase-08-codex-toml.test.cjs
  found: 6 tests asserting old shape: regex `/\[\[hooks\]\]/`, `^type = "PreToolUse"$`, `^matcher = "Bash"$`. The "mixed legacy guard" test uses `[hooks.shell]` (the much older map format) coexisting with `[[hooks]]` — this guard is now meaningless since BOTH are wrong.
  implication: All 6 tests need rewrites. Mixed-format guard concept survives but its definition shifts — there is no longer a "current correct" `[[hooks]]` format. The guard should detect ANY pre-existing user `[[hooks*]]` content and refuse to merge if it might collide.

- timestamp: 2026-05-04
  checked: target Codex schema (per https://developers.openai.com/codex/hooks)
  found: nested groups keyed by event:
    [[hooks.PreToolUse]]
    matcher = "^Bash$"
    [[hooks.PreToolUse.hooks]]
    type = "command"
    command = "..."
    timeout = 30
  implication: Within an event, multiple matchers each get their own outer `[[hooks.<Event>]]` block, and each handler under that matcher is `[[hooks.<Event>.hooks]]`. SessionStart skips `matcher`. The `type` field at handler level becomes `"command"` (Codex hook handler type), not the event name.

- timestamp: 2026-05-04
  checked: oto/bin/install.js:2858+ (migrateCodexHooksMapFormat) and 6461+
  found: standalone in upstream-archived 7755-line installer that is NOT part of the active code path. Not loaded by any code in `bin/`.
  implication: No need to reverse / disable migration. Just rewrite `codex-toml.cjs` emitter.

## Resolution

root_cause: `bin/lib/codex-toml.cjs:emitHookEntry` hardcodes the obsolete `[[hooks]]` flat array-of-tables format. Codex 0.125.0+ moved to nested `[[hooks.<EventName>]]` matcher groups containing `[[hooks.<EventName>.hooks]]` handler arrays. The flat form is now rejected at config-load time.
fix: Rewrite `mergeHooksBlock` to group hook entries by event name, then emit one outer `[[hooks.<EventName>]]` block per (event, matcher) tuple, each containing one inner `[[hooks.<EventName>.hooks]]` handler with `type = "command"`, `command`, `timeout`. SessionStart blocks omit the `matcher` line. Update mixed-format guard to detect ANY pre-existing `[[hooks` (with or without dotted suffix) outside the OTO marker block. Rewrite all 6 tests in tests/phase-08-codex-toml.test.cjs.
verification:
  - All 7 tests in tests/phase-08-codex-toml.test.cjs pass.
  - Full `npm test` suite: 419 pass, 0 fail, 1 skipped (was 417 pass / 2 fail before fix; the 2 failing tests in phase-03-runtime-codex.test.cjs and phase-03-install-codex.integration.test.cjs were updated to assert the new nested-table shape).
  - Emitted TOML round-trips through Python `tomllib`: hooks keys = [SessionStart, PreToolUse, PostToolUse]; SessionStart has no `matcher`; PreToolUse matchers = [Write|Edit, Bash]; PostToolUse matchers = [Read, Bash|Edit|Write|MultiEdit|Agent|Task]; each handler has type=command + command + (timeout for non-SessionStart).
  - End-to-end: `oto install --codex --config-dir <tmp>` succeeded; `CODEX_HOME=<tmp> codex --version` printed `codex-cli 0.128.0` and exited 0. Previously this failed with `Error loading config.toml: invalid type: sequence, expected struct HooksToml in 'hooks'`.
  - Real-environment (2026-05-05): `node bin/install.js install --codex` against `~/.codex/` exit 0; `codex --version` printed `codex-cli 0.128.0`; OTO HOOKS marker block in `~/.codex/config.toml` contains correct `[[hooks.SessionStart]]` / `[[hooks.PreToolUse]]` / `[[hooks.PostToolUse]]` nested-table shape with `[[hooks.<Event>.hooks]]` handler arrays; SessionStart correctly omits `matcher`; timeouts preserved. User confirmed fixed.
files_changed:
  - bin/lib/codex-toml.cjs (rewrote `emitHookEntry` to nested-table shape; updated `hasMixedLegacyHooks` to scope detection to content outside the OTO block)
  - tests/phase-08-codex-toml.test.cjs (rewrote all 6 assertions for new schema; added explicit anti-regression assertion that the obsolete flat shape is absent)
  - tests/phase-03-runtime-codex.test.cjs (INS-02: updated `mergeSettings` shape assertions)
  - tests/phase-03-install-codex.integration.test.cjs (INS-05: updated `mergeSettings` shape assertions)
