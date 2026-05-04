'use strict';
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../bin/lib/runtime-codex.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 + INS-05 (Codex adapter contract)
// Filled by: 03-05-PLAN.md (Wave 2)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-02: adapter exports name === "codex"', () => {
  assert.equal(adapter.name, 'codex');
  assert.equal(typeof adapter, 'object');
  for (const key of [
    'renderInstructionBlock',
    'transformCommand',
    'transformAgent',
    'transformSkill',
    'mergeSettings',
    'onPreInstall',
    'onPostInstall',
  ]) {
    assert.equal(typeof adapter[key], 'function', `${key} should be a function`);
  }
});

test('INS-02: adapter descriptor has configDirEnvVar === "CODEX_HOME"', () => {
  assert.equal(adapter.configDirEnvVar, 'CODEX_HOME');
});

test('INS-02: adapter descriptor has defaultConfigDirSegment === ".codex"', () => {
  assert.equal(adapter.defaultConfigDirSegment, '.codex');
});

test('INS-02: adapter descriptor has instructionFilename === "AGENTS.md"', () => {
  assert.equal(adapter.instructionFilename, 'AGENTS.md');
});

test('INS-02: adapter descriptor has settingsFilename === "config.toml" and settingsFormat === "toml"', () => {
  assert.equal(adapter.settingsFilename, 'config.toml');
  assert.equal(adapter.settingsFormat, 'toml');
});

test('INS-02: transformCommand/Agent/Skill use Codex parity transforms', () => {
  assert.equal(adapter.transformCommand('@~/.claude/oto/workflows/x.md $ARGUMENTS', {}), '@~/.codex/oto/workflows/x.md {{GSD_ARGS}}');
  assert.equal(adapter.transformSkill('@~/.claude/oto/references/x.md', {}), '@~/.codex/oto/references/x.md');
  assert.match(
    adapter.transformAgent('---\nname: oto-x\ndescription: Demo\ntools: Read\ncolor: red\n---\n@~/.claude/oto/x.md'),
    /<codex_agent_role>\nrole: oto-x\n/
  );
});

test('INS-02: mergeSettings injects managed Codex hook entries', () => {
  const merged = adapter.mergeSettings('model = "gpt-5.3-codex"\n', {
    configDir: '/tmp/oto-codex',
    otoVersion: '0.1.0',
  });
  assert.match(merged, /# === BEGIN OTO HOOKS ===/);
  assert.match(merged, /\[\[hooks\]\]/);
  assert.match(merged, /oto-validate-commit\.sh/);
});

test('INS-05: --codex instruction block uses the Codex runtime label', () => {
  const source = fs.readFileSync('bin/lib/runtime-codex.cjs', 'utf8');
  const result = adapter.renderInstructionBlock({ otoVersion: '0.1.0' });
  assert.match(result, /## oto \(Codex\)/);
  assert.match(result, /\/oto-help/);
  assert.match(source, /codex-transform\.cjs/);
  assert.match(source, /codex-toml\.cjs/);
});
