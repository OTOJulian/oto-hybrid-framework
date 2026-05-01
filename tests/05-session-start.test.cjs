'use strict';
// Phase 5 Wave 0 scaffold - implemented in Wave 2 (plan 05-03).
// Covers: HK-01 SessionStart output.
// Will spawn `oto/hooks/oto-session-start` via `child_process.spawnSync('bash', [hookPath], { env: { ...process.env, CLAUDE_PLUGIN_ROOT: '/tmp/fake', COPILOT_CLI: '' } })`, parse stdout as JSON, assert: (1) exactly one `<EXTREMELY_IMPORTANT>` block via `(ctx.match(/<EXTREMELY_IMPORTANT>/g) || []).length === 1` (Pitfalls 8 + C); (2) zero matches for `superpowers`, `Superpowers`, `gsd-`, `\bGSD\b`, `Get Shit Done` in the additionalContext (Pitfall 15 - D-05 hand-rebrand verification); (3) string `You are using oto.` and `'oto:using-oto'` both present; (4) top-level shape `{ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: ... } }` (D-08 Claude branch).
const test = require('node:test');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-05 session-start: emits exactly one rebranded identity block on Claude runtime', (t) => {
  t.todo('Implemented in Wave 2 (plan 05-03) once oto-session-start is rewritten per D-04..D-09');
});
