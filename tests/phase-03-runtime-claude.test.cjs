'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 (Claude adapter contract)
// Filled by: 03-05-PLAN.md (Wave 2)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-02: adapter exports name === "claude"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has configDirEnvVar === "CLAUDE_CONFIG_DIR"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has defaultConfigDirSegment === ".claude"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has instructionFilename === "CLAUDE.md"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has settingsFilename === "settings.json" and settingsFormat === "json"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has sourceDirs and targetSubdirs for commands/agents/skills/hooks', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter exports lifecycle hooks renderInstructionBlock/transformCommand/transformAgent/transformSkill/mergeSettings/onPreInstall/onPostInstall', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: transformCommand/Agent/Skill are identity for Claude (canonical)', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: mergeSettings is identity at Phase 3 (no-op)', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: renderInstructionBlock output is stable for fixed oto_version (snapshot)', { todo: 'Wave 2 — fills assertions' }, () => {});
