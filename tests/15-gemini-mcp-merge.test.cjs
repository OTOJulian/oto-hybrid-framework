'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const geminiAdapter = require('../bin/lib/runtime-gemini.cjs');

function tempConfig(t) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-gemini-mcp-'));
  t.after(() => fs.rmSync(configDir, { recursive: true, force: true }));
  return {
    configDir,
    target: path.join(configDir, 'settings.json'),
  };
}

function mergeContext(configDir, launcherPath = '/opt/oto/hooks/oto-exa-mcp.js') {
  return {
    configDir,
    env: { GEMINI_CONFIG_DIR: configDir },
    launcherPath,
    otoVersion: '0.5.0',
    priorEntry: null,
  };
}

test('Gemini MCP merge is independent of enableAgents false and writes stdio keys only', async (t) => {
  const { configDir, target } = tempConfig(t);
  const launcherPath = '/opt/oto/hooks/oto-exa-mcp.js';
  fs.writeFileSync(target, JSON.stringify({ experimental: { enableAgents: false } }, null, 2));

  const result = await geminiAdapter.mergeMcp(mergeContext(configDir, launcherPath));
  const text = fs.readFileSync(target, 'utf8');
  const settings = JSON.parse(text);

  assert.deepEqual(result, {
    registered: true,
    refused: null,
    entry: { command: 'node', args: [launcherPath] },
    target,
  });
  assert.equal(settings.experimental.enableAgents, false);
  assert.deepEqual(Object.keys(settings.mcpServers.exa).sort(), ['args', 'command']);
  assert.equal(text.includes('"url"'), false);
  assert.equal(text.includes('"httpUrl"'), false);
});

test('Gemini MCP merge creates an absent settings file with only mcpServers.exa', async (t) => {
  const { configDir, target } = tempConfig(t);
  const launcherPath = '/opt/oto/hooks/oto-exa-mcp.js';

  await geminiAdapter.mergeMcp(mergeContext(configDir, launcherPath));

  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), {
    mcpServers: {
      exa: { command: 'node', args: [launcherPath] },
    },
  });
});

test('Gemini MCP merge preserves user settings and other MCP servers', async (t) => {
  const { configDir, target } = tempConfig(t);
  const original = {
    theme: 'dark',
    hooks: { BeforeTool: [{ matcher: 'write_file', hooks: [{ command: '/user/hook' }] }] },
    mcpServers: { other: { httpUrl: 'https://example.test/mcp' } },
  };
  fs.writeFileSync(target, JSON.stringify(original, null, 2));

  await geminiAdapter.mergeMcp(mergeContext(configDir));
  const actual = JSON.parse(fs.readFileSync(target, 'utf8'));

  assert.equal(actual.theme, original.theme);
  assert.deepEqual(actual.hooks, original.hooks);
  assert.deepEqual(actual.mcpServers.other, original.mcpServers.other);
  assert.deepEqual(actual.mcpServers.exa, {
    command: 'node',
    args: ['/opt/oto/hooks/oto-exa-mcp.js'],
  });
});

test('Gemini MCP user-owned exa is refused without changing file bytes', async (t) => {
  const { configDir, target } = tempConfig(t);
  const existing = { command: 'custom-exa', args: ['--serve'] };
  const before = JSON.stringify({ theme: 'dark', mcpServers: { exa: existing } }, null, 4) + '\n';
  fs.writeFileSync(target, before);

  const result = await geminiAdapter.mergeMcp(mergeContext(configDir));

  assert.deepEqual(result, {
    registered: false,
    refused: { reason: 'user-owned', existing },
    entry: null,
    target,
  });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});

test('Gemini MCP merge is idempotent when the managed entry already exists', async (t) => {
  const { configDir, target } = tempConfig(t);
  const ctx = mergeContext(configDir);

  const first = await geminiAdapter.mergeMcp(ctx);
  const afterFirst = fs.readFileSync(target, 'utf8');
  const second = await geminiAdapter.mergeMcp({ ...ctx, priorEntry: first.entry });

  assert.equal(first.registered, true);
  assert.equal(second.registered, true);
  assert.deepEqual(second.entry, first.entry);
  assert.equal(fs.readFileSync(target, 'utf8'), afterFirst);
});

test('Gemini MCP round-trip restores the original object graph', async (t) => {
  const { configDir, target } = tempConfig(t);
  const original = {
    theme: 'dark',
    experimental: { enableAgents: false },
    mcpServers: { other: { command: 'other-server', args: [] } },
  };
  fs.writeFileSync(target, JSON.stringify(original, null, 4) + '\n');

  const merged = await geminiAdapter.mergeMcp(mergeContext(configDir));
  const result = await geminiAdapter.unmergeMcp({
    configDir,
    env: { GEMINI_CONFIG_DIR: configDir },
    priorEntry: merged.entry,
  });

  assert.deepEqual(result, { removed: true, skipped: null, target });
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), original);
});

test('Gemini MCP drift is reported and the edited entry is left in place', async (t) => {
  const { configDir, target } = tempConfig(t);
  const merged = await geminiAdapter.mergeMcp(mergeContext(configDir));
  const settings = JSON.parse(fs.readFileSync(target, 'utf8'));
  settings.mcpServers.exa.args = ['/custom/edited-launcher.js'];
  fs.writeFileSync(target, JSON.stringify(settings, null, 2));
  const before = fs.readFileSync(target, 'utf8');

  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  let result;
  try {
    result = await geminiAdapter.unmergeMcp({ configDir, priorEntry: merged.entry });
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.deepEqual(result, { removed: false, skipped: { reason: 'drifted' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
  assert.equal(writes.join(''), 'oto: exa entry was modified since oto registered it — left in place.\n');
});

test('Gemini MCP user-owned unmerge skips when priorEntry is null', async (t) => {
  const { configDir, target } = tempConfig(t);
  const before = JSON.stringify({ mcpServers: { exa: { command: 'custom-exa' } } }, null, 2);
  fs.writeFileSync(target, before);

  const originalWrite = process.stderr.write;
  process.stderr.write = () => true;
  let result;
  try {
    result = await geminiAdapter.unmergeMcp({ configDir, priorEntry: null });
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.deepEqual(result, { removed: false, skipped: { reason: 'user-owned' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});

test('Gemini MCP unmerge reports absent without creating settings', async (t) => {
  const { configDir, target } = tempConfig(t);

  const result = await geminiAdapter.unmergeMcp({
    configDir,
    priorEntry: { command: 'node', args: ['/opt/oto/hooks/oto-exa-mcp.js'] },
  });

  assert.deepEqual(result, { removed: false, skipped: { reason: 'absent' }, target });
  assert.equal(fs.existsSync(target), false);
});
