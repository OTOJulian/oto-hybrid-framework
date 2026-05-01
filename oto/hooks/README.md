# oto hooks

Hook source files for the Phase 5 oto fleet. The build pipeline (`scripts/build-hooks.js`) reads from this directory and writes validated copies to `dist/`. The install pipeline (`bin/lib/install.cjs`) substitutes `{{OTO_VERSION}}` to the package's real version at install time (D-03).

## `__fixtures__/session-start-claude.json`

Snapshot of the SessionStart hook's stdout on the Claude Code runtime branch (D-08), captured against the SOURCE hook (literal `{{OTO_VERSION}}` token, no installed `oto:using-oto` skill — D-06 placeholder fallback active). This file is the Phase 5 regression baseline per ADR-04 Consequences and D-09. `tests/05-session-start-fixture.test.cjs` re-spawns the hook on every test run and deep-equals against this file; any drift fails the test.

Phase 10 (CI-08) promotes this to a CI snapshot check; until then, the test runs locally as part of `npm test`.

## Hooks in this directory

- `oto-session-start` — SessionStart, single entrypoint (D-04 / HK-01)
- `oto-statusline.js` — statusLine renderer (HK-02)
- `oto-context-monitor.js` — PostToolUse context warnings (HK-03)
- `oto-prompt-guard.js` — PreToolUse prompt-injection guard (HK-04)
- `oto-read-injection-scanner.js` — PostToolUse read-injection scanner (HK-05)
- `oto-validate-commit.sh` — PreToolUse Conventional Commits enforcement (HK-06)
