'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectPresentRuntimes, SUPPORTED_RUNTIMES, DEFAULT_SEGMENTS } = require('../bin/lib/runtime-detect.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-06 (--all runtime detection)
// Filled by: 03-02-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-runtime-detect-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('INS-06: --all detects present runtimes via dir existence', (t) => {
  const homeDir = tmpDir(t);
  fs.mkdirSync(path.join(homeDir, '.claude'));

  assert.deepEqual(SUPPORTED_RUNTIMES, ['claude', 'codex', 'gemini']);
  assert.deepEqual(DEFAULT_SEGMENTS, { claude: '.claude', codex: '.codex', gemini: '.gemini' });
  assert.deepEqual(detectPresentRuntimes(homeDir), ['claude']);
});

test('INS-06: detectPresentRuntimes returns [] when no runtimes installed', (t) => {
  const homeDir = tmpDir(t);
  assert.deepEqual(detectPresentRuntimes(homeDir), []);
});

test('INS-06: detectPresentRuntimes only returns claude/codex/gemini (no other names)', (t) => {
  const homeDir = tmpDir(t);
  fs.mkdirSync(path.join(homeDir, '.opencode'));
  fs.mkdirSync(path.join(homeDir, '.cursor'));
  fs.mkdirSync(path.join(homeDir, '.codex'));

  assert.deepEqual(detectPresentRuntimes(homeDir), ['codex']);
});
