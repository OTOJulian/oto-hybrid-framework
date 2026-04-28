'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-03 + INS-06 (arg validation)
// Filled by: 03-02-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-03: --config-dir flag wins over env var and default', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-03: env var wins over default when no flag', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-03: default = ~/.<runtime> when no flag and no env', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-03: expandTilde resolves ~/foo against os.homedir()', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-06: --all + --config-dir rejected at parse time (exit 3)', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-06: --all + --claude rejected (mutual exclusion)', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-06: parseCliArgs returns runtimes array for --claude --codex combination', { todo: 'Wave 1 — fills assertions' }, () => {});
