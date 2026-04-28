'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-02 + INS-05 (Gemini adapter contract)
// Filled by: 03-05-PLAN.md (Wave 2)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-02: adapter exports name === "gemini"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has configDirEnvVar === "GEMINI_CONFIG_DIR"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has defaultConfigDirSegment === ".gemini"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has instructionFilename === "GEMINI.md"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: adapter descriptor has settingsFilename === "settings.json" and settingsFormat === "json"', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-02: transformCommand/Agent/Skill are identity at Phase 3 (TODO Phase 8 parity comment present)', { todo: 'Wave 2 — fills assertions' }, () => {});
test('INS-05: --gemini labeled best-effort until Phase 8 — adapter has // TODO Phase 8 marker in source', { todo: 'Wave 2 — fills assertions' }, () => {});
