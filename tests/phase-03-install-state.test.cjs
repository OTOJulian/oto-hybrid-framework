'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 (install state schema validation)
// Filled by: 03-03-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-04: writeState round-trips through readState (deep equal)', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: validateState rejects unsupported version', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: validateState rejects absolute paths in files[].path', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: validateState rejects non-64-hex sha256', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: validateState rejects unknown runtime name', { todo: 'Wave 1 — fills assertions' }, () => {});
