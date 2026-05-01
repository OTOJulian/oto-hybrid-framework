'use strict';
// Phase 5 - implemented in Wave 3 (plan 05-04)
// Covers: HK-01..06 + D-12 (event registrations) + D-13 (round-trip) + D-14 (uninstall removes only _oto)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');
const { mergeSettings, unmergeSettings } = require(path.join(REPO_ROOT, 'bin/lib/runtime-claude.cjs'));

const FIX_EXISTING = fs.readFileSync(path.join(REPO_ROOT, 'tests/fixtures/phase-05/settings-existing.json'), 'utf8');
const FIX_EMPTY = fs.readFileSync(path.join(REPO_ROOT, 'tests/fixtures/phase-05/settings-empty.json'), 'utf8');
const CTX = {
  otoVersion: '0.1.0-alpha.1',
  configDir: '/Users/julian/.claude',
  runtime: 'claude',
  installedAt: '2026-04-30T12:00:00Z',
};

test('phase-05 merge-settings: bare merge produces 6 marker entries with correct events/matchers', () => {
  const merged = JSON.parse(mergeSettings(FIX_EMPTY, CTX));
  const m = merged._oto;
  assert.equal(m.version, '0.1.0-alpha.1');
  assert.equal(m.hooks.length, 6, 'expected exactly 6 oto hooks (5 events + statusLine)');

  const v = m.hooks.find((h) => h.command_contains === 'oto-validate-commit.sh');
  assert.equal(
    v.event,
    'PreToolUse',
    'HK-06 / RESEARCH note: validate-commit on PreToolUse not PostToolUse (exit-2 block needs PreToolUse)',
  );
  assert.equal(v.matcher, 'Bash');

  const c = m.hooks.find((h) => h.command_contains === 'oto-context-monitor.js');
  assert.equal(c.event, 'PostToolUse', 'Pitfall A: context-monitor on PostToolUse not Stop');
  assert.equal(c.matcher, 'Bash|Edit|Write|MultiEdit|Agent|Task');

  assert.equal(merged.statusLine.type, 'command');
  assert.match(merged.statusLine.command, /oto-statusline\.js/);
  assert.equal(merged.hooks.SessionStart.length, 1);

  const cmEntry = merged.hooks.PostToolUse.find((e) => e.matcher === 'Bash|Edit|Write|MultiEdit|Agent|Task');
  assert.equal(cmEntry.hooks[0].timeout, 10, 'context-monitor timeout per GSD bin/install.js:6643-6651');
});

test('phase-05 merge-settings: round-trip preserves user content', () => {
  const merged = JSON.parse(mergeSettings(FIX_EXISTING, CTX));
  const original = JSON.parse(FIX_EXISTING);

  assert.equal(merged.model, original.model);
  assert.deepEqual(merged.permissions, original.permissions);

  const userPre = merged.hooks.PreToolUse.find((e) =>
    e.hooks?.[0]?.command === '/Users/julian/.local/bin/user-pretool.sh'
  );
  assert.ok(userPre, 'user-authored PreToolUse entry must survive merge');

  assert.ok(
    merged.hooks.PreToolUse.some((e) => e.matcher === 'Write|Edit'),
    'oto prompt-guard added',
  );
  assert.ok(
    merged.hooks.PreToolUse.some((e) =>
      e.matcher === 'Bash' && e.hooks[0].command.includes('oto-validate-commit.sh')
    ),
    'oto validate-commit added on PreToolUse Bash',
  );
  assert.ok(merged._oto, 'oto marker block added');
});

test('phase-05 merge-settings: idempotent on second call with fixed installedAt', () => {
  const once = mergeSettings(FIX_EMPTY, CTX);
  const twice = mergeSettings(once, CTX);
  assert.equal(twice, once, 'second merge must be byte-identical');

  const onceExisting = mergeSettings(FIX_EXISTING, CTX);
  const twiceExisting = mergeSettings(onceExisting, CTX);
  assert.equal(twiceExisting, onceExisting);
});

test('phase-05 merge-settings: unmerge removes only _oto entries; user content survives', () => {
  const merged = mergeSettings(FIX_EXISTING, CTX);
  const unmerged = unmergeSettings(merged, CTX);
  const actual = JSON.parse(unmerged);
  const expected = JSON.parse(FIX_EXISTING);
  assert.deepEqual(actual, expected, 'D-14: unmerge must restore the pre-merge structure exactly');
});

test('phase-05 merge-settings: every oto-injected entry has Pitfall-E-safe shape (type/command/hooks)', () => {
  const merged = JSON.parse(mergeSettings(FIX_EMPTY, CTX));

  function check(entry) {
    assert.ok(Array.isArray(entry.hooks), 'entry.hooks must be array (Pitfall E)');
    for (const h of entry.hooks) {
      assert.equal(h.type, 'command');
      assert.equal(typeof h.command, 'string');
      assert.ok(h.command.length > 0);
    }
  }

  for (const e of merged.hooks.SessionStart) check(e);
  for (const e of merged.hooks.PreToolUse) check(e);
  for (const e of merged.hooks.PostToolUse) check(e);
  assert.equal(merged.statusLine.type, 'command');
  assert.equal(typeof merged.statusLine.command, 'string');
});
