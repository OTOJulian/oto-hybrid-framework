'use strict';

// End-to-end contract test for the /oto-settings-integrations surface
// (phase 14 gap 4). Executes the workflow's entry sequence against the real
// built CLI and statically pins the workflow/wrapper secure-storage contract,
// including the bash-3.2/set-u-safe guarded WS_ARGS expansion.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SDK_BIN = path.join(REPO_ROOT, 'bin', 'oto-sdk.js');
const WORKFLOW_PATH = path.join(REPO_ROOT, 'oto/workflows/settings-integrations.md');
const WRAPPER_PATH = path.join(REPO_ROOT, 'oto/commands/oto/settings-integrations.md');

function makeFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-settings-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-settings-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return { project, home };
}

function cleanEnv(home) {
  return {
    ...process.env,
    HOME: home,
    EXA_API_KEY: '',
    BRAVE_API_KEY: '',
    FIRECRAWL_API_KEY: '',
  };
}

function run(fixture, args) {
  return spawnSync(process.execPath, [SDK_BIN, 'query', ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

test('entry: config-new-project creates a fresh config with boolean integration flags', (t) => {
  const fixture = makeFixture(t);

  const result = run(fixture, ['config-new-project']);

  assert.equal(result.status, 0, result.stderr);
  const configPath = path.join(fixture.project, '.oto/config.json');
  assert.ok(fs.existsSync(configPath), '.oto/config.json must be created');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const key of ['exa_search', 'brave_search', 'firecrawl']) {
    assert.equal(
      typeof config[key],
      'boolean',
      `${key} must be boolean-typed, found ${typeof config[key]}`,
    );
  }
});

test('entry: config-new-project rerun is idempotent (already_exists, config unchanged)', (t) => {
  const fixture = makeFixture(t);
  assert.equal(run(fixture, ['config-new-project']).status, 0);
  const configPath = path.join(fixture.project, '.oto/config.json');
  const before = fs.readFileSync(configPath, 'utf8');

  const rerun = run(fixture, ['config-new-project']);

  assert.equal(rerun.status, 0, rerun.stderr);
  assert.match(rerun.stdout, /already_exists/);
  assert.equal(fs.readFileSync(configPath, 'utf8'), before, 'config must be unchanged');
});

test('entry: config-new-project --ws routes into the workstream config', (t) => {
  const fixture = makeFixture(t);
  fs.mkdirSync(path.join(fixture.project, '.oto/workstreams/ws1'), { recursive: true });

  const result = run(fixture, ['config-new-project', '--ws', 'ws1']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    fs.existsSync(path.join(fixture.project, '.oto/workstreams/ws1/config.json')),
    'workstream config.json must be created',
  );
});

test('status is reachable after entry: secret-status exits 0', (t) => {
  const fixture = makeFixture(t);
  assert.equal(run(fixture, ['config-new-project']).status, 0);

  const status = run(fixture, ['secret-status']);

  assert.equal(status.status, 0, status.stderr);
});

test('regression pin: argument-less config-ensure-section exits 10 (why the workflow must not call it bare)', (t) => {
  const fixture = makeFixture(t);

  const result = run(fixture, ['config-ensure-section']);

  assert.equal(result.status, 10, `expected exit 10, got ${result.status}: ${result.stderr}`);
});

test('workflow contract: executable entry, guarded WS_ARGS threading, used OTO_CONFIG_PATH', () => {
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  assert.ok(
    !content.includes('config-ensure-section'),
    'workflow must never reference config-ensure-section (bare call exits 10)',
  );
  assert.ok(content.includes('config-new-project'), 'entry must use config-new-project');
  assert.ok(
    (content.match(/WS_ARGS\[@\]\+/g) || []).length >= 9,
    'every threaded command uses the guarded expansion',
  );
  const unguarded = content.split('\n').filter(
    (l) => l.includes('"${WS_ARGS[@]}"') && !l.includes('WS_ARGS[@]+'),
  );
  assert.deepEqual(
    unguarded,
    [],
    'no bare "${WS_ARGS[@]}" — unsafe under bash 3.2 with set -u on an empty array',
  );
  assert.ok(
    content.includes('! oto-sdk query secret-set'),
    'user-run hidden-prompt secret-set flow must be preserved',
  );
  assert.ok(
    content.includes('Config: $OTO_CONFIG_PATH'),
    'confirmation must display the computed OTO_CONFIG_PATH',
  );
});

test('wrapper contract: keyfile/boolean storage, no plaintext-in-config claim', () => {
  const wrapper = fs.readFileSync(WRAPPER_PATH, 'utf8');

  assert.ok(
    !wrapper.includes('stored plaintext'),
    'wrapper must not claim keys are stored plaintext in config.json',
  );
  assert.ok(wrapper.includes('secret-set'), 'wrapper must document secret-set');
  assert.ok(wrapper.includes('secret-clear'), 'wrapper must document secret-clear');
  assert.ok(wrapper.includes('0600'), 'wrapper must state the 0600 keyfile mode');
});
