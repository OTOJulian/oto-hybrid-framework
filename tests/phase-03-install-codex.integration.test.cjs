'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { OPEN_MARKER, CLOSE_MARKER } = require('../bin/lib/marker.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-codex.cjs'));
const { installRuntime, uninstallRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-test-'));
  t.after(() => {
    fs.rmSync(d, { recursive: true, force: true });
  });
  return d;
}

function installOpts(configDir) {
  return { flags: { configDir, runtimes: ['codex'] }, repoRoot: REPO_ROOT };
}

test('INS-05: install --codex into tmpdir creates <configDir>/oto/.install.json with runtime === "codex"', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const state = JSON.parse(fs.readFileSync(path.join(configDir, 'oto', '.install.json'), 'utf8'));
  assert.equal(state.runtime, 'codex');
  assert.equal(state.instruction_file.path, 'AGENTS.md');
});

test('INS-05: install --codex injects marker block into AGENTS.md (not CLAUDE.md)', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const content = fs.readFileSync(path.join(configDir, 'AGENTS.md'), 'utf8');
  assert.ok(content.includes(OPEN_MARKER));
  assert.ok(content.includes(CLOSE_MARKER));
  assert.equal(fs.existsSync(path.join(configDir, 'CLAUDE.md')), false);
});

test('INS-05: mergeSettings is identity — pre-existing config.toml is byte-identical after install', async (t) => {
  const configDir = tmpDir(t);
  const settings = "[some_section]\nkey = 'value'\n";
  fs.writeFileSync(path.join(configDir, 'config.toml'), settings);

  await installRuntime(adapter, installOpts(configDir));

  assert.equal(fs.readFileSync(path.join(configDir, 'config.toml'), 'utf8'), settings);
});

test('INS-05: uninstall --codex round-trips clean (state file gone, AGENTS.md restored)', async (t) => {
  const configDir = tmpDir(t);
  const userContent = '# Codex Notes\n\nKeep this.\n';
  fs.writeFileSync(path.join(configDir, 'AGENTS.md'), userContent);

  await installRuntime(adapter, installOpts(configDir));
  await uninstallRuntime(adapter, installOpts(configDir));

  assert.equal(fs.existsSync(path.join(configDir, 'oto', '.install.json')), false);
  assert.equal(fs.readFileSync(path.join(configDir, 'AGENTS.md'), 'utf8').trim(), userContent.trim());
});

test('INS-05: uninstall refuses state belonging to a different runtime', (t) => {
  const configDir = tmpDir(t);
  const install = spawnSync(
    process.execPath,
    ['bin/install.js', 'install', '--codex', '--config-dir', configDir],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const statePath = path.join(configDir, 'oto', '.install.json');
  const agentsPath = path.join(configDir, 'AGENTS.md');
  const beforeState = fs.readFileSync(statePath, 'utf8');
  const beforeAgents = fs.readFileSync(agentsPath, 'utf8');

  const uninstall = spawnSync(
    process.execPath,
    ['bin/install.js', 'uninstall', '--claude', '--config-dir', configDir],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );

  assert.equal(uninstall.status, 2);
  assert.match(uninstall.stderr, /state runtime mismatch: found codex/);
  assert.equal(fs.readFileSync(statePath, 'utf8'), beforeState);
  assert.equal(fs.readFileSync(agentsPath, 'utf8'), beforeAgents);
});

test('INS-05: install refuses to overwrite state belonging to a different runtime', (t) => {
  const configDir = tmpDir(t);
  const installCodex = spawnSync(
    process.execPath,
    ['bin/install.js', 'install', '--codex', '--config-dir', configDir],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );
  assert.equal(installCodex.status, 0, installCodex.stderr || installCodex.stdout);

  const statePath = path.join(configDir, 'oto', '.install.json');
  const agentsPath = path.join(configDir, 'AGENTS.md');
  const beforeState = fs.readFileSync(statePath, 'utf8');
  const beforeAgents = fs.readFileSync(agentsPath, 'utf8');

  const installClaude = spawnSync(
    process.execPath,
    ['bin/install.js', 'install', '--claude', '--config-dir', configDir],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  );

  assert.equal(installClaude.status, 1);
  assert.match(installClaude.stderr, /state runtime mismatch: found codex/);
  assert.equal(fs.readFileSync(statePath, 'utf8'), beforeState);
  assert.equal(fs.readFileSync(agentsPath, 'utf8'), beforeAgents);
  assert.equal(fs.existsSync(path.join(configDir, 'CLAUDE.md')), false);
});
