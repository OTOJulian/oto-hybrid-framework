'use strict';
// Phase 5 Wave 0 scaffold - implemented in Wave 3 (plan 05-04).
// Covers: HK-01..06 mergeSettings round-trip.
// Will: (1) read `tests/fixtures/phase-05/settings-existing.json`, call `runtimeClaude.mergeSettings(existingText, { otoVersion: '0.1.0-alpha.1', configDir: '/tmp/fake-claude' })`, parse result, assert user `model`, `permissions`, and `hooks.PreToolUse[0]` entries preserved verbatim; (2) assert `_oto` top-level key exists with `version`, `installed_at`, and a `hooks` array containing exactly 6 entries (SessionStart, PreToolUse Write|Edit, PostToolUse Read, PostToolUse Bash, PostToolUse Bash|Edit|Write|MultiEdit|Agent|Task, statusLine - per 05-RESEARCH.md Code Example 1 + Pitfall A: context-monitor on PostToolUse NOT Stop, + 05-VALIDATION.md HK-06 note: validate-commit on PreToolUse Bash NOT PostToolUse); (3) idempotency - calling mergeSettings on the merged output yields byte-identical result; (4) uninstall - call hypothetical `runtimeClaude.unmergeSettings(merged)`, assert result is byte-identical to original existing fixture (`_oto` block + oto entries removed, user entries untouched).
const test = require('node:test');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-05 merge-settings: round-trip preserves user content; idempotent; uninstall removes only _oto', (t) => {
  t.todo('Implemented in Wave 3 (plan 05-04) once runtime-claude.cjs::mergeSettings is filled in');
});
