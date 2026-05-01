'use strict';
// Phase 5 Wave 0 scaffold - implemented in Wave 4 (plan 05-05).
// Covers: HK-01 snapshot lock.
// Will spawn `oto/hooks/oto-session-start` with stubbed `CLAUDE_PLUGIN_ROOT=/tmp/fake-claude` and no `.oto/config.json` (opt-in OFF, default), capture stdout, JSON-parse, compare deep-equal against `oto/hooks/__fixtures__/session-start-claude.json`; explicit substring scan for the 5 banned upstream identity strings (`superpowers`, `Superpowers`, `gsd-`, `GSD`, `Get Shit Done`) inside the captured `hookSpecificOutput.additionalContext` per Pitfall 15. Phase 10 promotes this from a static-file compare to a CI snapshot check.
const test = require('node:test');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-05 session-start-fixture: stdout deep-equals __fixtures__/session-start-claude.json with no upstream-identity leakage', (t) => {
  t.todo('Implemented in Wave 4 (plan 05-05) once oto/hooks/__fixtures__/session-start-claude.json exists');
});
