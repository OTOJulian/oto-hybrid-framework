'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-06 (--all multi-runtime install integration)
// Filled by: 03-06-PLAN.md (Wave 3)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-06: --all with all 3 fake runtime dirs present installs to all 3', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-06: --all skips absent runtime dirs (only installs to ones whose ~/.<runtime>/ exists)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-06: --all with no present runtimes exits 4 with stderr message containing "no runtimes detected"', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-06: --all + --config-dir rejected at parse time (exit 3, stderr contains "--config-dir cannot be used with --all")', { todo: 'Wave 3 — fills assertions' }, () => {});
