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

function probeGemini() {
  const result = spawnSync('gemini', ['--version'], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) return { available: false, reason: 'gemini not on PATH' };
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const match = /(\d+\.\d+(?:\.\d+)?)/.exec(output);
  if (!match) return { available: false, reason: `gemini --version unparseable: ${output.trim()}` };
  if (compareVersions(match[1], '0.38') < 0) {
    return { available: false, version: match[1], reason: `gemini v${match[1]} < required v0.38` };
  }
  return { available: true, version: match[1], reason: null };
}

function installGemini(tmp) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin/install.js'), '--gemini', '--config-dir', tmp], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, OTO_NO_COLOR: '1' },
    timeout: 60000,
  });
}

test('D-17 gemini spine: install writes command surface, state file, settings.json, and GEMINI.md', async (t) => {
  const tmp = freshTmpDir('oto-smoke-gemini-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installGemini(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const statePath = path.join(tmp, 'oto', '.install.json');
  assert.ok(fs.existsSync(statePath), 'install state file must exist');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.equal(state.runtime, 'gemini');

  for (const relPath of [
    'commands/oto/help.md',
    'commands/oto/progress.md',
    'commands/oto/new-project.md',
  ]) {
    assert.ok(fs.existsSync(path.join(tmp, relPath)), `${relPath} must be installed`);
  }

  const geminiMd = path.join(tmp, 'GEMINI.md');
  assert.ok(fs.existsSync(geminiMd), 'GEMINI.md must exist');
  assert.match(fs.readFileSync(geminiMd, 'utf8'), /<!-- OTO Configuration -->/, 'GEMINI.md marker');
});

test('D-17 gemini per-runtime settings use BeforeTool and AfterTool without Claude-only hooks', async (t) => {
  const tmp = freshTmpDir('oto-smoke-gemini-settings-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installGemini(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const settingsPath = path.join(tmp, 'settings.json');
  assert.ok(fs.existsSync(settingsPath), 'settings.json must exist');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

  assert.equal(settings.experimental?.enableAgents, true, 'experimental.enableAgents must be true');
  assert.ok(settings.hooks?.BeforeTool, 'hooks.BeforeTool must exist');
  assert.ok(settings.hooks?.AfterTool, 'hooks.AfterTool must exist');
  assert.equal(settings.hooks?.PreToolUse, undefined, 'Gemini must not use PreToolUse');
  assert.equal(settings.hooks?.PostToolUse, undefined, 'Gemini must not use PostToolUse');
  assert.equal(settings.statusLine, undefined, 'Gemini must not install statusLine');
  assert.ok(settings._oto, '_oto marker must exist');

  const hooksJson = JSON.stringify(settings.hooks);
  assert.match(hooksJson, /run_shell_command/, 'Gemini Bash matcher must be converted');
  assert.match(hooksJson, /read_file/, 'Gemini Read matcher must be converted');
  assert.match(hooksJson, /write_file/, 'Gemini Write matcher must be converted');
  assert.match(hooksJson, /replace/, 'Gemini Edit matcher must be converted');
});

test('D-17 gemini live invocation skips clearly unless gemini >= 0.38 is on PATH', { skip: probeGemini().reason || false }, async (t) => {
  const tmp = freshTmpDir('oto-smoke-gemini-live-');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const install = installGemini(tmp);
  assert.equal(install.status, 0, `install failed: stdout=${install.stdout} stderr=${install.stderr}`);

  const result = spawnSync('gemini', ['--help'], {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, GEMINI_CONFIG_DIR: tmp },
    timeout: 15000,
  });
  assert.equal(result.error, undefined, `gemini --help spawn error: ${result.error?.message}`);
  assert.notEqual(result.status, null, 'gemini --help must produce an exit code');
});

test('D-17 gemini spine smoke reports clear skip reason when gemini is unavailable or too old', () => {
  const probe = probeGemini();
  if (probe.available) return;
  assert.match(probe.reason, /gemini/, 'skip reason must mention gemini');
});
