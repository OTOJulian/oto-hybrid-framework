'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// Phase 3 Wave 0 scaffold.
// Covers: INS-01 / D-15 (installer help output)
// Filled by: 03-07-PLAN.md (Wave 4)
// Sources: 03-VALIDATION.md per-task verification map

function runHelp() {
  return spawnSync(process.execPath, ['bin/install.js', '--help'], { encoding: 'utf8' });
}

function runInstaller(args) {
  return spawnSync(process.execPath, ['bin/install.js', ...args], { encoding: 'utf8' });
}

test('INS-01 / D-15: oto install --help mentions --claude, --codex, --gemini, --all, --config-dir', () => {
  const result = runHelp();
  for (const token of ['--claude', '--codex', '--gemini', '--all', '--config-dir']) {
    assert.ok(result.stdout.includes(token), `missing ${token}`);
  }
});

test('INS-01 / D-15: oto install --help documents resolution order: --config-dir > <RUNTIME>_CONFIG_DIR env > ~/.<runtime>/', () => {
  const result = runHelp();
  for (const token of ['CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'GEMINI_CONFIG_DIR']) {
    assert.ok(result.stdout.includes(token), `missing ${token}`);
  }
});

test('INS-01 / D-15: oto install --help labels --codex and --gemini as "best-effort until Phase 8"', () => {
  const result = runHelp();
  const matches = result.stdout.match(/best-effort until Phase 8/g) || [];
  assert.ok(matches.length >= 2, `expected at least 2 best-effort labels, got ${matches.length}`);
});

test('INS-01 / D-15: oto install --help fits 40 lines / 80 columns (no wrap)', () => {
  const result = runHelp();
  const lines = result.stdout.trimEnd().split('\n');
  assert.ok(lines.length <= 40, `expected <= 40 lines, got ${lines.length}`);
  for (const line of lines.filter(Boolean)) {
    assert.ok(line.length <= 80, `line exceeds 80 columns: ${line}`);
  }
});

test('INS-01 / D-15: oto install --help exits 0 to stdout (not stderr)', () => {
  const result = runHelp();
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.ok(result.stdout.length > 0);
});

test('INS-01 / D-15: help mentions "https://github.com/OTOJulian/oto-hybrid-framework" and oto version', () => {
  const result = runHelp();
  assert.ok(result.stdout.includes('https://github.com/OTOJulian/oto-hybrid-framework'));
  assert.ok(result.stdout.includes('oto v'));
});

test('INS-01: help does NOT mention any of opencode/kilo/cursor/windsurf/antigravity/augment/trae/qwen/codebuddy/cline/copilot', () => {
  const result = runHelp();
  const lower = result.stdout.toLowerCase();
  for (const name of [
    'opencode',
    'kilo',
    'cursor',
    'windsurf',
    'antigravity',
    'augment',
    'trae',
    'qwen',
    'codebuddy',
    'cline',
    'copilot',
  ]) {
    assert.ok(!lower.includes(name), `unexpected ${name}`);
  }
});

test('INS-06: install --config-dir with multiple runtimes exits 3', () => {
  const result = runInstaller(['install', '--claude', '--codex', '--config-dir', '/tmp/oto-multi-runtime']);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /--config-dir cannot be combined with multiple runtimes/);
});

test('INS-06: uninstall --config-dir with multiple runtimes exits 3', () => {
  const result = runInstaller(['uninstall', '--claude', '--codex', '--config-dir', '/tmp/oto-multi-runtime']);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /--config-dir cannot be combined with multiple runtimes/);
});
