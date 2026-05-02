'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OPEN_MARKER, CLOSE_MARKER } = require('../bin/lib/marker.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-gemini.cjs'));
const { installRuntime, uninstallRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-test-'));
  t.after(() => {
    fs.rmSync(d, { recursive: true, force: true });
  });
  return d;
}

function installOpts(configDir) {
  return { flags: { configDir, runtimes: ['gemini'] }, repoRoot: REPO_ROOT };
}

test('INS-05: install --gemini into tmpdir creates <configDir>/oto/.install.json with runtime === "gemini"', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const state = JSON.parse(fs.readFileSync(path.join(configDir, 'oto', '.install.json'), 'utf8'));
  assert.equal(state.runtime, 'gemini');
  assert.equal(state.instruction_file.path, 'GEMINI.md');
});

test('INS-05: install --gemini injects marker block into GEMINI.md', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const content = fs.readFileSync(path.join(configDir, 'GEMINI.md'), 'utf8');
  assert.ok(content.includes(OPEN_MARKER));
  assert.ok(content.includes(CLOSE_MARKER));
});

test('INS-05: mergeSettings preserves pre-existing settings.json content and appends Gemini hooks', async (t) => {
  const configDir = tmpDir(t);
  const settings = '{"someKey":"value"}\n';
  fs.writeFileSync(path.join(configDir, 'settings.json'), settings);

  await installRuntime(adapter, installOpts(configDir));

  const merged = JSON.parse(fs.readFileSync(path.join(configDir, 'settings.json'), 'utf8'));
  assert.equal(merged.someKey, 'value');
  assert.equal(merged.experimental.enableAgents, true);
  assert.ok(merged.hooks.BeforeTool);
  assert.ok(merged.hooks.AfterTool);
  assert.equal(merged.statusLine, undefined);
});

test('INS-05: uninstall --gemini round-trips clean', async (t) => {
  const configDir = tmpDir(t);
  const userContent = '# Gemini Notes\n\nKeep this.\n';
  fs.writeFileSync(path.join(configDir, 'GEMINI.md'), userContent);

  await installRuntime(adapter, installOpts(configDir));
  await uninstallRuntime(adapter, installOpts(configDir));

  assert.equal(fs.existsSync(path.join(configDir, 'oto')), false);
  assert.equal(fs.readFileSync(path.join(configDir, 'GEMINI.md'), 'utf8').trim(), userContent.trim());
});
