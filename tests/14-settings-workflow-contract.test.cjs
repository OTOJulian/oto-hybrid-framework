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
const TOOLS_BIN = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const WORKFLOW_PATH = path.join(REPO_ROOT, 'oto/workflows/settings-integrations.md');
const WRAPPER_PATH = path.join(REPO_ROOT, 'oto/commands/oto/settings-integrations.md');
const SESSION_ENV_KEYS = [
  'OTO_SESSION_KEY', 'CODEX_THREAD_ID', 'CLAUDE_SESSION_ID',
  'CLAUDE_CODE_SSE_PORT', 'OPENCODE_SESSION_ID', 'GEMINI_SESSION_ID',
  'CURSOR_SESSION_ID', 'WINDSURF_SESSION_ID', 'TERM_SESSION_ID', 'WT_SESSION',
  'TMUX_PANE', 'ZELLIJ_SESSION_NAME', 'OTO_WORKSTREAM',
];

function makeFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-settings-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-settings-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return { project, home };
}

function cleanEnv(home) {
  const env = {
    ...process.env,
    HOME: home,
    EXA_API_KEY: '',
    BRAVE_API_KEY: '',
    FIRECRAWL_API_KEY: '',
  };
  for (const key of SESSION_ENV_KEYS) delete env[key];
  return env;
}

function run(fixture, args) {
  return spawnSync(process.execPath, [SDK_BIN, 'query', ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

function runTools(fixture, args, extraEnv = {}) {
  return spawnSync(process.execPath, [TOOLS_BIN, ...args], {
    cwd: fixture.project,
    env: { ...cleanEnv(fixture.home), ...extraEnv },
    encoding: 'utf8',
  });
}

function ensureAndLoadConfigBlock() {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const step = workflow.match(
    /<step name="ensure_and_load_config">[\s\S]*?```bash\n([\s\S]*?)\n```/,
  );
  assert.ok(step, 'ensure_and_load_config must contain a fenced bash block');
  return step[1];
}

function runWorkflowResolution(fixture, extraEnv = {}) {
  const script = [
    'set -u',
    'oto-sdk() { :; }',
    ensureAndLoadConfigBlock(),
    'printf "WS=%s\\nCONFIG=%s\\nARGS=%s\\n" "$WS" "$OTO_CONFIG_PATH" "${WS_ARGS[*]-}"',
  ].join('\n');
  return spawnSync('bash', ['-c', script], {
    cwd: fixture.project,
    env: {
      ...cleanEnv(fixture.home),
      OTO_TOOLS: TOOLS_BIN,
      ...extraEnv,
    },
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

test('workflow resolution follows a session-scoped workstream pointer', (t) => {
  const fixture = makeFixture(t);
  fs.mkdirSync(path.join(fixture.project, '.oto'), { recursive: true });
  const sessionEnv = {
    CODEX_THREAD_ID: `oto-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  t.after(() => runTools(fixture, ['workstream', 'set', '--clear'], sessionEnv));

  const created = runTools(fixture, ['workstream', 'create', 'ws1'], sessionEnv);
  assert.equal(created.status, 0, created.stderr);
  const selected = runTools(fixture, ['workstream', 'set', 'ws1'], sessionEnv);
  assert.equal(selected.status, 0, selected.stderr);
  assert.ok(
    !fs.existsSync(path.join(fixture.project, '.oto/active-workstream')),
    'session selection must not create the shared pointer',
  );

  const active = runTools(fixture, ['workstream', 'get', '--raw'], sessionEnv);
  assert.equal(active.status, 0, active.stderr);
  assert.equal(active.stdout.trim(), 'ws1');

  const resolved = runWorkflowResolution(fixture, sessionEnv);
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.match(resolved.stdout, /^WS=ws1$/m);
  assert.match(resolved.stdout, /^ARGS=--ws ws1$/m);
  assert.match(resolved.stdout, /CONFIG=.*workstreams\/ws1\/config\.json$/m);
});

test('workflow resolution uses the root config when no workstream is active', (t) => {
  const fixture = makeFixture(t);
  fs.mkdirSync(path.join(fixture.project, '.oto'), { recursive: true });

  const active = runTools(fixture, ['workstream', 'get', '--raw']);
  assert.equal(active.status, 0, active.stderr);
  assert.equal(active.stdout.trim(), 'none');

  const resolved = runWorkflowResolution(fixture);
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.match(resolved.stdout, /^WS=none$/m);
  assert.match(resolved.stdout, /^ARGS=$/m);
  assert.match(resolved.stdout, /CONFIG=.*\.oto\/config\.json$/m);
});

test('config-path and workflow resolution honor a migrated .planning root', (t) => {
  const fixture = makeFixture(t);
  fs.mkdirSync(path.join(fixture.project, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(fixture.project, '.planning/config.json'), '{}\n');
  fs.writeFileSync(
    path.join(fixture.project, '.planning/STATE.md'),
    '---\noto_state_version: 1.0\n---\n',
  );

  const configPath = runTools(fixture, ['config-path']);
  assert.equal(configPath.status, 0, configPath.stderr);
  assert.match(configPath.stdout, /\.planning\/config\.json\s*$/);

  const resolved = runWorkflowResolution(fixture);
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.match(resolved.stdout, /CONFIG=.*\.planning\/config\.json$/m);
});

test('workflow resolution is canonical and contains no direct pointer reads', () => {
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const ensureStep = content.match(
    /<step name="ensure_and_load_config">([\s\S]*?)<\/step>/,
  );
  assert.ok(ensureStep, 'ensure_and_load_config step must exist');
  assert.match(ensureStep[1], /workstream get --raw/);
  assert.match(ensureStep[1], /config-path/);
  assert.ok(!ensureStep[1].includes('.oto/config.json'));
  assert.ok(!content.includes('active-workstream'));
  assert.ok((content.match(/WS_ARGS\[@\]\+/g) || []).length >= 12);

  const unguarded = content.split('\n').filter(
    (line) => line.includes('oto-sdk') && line.includes('WS_ARGS') &&
      !line.includes('WS_ARGS[@]+'),
  );
  assert.deepEqual(unguarded, []);
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
