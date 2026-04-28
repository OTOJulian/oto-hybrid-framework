'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-05 (Gemini best-effort install integration)
// Filled by: 03-06-PLAN.md (Wave 3)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-05: install --gemini into tmpdir creates <configDir>/oto/.install.json with runtime === "gemini"', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: install --gemini injects marker block into GEMINI.md', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: mergeSettings is identity — pre-existing settings.json is byte-identical after install', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: uninstall --gemini round-trips clean', { todo: 'Wave 3 — fills assertions' }, () => {});
