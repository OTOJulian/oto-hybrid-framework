'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

// Phase 3 Wave 0 scaffold.
// Covers: INS-05 (Codex best-effort install integration)
// Filled by: 03-06-PLAN.md (Wave 3)
// Sources: 03-VALIDATION.md per-task verification map

test('INS-05: install --codex into tmpdir creates <configDir>/oto/.install.json with runtime === "codex"', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: install --codex injects marker block into AGENTS.md (not CLAUDE.md)', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: mergeSettings is identity — pre-existing config.toml is byte-identical after install', { todo: 'Wave 3 — fills assertions' }, () => {});
test('INS-05: uninstall --codex round-trips clean (state file gone, AGENTS.md restored)', { todo: 'Wave 3 — fills assertions' }, () => {});
