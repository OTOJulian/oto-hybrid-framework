'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 (copy, hash, walk, and remove primitives)
// Filled by: 03-04-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-04: copyTree returns 0 filesCopied when src absent', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: copyTree copies tree of files into dst recursively', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: copyTree-written files are not symlinks (lstat().isSymbolicLink() === false)', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: copyTree rejects source tree containing a symlink', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: sha256File returns deterministic 64-hex digest', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: walkTree returns [] for absent root', { todo: 'Wave 1 — fills assertions' }, () => {});
test('INS-04: removeTree is no-op for absent path', { todo: 'Wave 1 — fills assertions' }, () => {});
