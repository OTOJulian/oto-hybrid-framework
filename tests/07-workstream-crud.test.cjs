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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-07-crud-'));
  fs.mkdirSync(path.join(tmp, '.oto'), { recursive: true });
  fs.cpSync(FIXTURE, path.join(tmp, '.oto'), { recursive: true });
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}

function runWS(tmp, args, env = {}) {
  const res = spawnSync(process.execPath, [OTO_TOOLS, 'workstream', ...args], {
    cwd: tmp,
    encoding: 'utf8',
    env: neutralEnv(env),
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function runWSJson(tmp, args, env = {}) {
  const res = runWS(tmp, args, env);
  assert.equal(res.status, 0, `workstream ${args.join(' ')} failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

test('phase 07 - workstream CRUD behavior', { concurrency: false }, async (t) => {
  await t.test('workstream create demo migrates flat-mode files', (t) => {
    const tmp = setupTmpProject(t);
    const out = runWSJson(tmp, ['create', 'demo', '--migrate-name', 'demo']);
    assert.equal(out.created, true);
    assert.equal(out.workstream, 'demo');
    assert.deepEqual(out.migration.files_moved.sort(), ['REQUIREMENTS.md', 'ROADMAP.md', 'STATE.md', 'phases'].sort());
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/demo/STATE.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/demo/ROADMAP.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/demo/REQUIREMENTS.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/demo/phases/01-stub/01-CONTEXT.md')));
    assert.equal(fs.existsSync(path.join(tmp, '.oto/STATE.md')), false);
    assert.equal(fs.existsSync(path.join(tmp, '.oto/ROADMAP.md')), false);
    assert.ok(fs.existsSync(path.join(tmp, '.oto/PROJECT.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oto/config.json')));
  });

  await t.test('second workstream create does not re-migrate or clobber first workstream', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['create', 'demo', '--migrate-name', 'demo']);
    const before = fs.readFileSync(path.join(tmp, '.oto/workstreams/demo/STATE.md'), 'utf8');
    const out = runWSJson(tmp, ['create', 'alt']);
    assert.equal(out.created, true);
    assert.equal(out.migration, null);
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/alt/STATE.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.oto/workstreams/demo/STATE.md')));
    assert.equal(fs.readFileSync(path.join(tmp, '.oto/workstreams/demo/STATE.md'), 'utf8'), before);
  });

  await t.test('two workstreams keep divergent state', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['create', 'demo', '--migrate-name', 'demo']);
    runWSJson(tmp, ['create', 'alt']);
    fs.writeFileSync(path.join(tmp, '.oto/workstreams/demo/STATE.md'), [
      '# State',
      '',
      '**Status:** demo-state',
      '**Current Phase:** demo-phase',
      '',
    ].join('\n'));
    fs.writeFileSync(path.join(tmp, '.oto/workstreams/alt/STATE.md'), [
      '# State',
      '',
      '**Status:** alt-state',
      '**Current Phase:** alt-phase',
      '',
    ].join('\n'));
    assert.equal(runWSJson(tmp, ['status', 'demo']).status, 'demo-state');
    assert.equal(runWSJson(tmp, ['status', 'alt']).status, 'alt-state');
  });

  await t.test('workstream list returns expected JSON shape', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['create', 'demo', '--migrate-name', 'demo']);
    runWSJson(tmp, ['create', 'alt']);
    const out = runWSJson(tmp, ['list']);
    assert.equal(out.mode, 'workstream');
    assert.equal(out.count, 2);
    assert.ok(Array.isArray(out.workstreams));
    assert.deepEqual(out.workstreams.map((ws) => ws.name).sort(), ['alt', 'demo']);
  });

  await t.test('workstream get and status return active workstream details', (t) => {
    const tmp = setupTmpProject(t);
    runWSJson(tmp, ['create', 'demo', '--migrate-name', 'demo']);
    runWSJson(tmp, ['create', 'alt']);
    runWSJson(tmp, ['set', 'demo']);
    assert.equal(runWSJson(tmp, ['get']).active, 'demo');
    const status = runWSJson(tmp, ['status', 'demo']);
    assert.equal(status.found, true);
    assert.equal(status.workstream, 'demo');
    assert.equal(status.files.state, true);
  });
});
