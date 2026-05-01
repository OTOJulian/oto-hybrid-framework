'use strict';
// Phase 5 — implemented in Wave 4 (plan 05-05)
// Covers: HK-01 snapshot lock per D-09 / ADR-04 Consequences.
// Phase 10 promotes this to a CI snapshot check (CI-08); until then, runs locally.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'oto', 'hooks', 'oto-session-start');
const FIXTURE = path.join(REPO_ROOT, 'oto', 'hooks', '__fixtures__', 'session-start-claude.json');

test('phase-05 session-start-fixture: stdout deep-equals locked baseline; no upstream-identity leakage', () => {
  // Re-spawn with the exact env+cwd setup used at fixture capture.
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-ssfx-'));
  const r = spawnSync('bash', [HOOK], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_PLUGIN_ROOT: '/tmp/fake-claude', COPILOT_CLI: '' },
    cwd,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `hook exited ${r.status}: ${r.stderr}`);
  const captured = JSON.parse(r.stdout);
  const baseline = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(captured, baseline, 'D-09: hook output drifted from locked Phase 5 baseline');

  // Defense in depth: even if both files drift in lockstep, the substring scan catches identity leakage.
  const ctx = captured.hookSpecificOutput.additionalContext;
  for (const banned of ['superpowers', 'Superpowers', 'gsd-', 'Get Shit Done', 'using-superpowers', 'You have superpowers']) {
    assert.equal(ctx.indexOf(banned), -1, `Pitfall 15: upstream identity leaked: ${banned}`);
  }
});
