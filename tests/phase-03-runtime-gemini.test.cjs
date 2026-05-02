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

test('INS-02: transformCommand/Agent use Gemini parity transforms while skills stay identity', () => {
  const command = adapter.transformCommand('---\ndescription: D\n---\n@~/.claude/oto/x.md', {
    srcKey: 'commands',
    relPath: 'oto/x.md',
  });
  assert.match(command, /^description = "D"$/m);
  assert.match(command, /@~\/\.gemini\/oto\/x\.md/);
  assert.match(
    adapter.transformAgent('---\nname: t\ndescription: D\ntools: Read, Bash\ncolor: red\n---\nRead ./CLAUDE.md'),
    /^tools:\n  - read_file\n  - run_shell_command$/m,
  );
  assert.equal(adapter.transformSkill('foo', {}), 'foo');
});

test('INS-05: Gemini adapter wires settings merge and transform helpers', () => {
  const source = fs.readFileSync('bin/lib/runtime-gemini.cjs', 'utf8');
  const result = adapter.renderInstructionBlock({ otoVersion: '0.1.0-alpha.1' });
  const merged = JSON.parse(adapter.mergeSettings('{}', { configDir: '/tmp/gemini', otoVersion: 'V' }));
  assert.match(result, /## oto \(Gemini\)/);
  assert.equal(merged.experimental.enableAgents, true);
  assert.ok(merged.hooks.BeforeTool);
  assert.ok(merged.hooks.AfterTool);
  assert.match(source, /gemini-transform\.cjs/);
});
