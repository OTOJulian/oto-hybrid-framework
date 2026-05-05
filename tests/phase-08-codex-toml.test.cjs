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

// HOOKS shape mirrors what bin/lib/runtime-codex.cjs:buildHookEntries emits.
// `type` here is the Codex EVENT name (PreToolUse / SessionStart / PostToolUse),
// which becomes the dotted table key in the emitted Codex 0.125.0+ schema.
const HOOKS = [
  { type: 'SessionStart', command: "bash '/tmp/oto/hooks/oto-session-start'" },
  { type: 'PreToolUse', matcher: 'Bash', command: "bash '/tmp/oto/hooks/oto-validate-commit.sh'", timeout: 5 },
];

test('D-10 mergeHooksBlock injects [[hooks.<Event>]] groups between BEGIN/END OTO HOOKS markers (Codex 0.125.0+ schema)', () => {
  const merged = mergeHooksBlock('model = "gpt-5.3-codex"\n', HOOKS, { otoVersion: 'V' });

  assert.match(merged, /# === BEGIN OTO HOOKS ===/);
  assert.match(merged, /# managed by oto vV/);

  // SessionStart: outer matcher group with no `matcher` line, inner handler block.
  assert.match(merged, /^\[\[hooks\.SessionStart\]\]$/m);
  assert.match(merged, /^\[\[hooks\.SessionStart\.hooks\]\]$/m);

  // PreToolUse: outer group has matcher line, inner handler block follows.
  assert.match(merged, /^\[\[hooks\.PreToolUse\]\]$/m);
  assert.match(merged, /^matcher = "Bash"$/m);
  assert.match(merged, /^\[\[hooks\.PreToolUse\.hooks\]\]$/m);

  // Handler `type` is always literal "command" (Codex hook handler kind), NOT the event name.
  assert.match(merged, /^type = "command"$/m);
  // The OBSOLETE flat-array shape (`type = "PreToolUse"`) must NOT appear.
  assert.equal(/^type = "PreToolUse"$/m.test(merged), false);
  assert.equal(/^type = "SessionStart"$/m.test(merged), false);

  assert.match(merged, /^command = "bash '\/tmp\/oto\/hooks\/oto-validate-commit\.sh'"$/m);
  assert.match(merged, /^timeout = 5$/m);
  assert.match(merged, /# === END OTO HOOKS ===\n$/);

  // SessionStart entry has no matcher → ensure no stray `matcher =` line appears
  // between its outer group header and its inner `.hooks` header.
  const sessionBlock = merged.match(/\[\[hooks\.SessionStart\]\]\n([\s\S]*?)\[\[hooks\.SessionStart\.hooks\]\]/);
  assert.ok(sessionBlock, 'SessionStart outer→inner block should be present');
  assert.equal(/^matcher\s*=/m.test(sessionBlock[1]), false);
});

test('D-10 emitted block does NOT use the obsolete flat [[hooks]] array-of-tables format', () => {
  const merged = mergeHooksBlock('model = "gpt-5.3-codex"\n', HOOKS, { otoVersion: 'V' });
  // Bare `[[hooks]]` (no dotted suffix) is the pre-0.125.0 shape that Codex now rejects.
  assert.equal(/^\[\[hooks\]\]$/m.test(merged), false);
});

test('D-10 idempotent rewrite strips prior oto block before injecting fresh content', () => {
  const once = mergeHooksBlock('model = "gpt-5.3-codex"\n', HOOKS, { otoVersion: 'V' });
  const twice = mergeHooksBlock(once, HOOKS, { otoVersion: 'V' });

  assert.equal(twice, once);
  assert.equal((twice.match(/# === BEGIN OTO HOOKS ===/g) || []).length, 1);
  // One outer matcher group per HOOKS entry.
  assert.equal((twice.match(/^\[\[hooks\.[A-Za-z]+\]\]$/gm) || []).length, HOOKS.length);
  // One inner handler group per HOOKS entry.
  assert.equal((twice.match(/^\[\[hooks\.[A-Za-z]+\.hooks\]\]$/gm) || []).length, HOOKS.length);
});

test('D-10 user content above and below oto marker survives merge and unmerge', () => {
  const user = '[profile]\nname = "local"\n\n[[tools]]\nname = "keep"\n';
  const merged = mergeHooksBlock(user, HOOKS, { otoVersion: 'V' });
  const unmerged = unmergeHooksBlock(merged);

  assert.match(merged, /\[profile\]\nname = "local"/);
  assert.match(merged, /\[\[tools\]\]\nname = "keep"/);
  assert.equal(unmerged, user);
});

test('D-10 unmerge removes only oto-marked entries and preserves non-oto user hooks in current schema', () => {
  // User-authored Codex 0.125.0+ hook entry, outside the OTO marker block.
  const userHook = '[[hooks.PreToolUse]]\nmatcher = "Read"\n[[hooks.PreToolUse.hooks]]\ntype = "command"\ncommand = "echo user"\n';
  const merged = mergeHooksBlock(userHook, HOOKS, { otoVersion: 'V' });
  const unmerged = unmergeHooksBlock(merged);

  assert.equal(unmerged, userHook);
  assert.equal(unmerged.includes('oto-session-start'), false);
});

test('Pitfall 2 guard refuses to merge mixed legacy and obsolete-flat hooks formats outside the oto block', () => {
  // Mixed pre-0.125.0 shapes coexist OUTSIDE any OTO block — unsafe to silently merge.
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
  // The dotted-event header used in Codex 0.125.0+ schema parses as an array table
  // whose `path` carries the full dotted key.
  assert.deepEqual(parseTomlBracketHeader('[[hooks.PreToolUse]]'), {
    type: 'array',
    name: 'hooks.PreToolUse',
    path: 'hooks.PreToolUse',
    array: true,
  });
  assert.deepEqual(parseTomlBracketHeader('[features]'), {
    type: 'table',
    name: 'features',
    path: 'features',
    array: false,
  });
  assert.equal(getTomlLineRecords('x = 1\n[[hooks.PreToolUse]]\n').filter((record) => record.tableHeader).length, 1);
  assert.equal(stripCodexHooksFeatureAssignments('[features]\ncodex_hooks = true\nx = true\n'), '[features]\nx = true\n');
});
