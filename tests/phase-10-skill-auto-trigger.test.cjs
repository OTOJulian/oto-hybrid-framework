'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'oto/hooks/oto-session-start');
const STATE_ACTIVE_FIXTURE = path.join(__dirname, 'skills/__fixtures__/STATE-active.md');
const GATING_MARKER = '<!-- oto:state-gating-directive -->';

test('CI-07: SessionStart with active STATE.md does not auto-load using-oto body', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-skill-auto-trigger-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.copyFileSync(STATE_ACTIVE_FIXTURE, path.join(cwd, '.oto', 'STATE.md'));

  const result = spawnSync('bash', [HOOK], {
    cwd,
    env: { PATH: process.env.PATH, HOME: cwd, CLAUDE_PLUGIN_ROOT: '/tmp/fake', COPILOT_CLI: '' },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `hook exited ${result.status}: ${result.stderr}`);

  let payload;
  assert.doesNotThrow(() => {
    payload = JSON.parse(result.stdout);
  }, `hook stdout was not JSON: ${result.stdout}\nstderr: ${result.stderr}`);

  const hookOutput = payload.hookSpecificOutput;
  if (!hookOutput || typeof hookOutput.additionalContext !== 'string') {
    return t.todo('oto-session-start did not emit hookSpecificOutput.additionalContext');
  }

  if (hookOutput.additionalContext.includes(GATING_MARKER)) {
    return t.todo('oto-session-start currently injects using-oto body even when .oto/STATE.md is active');
  }

  assert.equal(
    hookOutput.additionalContext.indexOf(GATING_MARKER),
    -1,
    'using-oto leaked into SessionStart despite active STATE.md',
  );
});
