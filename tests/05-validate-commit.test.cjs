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
  assert.match(missingState.stderr, /active phase/);

  const inactivePhase = runHook(t, 'git commit -m "fix: valid message"', {
    stateText: 'Phase: Not started (defining requirements)\nPlan: -\n',
  });
  assert.equal(inactivePhase.status, 2);
  assert.match(inactivePhase.stdout, /active phase/);
  assert.match(inactivePhase.stderr, /active phase/);
});

test('phase-05 validate-commit: blocks valid commits without active plan state', (t) => {
  const result = runHook(t, 'git commit -m "fix: valid message"', {
    stateText: 'Phase: 05 (hooks-port-consolidation) - EXECUTING\nPlan: -\n',
  });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /active plan/);
  assert.match(result.stderr, /active plan/);
});

test('phase-05 validate-commit: accepts valid commits with active phase and active plan', (t) => {
  assert.equal(runHook(t, 'git commit -m "fix: valid message"').status, 0);
  assert.equal(runHook(t, 'echo ready && git commit -m "fix: valid; quoted message"').status, 0);
});

test('phase-05 validate-commit: validates git options and common unquoted message forms', (t) => {
  let result = runHook(t, 'git -C repo commit -m "bad"');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);
  assert.match(result.stderr, /Conventional Commits/);

  result = runHook(t, 'git commit -m bad');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);
  assert.match(result.stderr, /Conventional Commits/);

  result = runHook(t, 'git commit --message=bad');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Conventional Commits/);
  assert.match(result.stderr, /Conventional Commits/);

  for (const command of [
    'git -p commit -m bad',
    'git -P commit -m bad',
    'git --no-replace-objects commit -m bad',
    'git --config-env=user.name=USER commit -m bad',
  ]) {
    result = runHook(t, command);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /Conventional Commits/);
    assert.match(result.stderr, /Conventional Commits/);
  }
});

test('phase-05 validate-commit: blocks commit commands without a parseable message flag', (t) => {
  let result = runHook(t, 'git commit --amend');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must be provided with -m\/--message/);
  assert.match(result.stderr, /must be provided with -m\/--message/);

  result = runHook(t, 'echo -m "fix: unrelated"; git commit --amend');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must be provided with -m\/--message/);
  assert.match(result.stderr, /must be provided with -m\/--message/);
});

test('phase-05 validate-commit: blocks commit subjects longer than 72 characters', (t) => {
  const longSubject = `fix: ${'a'.repeat(70)}`;
  assert.ok(longSubject.length > 72, 'fixture subject must exceed 72 chars to exercise this site');
  const result = runHook(t, `git commit -m "${longSubject}"`);
  assert.equal(result.status, 2);
  assert.match(result.stdout, /72 characters or less/);
  assert.match(result.stderr, /72 characters or less/);
});

test('phase-05 validate-commit: reports generic parse-failure reason on stderr when the embedded parser exits abnormally', (t) => {
  // Simulate an unparseable git-commit command by making the zero-argument `node <<'NODE'`
  // parser invocation (the only node call in the hook with no CLI args) fail abnormally, while
  // leaving the other `node -e ...` calls (opt-in check, tool_input extraction) untouched. This
  // exercises the generic `COMMIT_STATUS -ne 0` fallback site, which is otherwise unreachable
  // through crafted command text because the embedded tokenizer never throws.
  const fakeBinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-fakenode-'));
  t.after(() => fs.rmSync(fakeBinDir, { recursive: true, force: true }));
  const wrapperPath = path.join(fakeBinDir, 'node');
  fs.writeFileSync(
    wrapperPath,
    `#!/bin/bash\nif [ "$#" -eq 0 ]; then\n  exit 1\nfi\nexec "${process.execPath}" "$@"\n`,
  );
  fs.chmodSync(wrapperPath, 0o755);

  const cwd = tmpProject(t);
  const result = spawnSync('bash', [HOOK], {
    cwd,
    input: JSON.stringify({ tool_input: { command: 'git commit -m "fix: valid message"' } }),
    encoding: 'utf8',
    env: { PATH: `${fakeBinDir}:${process.env.PATH}`, HOME: process.env.HOME },
  });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Unable to parse git commit command for validation\./);
  assert.match(result.stderr, /Unable to parse git commit command for validation\./);
});

test('phase-05 validate-commit: ignores non-commit commands', (t) => {
  assert.equal(runHook(t, 'git status').status, 0);
  assert.equal(runHook(t, 'git -C commit status').status, 0);
  assert.equal(runHook(t, 'git -c user.name=commit status').status, 0);
});
