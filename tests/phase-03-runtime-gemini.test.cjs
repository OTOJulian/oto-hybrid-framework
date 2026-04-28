'use strict';
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../bin/lib/runtime-gemini.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 + INS-05 (Gemini adapter contract)
// Filled by: 03-05-PLAN.md (Wave 2)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-02: adapter exports name === "gemini"', () => {
  assert.equal(adapter.name, 'gemini');
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

test('INS-02: adapter descriptor has configDirEnvVar === "GEMINI_CONFIG_DIR"', () => {
  assert.equal(adapter.configDirEnvVar, 'GEMINI_CONFIG_DIR');
});

test('INS-02: adapter descriptor has defaultConfigDirSegment === ".gemini"', () => {
  assert.equal(adapter.defaultConfigDirSegment, '.gemini');
});

test('INS-02: adapter descriptor has instructionFilename === "GEMINI.md"', () => {
  assert.equal(adapter.instructionFilename, 'GEMINI.md');
});

test('INS-02: adapter descriptor has settingsFilename === "settings.json" and settingsFormat === "json"', () => {
  assert.equal(adapter.settingsFilename, 'settings.json');
  assert.equal(adapter.settingsFormat, 'json');
});

test('INS-02: transformCommand/Agent/Skill are identity at Phase 3 (TODO Phase 8 parity comment present)', () => {
  const source = fs.readFileSync('bin/lib/runtime-gemini.cjs', 'utf8');
  assert.equal(adapter.transformCommand('foo', {}), 'foo');
  assert.equal(adapter.transformAgent('foo', {}), 'foo');
  assert.equal(adapter.transformSkill('foo', {}), 'foo');
  assert.equal(adapter.mergeSettings('original', 'block'), 'original');
  assert.match(source, /\/\/ TODO Phase 8: Gemini command transform\n\s*transformCommand:/);
  assert.match(
    source,
    /\/\/ TODO Phase 8: Gemini tool-name remap parity \(convertClaudeToGeminiTools equivalent\)\n\s*transformAgent:/
  );
  assert.match(source, /\/\/ TODO Phase 5: Gemini settings\.json merge\n\s*mergeSettings:/);
});

test('INS-05: --gemini labeled best-effort until Phase 8 — adapter has // TODO Phase 8 marker in source', () => {
  const source = fs.readFileSync('bin/lib/runtime-gemini.cjs', 'utf8');
  const result = adapter.renderInstructionBlock({ otoVersion: '0.1.0-alpha.1' });
  assert.match(result, /best-effort until Phase 8/);
  assert.match(source, /TODO Phase 8: Gemini command transform/);
  assert.match(source, /TODO Phase 8: Gemini tool-name remap parity/);
  assert.match(source, /TODO Phase 5: Gemini settings\.json merge/);
});
