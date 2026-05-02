'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../bin/lib/runtime-gemini.cjs');

const ctx = { configDir: '/tmp/gemini', otoVersion: '0.1.0-alpha.1', installedAt: 'fixed' };

test('D-16 mergeSettings: PreToolUse becomes BeforeTool and PostToolUse becomes AfterTool', () => {
  const out = JSON.parse(adapter.mergeSettings('', ctx));
  assert.ok(out.hooks.BeforeTool);
  assert.ok(out.hooks.AfterTool);
  assert.equal(out.hooks.PreToolUse, undefined);
  assert.equal(out.hooks.PostToolUse, undefined);
});

test('D-16 mergeSettings: matchers run through convertGeminiToolName', () => {
  const out = JSON.parse(adapter.mergeSettings('', ctx));
  const hooks = JSON.stringify(out.hooks);
  assert.match(hooks, /run_shell_command/);
  assert.match(hooks, /write_file\|replace/);
  assert.equal(hooks.includes('"matcher":"Bash"'), false);
  assert.equal(hooks.includes('"matcher":"Write|Edit"'), false);
});

test('D-16 experimental.enableAgents = true written when missing', () => {
  const out = JSON.parse(adapter.mergeSettings('{}', ctx));
  assert.equal(out.experimental.enableAgents, true);
});

test('D-16 explicit experimental.enableAgents=false is honored with warning and skip marker', () => {
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk, ...args) => {
    writes.push(String(chunk));
    return originalWrite.call(process.stderr, chunk, ...args);
  };

  try {
    const out = JSON.parse(adapter.mergeSettings(JSON.stringify({ experimental: { enableAgents: false } }), ctx));
    assert.equal(out.experimental.enableAgents, false);
    assert.equal(out.hooks, undefined);
    assert.equal(out._oto.skipped_due_to_disabled_agents, true);
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.match(writes.join(''), /enableAgents/);
});

test('D-16 statusLine field is not written for Gemini', () => {
  const out = JSON.parse(adapter.mergeSettings('', ctx));
  assert.equal(out.statusLine, undefined);
});

test('D-16 merge/unmerge is idempotent and preserves user hooks', () => {
  const existing = JSON.stringify({
    hooks: {
      BeforeTool: [{ matcher: 'user_tool', hooks: [{ type: 'command', command: 'echo user' }] }],
    },
  });
  const merged = adapter.mergeSettings(existing, ctx);
  const mergedAgain = adapter.mergeSettings(merged, ctx);
  assert.equal(mergedAgain, merged);

  const unmerged = JSON.parse(adapter.unmergeSettings(merged, ctx));
  assert.equal(unmerged._oto, undefined);
  assert.deepEqual(unmerged.hooks.BeforeTool, [{ matcher: 'user_tool', hooks: [{ type: 'command', command: 'echo user' }] }]);
});
