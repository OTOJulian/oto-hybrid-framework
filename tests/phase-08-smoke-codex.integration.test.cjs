'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function freshTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function compareVersions(a, b) {
  const parse = (value) => String(value).split('.').map((part) => Number(part) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < 3; index += 1) {
    const delta = (left[index] || 0) - (right[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function probeCodex() {
  const result = spawnSync('codex', ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) return { available: false, reason: 'codex not on PATH' };
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const match = /(\d+\.\d+(?:\.\d+)?)/.exec(output);
  if (!match) return { available: false, reason: `codex --version unparseable: ${output.trim()}` };
  if (compareVersions(match[1], '0.120') < 0) {
    return { available: false, version: match[1], reason: `codex v${match[1]} < required v0.120` };
  }
  return { available: true, version: match[1], reason: null };
}

function installCodex(tmp) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin/install.js'), '--codex', '--config-dir', tmp], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, OTO_NO_COLOR: '1' },
    timeout: 60000,
  });
}

test('D-17 codex spine: install writes command surface, state file, config.toml, and AGENTS.md', async (t) => {
  const tmp = freshTmpDir('oto-smoke-codex-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installCodex(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const statePath = path.join(tmp, 'oto', '.install.json');
  assert.ok(fs.existsSync(statePath), 'install state file must exist');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.equal(state.runtime, 'codex');

  for (const relPath of [
    'commands/oto/help.md',
    'commands/oto/progress.md',
    'commands/oto/new-project.md',
  ]) {
    assert.ok(fs.existsSync(path.join(tmp, relPath)), `${relPath} must be installed`);
  }

  const configToml = path.join(tmp, 'config.toml');
  assert.ok(fs.existsSync(configToml), 'config.toml must exist');
  assert.match(fs.readFileSync(configToml, 'utf8'), /=== BEGIN OTO HOOKS/, 'BEGIN OTO HOOKS marker');

  const agentsMd = path.join(tmp, 'AGENTS.md');
  assert.ok(fs.existsSync(agentsMd), 'AGENTS.md must exist');
  assert.match(fs.readFileSync(agentsMd, 'utf8'), /<!-- OTO Configuration -->/, 'AGENTS.md marker');
});

test('D-17 codex per-agent .toml exists with workspace-write sandbox mode', async (t) => {
  const tmp = freshTmpDir('oto-smoke-codex-agent-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installCodex(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const executorToml = path.join(tmp, 'agents', 'oto-executor.toml');
  assert.ok(fs.existsSync(executorToml), 'oto-executor.toml must exist');
  const executorContent = fs.readFileSync(executorToml, 'utf8');
  assert.match(executorContent, /^sandbox_mode = "workspace-write"$/m, 'oto-executor sandbox mode');
  assert.equal(/\bgsd-/i.test(executorContent), false, 'oto-executor.toml must not leak upstream command prefix');
  assert.equal(/\bsuperpowers\b/i.test(executorContent), false, 'oto-executor.toml must not leak upstream skill brand');
});

test('D-17 codex live invocation skips clearly unless codex >= 0.120 is on PATH', { skip: probeCodex().reason || false }, async (t) => {
  const tmp = freshTmpDir('oto-smoke-codex-live-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installCodex(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const result = spawnSync('codex', ['help'], {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, CODEX_HOME: tmp },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, `codex help spawn error: ${result.error?.message}`);
  assert.notEqual(result.status, null, 'codex help must produce an exit code');
});

test('D-17 codex spine smoke reports clear skip reason when codex is unavailable or too old', () => {
  const probe = probeCodex();
  if (probe.available) return;
  assert.match(probe.reason, /codex/, 'skip reason must mention codex');
});
