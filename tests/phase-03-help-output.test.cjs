'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-01 / D-15 (installer help output)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-01 / D-15: oto install --help mentions --claude, --codex, --gemini, --all, --config-dir', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01 / D-15: oto install --help documents resolution order: --config-dir > <RUNTIME>_CONFIG_DIR env > ~/.<runtime>/', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01 / D-15: oto install --help labels --codex and --gemini as "best-effort until Phase 8"', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01 / D-15: oto install --help fits 30 lines / 80 columns (no wrap)', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01 / D-15: oto install --help exits 0 to stdout (not stderr)', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01 / D-15: help mentions "https://github.com/OTOJulian/oto-hybrid-framework" and oto version', { todo: 'Wave 4 — fills assertions' }, () => {});
test('INS-01: help does NOT mention any of opencode/kilo/cursor/windsurf/antigravity/augment/trae/qwen/codebuddy/cline/copilot', { todo: 'Wave 4 — fills assertions' }, () => {});
