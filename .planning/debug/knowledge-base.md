# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## codex-hooks-toml-schema — oto Codex installer emitted obsolete flat `[[hooks]]` array-of-tables that Codex 0.125+ rejects
- **Date:** 2026-05-05
- **Error patterns:** Error loading config.toml, invalid type: sequence, expected struct HooksToml, hooks, codex, config.toml, [[hooks]], TOML schema, codex --version fails, HooksToml
- **Root cause:** `bin/lib/codex-toml.cjs:emitHookEntry` hardcoded the obsolete flat `[[hooks]]` array-of-tables format with `type`/`matcher`/`command`/`timeout` as siblings. Codex 0.125.0+ moved to a nested schema: `[[hooks.<EventName>]]` matcher groups, each containing `[[hooks.<EventName>.hooks]]` handler arrays where `type = "command"`. Codex 0.128.0 rejects the flat form at config-load time, breaking `codex --version` after `oto install --codex`.
- **Fix:** Rewrote `mergeHooksBlock` to group hook entries by event name and emit one outer `[[hooks.<EventName>]]` block per (event, matcher) tuple, each containing one inner `[[hooks.<EventName>.hooks]]` handler with `type = "command"`, `command`, `timeout`. SessionStart blocks omit the `matcher` line. Updated `hasMixedLegacyHooks` guard to detect any pre-existing `[[hooks` content outside the OTO marker block. Rewrote 6 phase-08 tests + 2 phase-03 tests for the new schema and added an explicit anti-regression assertion that the obsolete flat shape is absent.
- **Files changed:** bin/lib/codex-toml.cjs, tests/phase-08-codex-toml.test.cjs, tests/phase-03-runtime-codex.test.cjs, tests/phase-03-install-codex.integration.test.cjs
---

