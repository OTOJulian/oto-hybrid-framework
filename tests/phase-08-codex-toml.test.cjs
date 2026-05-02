'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  getTomlLineRecords,
  mergeHooksBlock,
  parseTomlBracketHeader,
  stripCodexHooksFeatureAssignments,
  unmergeHooksBlock,
} = require('../bin/lib/codex-toml.cjs');

const HOOKS = [
  { type: 'SessionStart', command: "bash '/tmp/oto/hooks/oto-session-start'" },
  { type: 'PreToolUse', matcher: 'Bash', command: "bash '/tmp/oto/hooks/oto-validate-commit.sh'", timeout: 5 },
];

test('D-10 mergeHooksBlock injects [[hooks]] array between BEGIN/END OTO HOOKS markers', () => {
  const merged = mergeHooksBlock('model = "gpt-5.3-codex"\n', HOOKS, { otoVersion: 'V' });

  assert.match(merged, /# === BEGIN OTO HOOKS ===/);
  assert.match(merged, /# managed by oto vV/);
  assert.match(merged, /\[\[hooks\]\]/);
  assert.match(merged, /^type = "PreToolUse"$/m);
  assert.match(merged, /^matcher = "Bash"$/m);
  assert.match(merged, /^timeout = 5$/m);
  assert.match(merged, /# === END OTO HOOKS ===\n$/);
});

test('D-10 idempotent rewrite strips prior oto block before injecting fresh content', () => {
  const once = mergeHooksBlock('model = "gpt-5.3-codex"\n', HOOKS, { otoVersion: 'V' });
  const twice = mergeHooksBlock(once, HOOKS, { otoVersion: 'V' });

  assert.equal(twice, once);
  assert.equal((twice.match(/# === BEGIN OTO HOOKS ===/g) || []).length, 1);
  assert.equal((twice.match(/\[\[hooks\]\]/g) || []).length, HOOKS.length);
});

test('D-10 user content above and below oto marker survives merge and unmerge', () => {
  const user = '[profile]\nname = "local"\n\n[[tools]]\nname = "keep"\n';
  const merged = mergeHooksBlock(user, HOOKS, { otoVersion: 'V' });
  const unmerged = unmergeHooksBlock(merged);

  assert.match(merged, /\[profile\]\nname = "local"/);
  assert.match(merged, /\[\[tools\]\]\nname = "keep"/);
  assert.equal(unmerged, user);
});

test('D-10 unmerge removes only oto-marked entries and preserves non-oto [[hooks]] entries', () => {
  const userHook = '[[hooks]]\ntype = "UserHook"\ncommand = "echo user"\n';
  const merged = mergeHooksBlock(userHook, HOOKS, { otoVersion: 'V' });
  const unmerged = unmergeHooksBlock(merged);

  assert.equal(unmerged, userHook);
  assert.equal(unmerged.includes('oto-session-start'), false);
});

test('Pitfall 2 guard refuses to merge mixed legacy and modern hooks formats', () => {
  const mixed = '[hooks.shell]\ncommand = "legacy"\n\n[[hooks]]\ntype = "modern"\ncommand = "ok"\n';
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk, ...args) => {
    writes.push(String(chunk));
    return originalWrite.call(process.stderr, chunk, ...args);
  };

  try {
    assert.equal(mergeHooksBlock(mixed, HOOKS, { otoVersion: 'V' }), mixed);
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.match(writes.join(''), /refusing to merge Codex hooks/);
});

test('D-10 TOML line helpers classify bracket headers and strip owned feature flags', () => {
  assert.deepEqual(parseTomlBracketHeader('[[hooks]]'), {
    type: 'array',
    name: 'hooks',
    path: 'hooks',
    array: true,
  });
  assert.deepEqual(parseTomlBracketHeader('[features]'), {
    type: 'table',
    name: 'features',
    path: 'features',
    array: false,
  });
  assert.equal(getTomlLineRecords('x = 1\n[[hooks]]\n').filter((record) => record.tableHeader).length, 1);
  assert.equal(stripCodexHooksFeatureAssignments('[features]\ncodex_hooks = true\nx = true\n'), '[features]\nx = true\n');
});
