'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-01 / SC#4 (unwanted runtime exclusions)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-01 / SC#4: grep -E "(--opencode|--kilo|--cursor|--windsurf|--antigravity|--augment|--trae|--qwen|--codebuddy|--cline|--copilot)" returns 0 hits in bin/ and scripts/install*.cjs (excluding foundation-frameworks/, tests/, decisions/, license files, this test file)', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01: bare-name scan ("opencode", "kilocode", etc.) limited to bin/ and scripts/install*.cjs returns 0 hits', { todo: 'Wave 4 — fills assertions' }, () => {});
