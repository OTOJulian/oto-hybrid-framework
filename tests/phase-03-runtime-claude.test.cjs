'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../bin/lib/runtime-claude.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 (Claude adapter contract)
// Filled by: 03-05-PLAN.md (Wave 2)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-02: adapter exports name === "claude"', () => {
  assert.equal(adapter.name, 'claude');
});

test('INS-02: adapter descriptor has configDirEnvVar === "CLAUDE_CONFIG_DIR"', () => {
  assert.equal(adapter.configDirEnvVar, 'CLAUDE_CONFIG_DIR');
});

test('INS-02: adapter descriptor has defaultConfigDirSegment === ".claude"', () => {
  assert.equal(adapter.defaultConfigDirSegment, '.claude');
});

test('INS-02: adapter descriptor has instructionFilename === "CLAUDE.md"', () => {
  assert.equal(adapter.instructionFilename, 'CLAUDE.md');
});

test('INS-02: adapter descriptor has settingsFilename === "settings.json" and settingsFormat === "json"', () => {
  assert.equal(adapter.settingsFilename, 'settings.json');
  assert.equal(adapter.settingsFormat, 'json');
});

test('INS-02: adapter descriptor has sourceDirs and targetSubdirs for runtime payload and support docs', () => {
  assert.deepEqual(Object.keys(adapter.sourceDirs), [
    'commands',
    'agents',
    'skills',
    'hooks',
    'workflows',
    'references',
    'templates',
    'contexts',
  ]);
  assert.deepEqual(Object.keys(adapter.targetSubdirs), [
    'commands',
    'agents',
    'skills',
    'hooks',
    'workflows',
    'references',
    'templates',
    'contexts',
  ]);
  assert.deepEqual(adapter.sourceDirs, {
    commands: 'oto/commands',
    agents: 'oto/agents',
    skills: 'oto/skills',
    hooks: 'oto/hooks/dist',
    workflows: 'oto/workflows',
    references: 'oto/references',
    templates: 'oto/templates',
    contexts: 'oto/contexts',
  });
  assert.deepEqual(adapter.targetSubdirs, {
    commands: 'commands',
    agents: 'agents',
    skills: 'skills',
    hooks: 'hooks',
    workflows: 'oto/workflows',
    references: 'oto/references',
    templates: 'oto/templates',
    contexts: 'oto/contexts',
  });
});

test('INS-02: adapter exports lifecycle hooks renderInstructionBlock/transformCommand/transformAgent/transformSkill/mergeSettings/onPreInstall/onPostInstall', () => {
  for (const key of [
    'renderInstructionBlock',
    'transformCommand',
    'transformAgent',
    'transformSkill',
    'mergeSettings',
    'unmergeSettings',
    'onPreInstall',
    'onPostInstall',
  ]) {
    assert.equal(typeof adapter[key], 'function', `${key} should be a function`);
  }
});

test('INS-02: transformCommand/Agent/Skill are identity for Claude (canonical)', () => {
  assert.equal(adapter.transformCommand('foo', {}), 'foo');
  assert.equal(adapter.transformAgent('foo', {}), 'foo');
  assert.equal(adapter.transformSkill('foo', {}), 'foo');
});

test('INS-02 / HK-02..06: mergeSettings registers Claude hook settings', () => {
  const merged = JSON.parse(adapter.mergeSettings('', {
    otoVersion: '0.1.0',
    configDir: '/tmp/claude',
    installedAt: '2026-01-01T00:00:00Z',
  }));
  assert.equal(merged._oto.version, '0.1.0');
  assert.equal(merged._oto.hooks.length, 6);
  assert.equal(merged.statusLine.type, 'command');
  assert.ok(merged.hooks.PreToolUse.some((entry) =>
    entry.matcher === 'Bash' && entry.hooks[0].command.includes('oto-validate-commit.sh')
  ));
  assert.ok(merged.hooks.PostToolUse.some((entry) =>
    entry.matcher === 'Bash|Edit|Write|MultiEdit|Agent|Task' &&
    entry.hooks[0].command.includes('oto-context-monitor.js')
  ));
});

test('INS-02: renderInstructionBlock output is stable for fixed oto_version (snapshot)', () => {
  const result = adapter.renderInstructionBlock({ otoVersion: '0.1.0' });
  assert.match(result, /oto v0\.1\.0/);
  assert.match(result, /\/oto-help/);
  assert.equal(
    result,
    '<!-- managed by oto v0.1.0 — do not edit between markers -->\n' +
      '## oto\n\n' +
      'oto v0.1.0 is installed for Claude Code. Run `/oto-help` for the command list.\n' +
      'Repo: https://github.com/OTOJulian/oto-hybrid-framework'
  );
});
