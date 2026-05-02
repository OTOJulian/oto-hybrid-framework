'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadDefaults, resolveAgentModel, RUNTIME_PROFILE_MAP } = require('../bin/lib/codex-profile.cjs');

function tmpHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-codex-profile-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.mkdirSync(path.join(home, '.oto'), { recursive: true });
  return home;
}

test('D-10 resolveAgentModel: per-project model_overrides wins over global defaults', () => {
  const result = resolveAgentModel(
    'oto-executor',
    { model_overrides: { 'oto-executor': 'project-model' } },
    { model_overrides: { 'oto-executor': 'global-model' }, model_profile: 'opus' },
    'codex',
  );

  assert.deepEqual(result, { model: 'project-model' });
});

test('D-10 resolveAgentModel: model_profile from project config drives codex tier resolution', () => {
  assert.deepEqual(
    resolveAgentModel('oto-executor', { model_profile: 'opus' }, { model_profile: 'haiku' }, 'codex'),
    RUNTIME_PROFILE_MAP.codex.opus,
  );
});

test('D-10 resolveAgentModel: returns model and reasoning_effort for codex defaults', () => {
  assert.deepEqual(
    resolveAgentModel('oto-executor', {}, null, 'codex'),
    { model: 'gpt-5.3-codex', reasoning_effort: 'medium' },
  );
});

test('D-10 resolveAgentModel: omits reasoning_effort for non-codex runtimes', () => {
  assert.deepEqual(
    resolveAgentModel('oto-executor', { model_profile: 'sonnet' }, null, 'gemini'),
    { model: 'gemini-3-flash' },
  );
});

test('D-10 loadDefaults validates ~/.oto/defaults.json shape', (t) => {
  const home = tmpHome(t);
  const defaultsPath = path.join(home, '.oto/defaults.json');

  fs.writeFileSync(defaultsPath, JSON.stringify({
    runtime: 'codex',
    model_profile: 'haiku',
    model_overrides: { 'oto-executor': 'custom-model' },
  }));
  assert.deepEqual(loadDefaults(home), {
    runtime: 'codex',
    model_profile: 'haiku',
    model_overrides: { 'oto-executor': 'custom-model' },
  });

  fs.writeFileSync(defaultsPath, JSON.stringify({ model_overrides: { 'oto-executor': 12 } }));
  assert.throws(() => loadDefaults(home), /model_overrides values must be strings/);

  fs.writeFileSync(defaultsPath, JSON.stringify({ runtime: 'codx' }));
  assert.throws(() => loadDefaults(home), /runtime must be one of/);
});
