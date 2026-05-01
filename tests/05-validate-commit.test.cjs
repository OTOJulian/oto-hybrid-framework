'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK = path.join(REPO_ROOT, 'oto', 'hooks', 'oto-validate-commit.sh');

function tmpProject(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-commit-hook-'));
  fs.mkdirSync(path.join(cwd, '.oto'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.oto', 'config.json'), '{"hooks":{"session_state":true}}');
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  return cwd;
}

function runHook(t, command) {
  return spawnSync('bash', [HOOK], {
    cwd: tmpProject(t),
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
  });
}

test('phase-05 validate-commit: accepts quoted -m and --message Conventional Commit forms', (t) => {
  assert.equal(runHook(t, 'git commit -m "fix: quoted message"').status, 0);
  assert.equal(runHook(t, "git commit --message 'feat(cli): quoted message'").status, 0);
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
  const result = runHook(t, 'git commit --amend');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /must be provided with -m\/--message/);
});

test('phase-05 validate-commit: ignores non-commit commands', (t) => {
  assert.equal(runHook(t, 'git status').status, 0);
});
