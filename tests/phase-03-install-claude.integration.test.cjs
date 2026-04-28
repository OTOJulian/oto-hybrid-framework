'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 + INS-05 (Claude install integration)
// Filled by: 03-06-PLAN.md + 03-07-PLAN.md (Wave 3 + Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-04 / INS-05: install --claude into tmpdir creates <configDir>/oto/.install.json', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: install --claude injects <!-- OTO Configuration --> ... <!-- /OTO Configuration --> block into CLAUDE.md', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: install preserves pre-existing user content in CLAUDE.md byte-for-byte outside marker block', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: re-install over existing install produces byte-identical state.files[] (modulo installed_at)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: re-install does NOT duplicate marker block (exactly one open marker present)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: uninstall --claude removes <configDir>/oto/ subdir entirely', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: uninstall restores CLAUDE.md to pre-install user content (block stripped, surrounding text intact)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-04: copied files are regular files, not symlinks (lstat().isSymbolicLink() === false)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: success message matches /^installed: claude — \\d+ files copied, marker injected, state at .+\\.install\\.json$/', { todo: 'Wave 3 — fills assertions' }, () => {});
