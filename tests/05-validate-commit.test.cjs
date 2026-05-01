'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'oto', 'hooks', 'oto-validate-commit.sh');
const ACTIVE_STATE = 'Phase: 05 (hooks-port-consolidation) - EXECUTING\nPlan: 6 of 6\n';

function tmpProject(t, stateText = ACTIVE_STATE) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-commit-hook-'));
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.oto', 'config.json'), '{"hooks":{"session_state":true}}');
  if (stateText !== null) {
    fs.writeFileSync(path.join(cwd, '.oto', 'STATE.md'), stateText);
  }
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  return cwd;
}

function runHook(t, command, options = {}) {
  const { stateText = ACTIVE_STATE } = options;
  return spawnSync('bash', [HOOK], {
    cwd: tmpProject(t, stateText),
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
  });
}

test('phase-05 validate-commit: accepts quoted -m and --message Conventional Commit forms', (t) => {
  assert.equal(runHook(t, 'git commit -m "fix: quoted message"').status, 0);
  assert.equal(runHook(t, "git commit --message 'feat(cli): quoted message'").status, 0);
});

test('phase-05 validate-commit: blocks valid commits without active phase state', (t) => {
  const missingState = runHook(t, 'git commit -m "fix: valid message"', { stateText: null });
  assert.equal(missingState.status, 2);
  assert.match(missingState.stdout, /active phase/);

  const inactivePhase = runHook(t, 'git commit -m "fix: valid message"', {
    stateText: 'Phase: Not started (defining requirements)\nPlan: -\n',
  });
  assert.equal(inactivePhase.status, 2);
  assert.match(inactivePhase.stdout, /active phase/);
});

test('phase-05 validate-commit: blocks valid commits without active plan state', (t) => {
  const result = runHook(t, 'git commit -m "fix: valid message"', {
    stateText: 'Phase: 05 (hooks-port-consolidation) - EXECUTING\nPlan: -\n',
  });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /active plan/);
});

test('phase-05 validate-commit: accepts valid commits with active phase and active plan', (t) => {
  assert.equal(runHook(t, 'git commit -m "fix: valid message"').status, 0);
  assert.equal(runHook(t, 'echo ready && git commit -m "fix: valid; quoted message"').status, 0);
});

test('phase-05 validate-commit: validates git options and common unquoted message forms', (t) => {
  let result = runHook(t, 'git -C repo commit -m "bad"');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);

  result = runHook(t, 'git commit -m bad');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);

  result = runHook(t, 'git commit --message=bad');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);
});

test('phase-05 validate-commit: blocks commit commands without a parseable message flag', (t) => {
  let result = runHook(t, 'git commit --amend');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must be provided with -m\/--message/);

  result = runHook(t, 'echo -m "fix: unrelated"; git commit --amend');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must be provided with -m\/--message/);
});

test('phase-05 validate-commit: ignores non-commit commands', (t) => {
  assert.equal(runHook(t, 'git status').status, 0);
  assert.equal(runHook(t, 'git -C commit status').status, 0);
  assert.equal(runHook(t, 'git -c user.name=commit status').status, 0);
});
