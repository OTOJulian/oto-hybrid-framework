'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(REPO_ROOT, 'tests/fixtures/phase-07/flat-mode');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const SESSION_ENV_KEYS = [
  'OTO_WORKSTREAM',
  'OTO_SESSION_KEY',
  'CODEX_THREAD_ID',
  'CLAUDE_SESSION_ID',
  'CLAUDE_CODE_SSE_PORT',
  'OPENCODE_SESSION_ID',
  'GEMINI_SESSION_ID',
  'CURSOR_SESSION_ID',
  'WINDSURF_SESSION_ID',
  'TERM_SESSION_ID',
  'WT_SESSION',
  'TMUX_PANE',
  'ZELLIJ_SESSION_NAME',
  'TTY',
  'SSH_TTY',
];

function neutralEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const key of SESSION_ENV_KEYS) {
    if (!(key in extra)) env[key] = '';
  }
  return env;
}

function setupTmpProject(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-07-pointer-'));
  fs.mkdirSync(path.join(tmp, '.oto'), { recursive: true });
  fs.cpSync(FIXTURE, path.join(tmp, '.oto'), { recursive: true });
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  runWSJson(tmp, ['create', 'one', '--migrate-name', 'one']);
  runWSJson(tmp, ['create', 'two']);
  return tmp;
}

function runWS(tmp, args, env = {}) {
  const res = spawnSync(process.execPath, [OTO_TOOLS, ...args], {
    cwd: tmp,
    encoding: 'utf8',
    env: neutralEnv(env),
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function runWSJson(tmp, args, env = {}) {
  const res = runWS(tmp, ['workstream', ...args], env);
  assert.equal(res.status, 0, `workstream ${args.join(' ')} failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

function runGet(tmp, prefixArgs = [], env = {}) {
  const res = runWS(tmp, [...prefixArgs, 'workstream', 'get'], env);
  assert.equal(res.status, 0, `workstream get failed: stderr=${res.stderr}`);
  return JSON.parse(res.stdout);
}

test('phase 07 - session pointer resolution priority', { concurrency: false }, async (t) => {
  await t.test('--ws flag wins over OTO_WORKSTREAM env', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['set', 'one']);
    const out = runGet(tmp, ['--ws', 'two'], { OTO_WORKSTREAM: 'one' });
    assert.equal(out.active, 'two');
  });

  await t.test('OTO_WORKSTREAM env wins over session-keyed pointer', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['set', 'one'], { OTO_SESSION_KEY: 'session-env-test' });
    const out = runGet(tmp, [], { OTO_SESSION_KEY: 'session-env-test', OTO_WORKSTREAM: 'two' });
    assert.equal(out.active, 'two');
  });

  await t.test('session-keyed pointer wins over legacy active-workstream file', (t) => {
    const tmp = setupTmpProject(t);
    fs.writeFileSync(path.join(tmp, '.oto/active-workstream'), 'one\n');
    runWSJson(tmp, ['set', 'two'], { OTO_SESSION_KEY: 'session-priority-test' });
    const out = runGet(tmp, [], { OTO_SESSION_KEY: 'session-priority-test' });
    assert.equal(out.active, 'two');
  });

  await t.test('two distinct session keys hold distinct active workstreams', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['set', 'one'], { OTO_SESSION_KEY: 'session-A' });
    runWSJson(tmp, ['set', 'two'], { OTO_SESSION_KEY: 'session-B' });
    assert.equal(runGet(tmp, [], { OTO_SESSION_KEY: 'session-A' }).active, 'one');
    assert.equal(runGet(tmp, [], { OTO_SESSION_KEY: 'session-B' }).active, 'two');
  });
});
