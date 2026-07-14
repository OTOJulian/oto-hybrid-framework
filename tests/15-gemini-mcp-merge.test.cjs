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

  const withExa = '{\n  "note": "literal /* keep */ text",\n  // force JSONC fallback\n  "mcpServers": { "exa": { "command": "node", "args": ["/x"] } }\n}\n';
  fs.writeFileSync(target, withExa);
  const unmerge = await geminiAdapter.unmergeMcp({
    configDir,
    priorEntry: { command: 'node', args: ['/x'] },
  });
  assert.deepEqual(unmerge, { removed: false, skipped: { reason: 'absent' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), withExa);
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

test('Gemini mergeSettings and MCP hooks coexist and restore user content', async (t) => {
  const { configDir, target } = tempConfig(t);
  const original = {
    theme: 'dark',
    experimental: { enableAgents: true },
    hooks: {
      BeforeTool: [{ matcher: 'user_tool', hooks: [{ type: 'command', command: 'echo user' }] }],
    },
    mcpServers: {
      other: { command: 'other-server', args: ['--stdio'] },
    },
  };
  const settingsCtx = {
    configDir,
    otoVersion: '0.5.0',
    installedAt: '2026-07-14T00:00:00.000Z',
  };
  fs.writeFileSync(target, geminiAdapter.mergeSettings(JSON.stringify(original), settingsCtx));

  const mcp = await geminiAdapter.mergeMcp(mergeContext(configDir));
  const coexist = JSON.parse(fs.readFileSync(target, 'utf8'));

  assert.ok(coexist._oto.hooks.length > 0);
  assert.ok(coexist.hooks.SessionStart.length > 0);
  assert.ok(coexist.hooks.BeforeTool.some((entry) => entry.matcher === 'user_tool'));
  assert.ok(coexist.hooks.BeforeTool.some((entry) => entry.matcher === 'write_file|replace'));
  assert.deepEqual(coexist.mcpServers.exa, mcp.entry);
  assert.deepEqual(coexist.mcpServers.other, original.mcpServers.other);

  await geminiAdapter.unmergeMcp({ configDir, priorEntry: mcp.entry });
  const restoredText = geminiAdapter.unmergeSettings(fs.readFileSync(target, 'utf8'), settingsCtx);

  assert.deepEqual(JSON.parse(restoredText), original);
});

const INCOMPATIBLE_FIXTURES = [
  { name: 'array container', text: '{"mcpServers":["user-entry"],"keep":true}' },
  { name: 'string container', text: '{"mcpServers":"user-entry","keep":true}' },
  { name: 'null container', text: '{"mcpServers":null,"keep":true}' },
  { name: 'null root', text: 'null' },
  { name: 'array root', text: '[]' },
  { name: 'primitive root', text: '42' },
  { name: 'string root', text: '"user-text"' },
];

for (const fixture of INCOMPATIBLE_FIXTURES) {
  test(`Gemini MCP refuses incompatible ${fixture.name} without changing bytes`, async (t) => {
    const { configDir, target } = tempConfig(t);
    fs.writeFileSync(target, fixture.text);

    const result = await geminiAdapter.mergeMcp(mergeContext(configDir));

    assert.deepEqual(result, {
      registered: false,
      refused: { reason: 'incompatible-shape' },
      entry: null,
      target,
    });
    assert.equal(fs.readFileSync(target, 'utf8'), fixture.text);
  });

  test(`Gemini MCP unmerge skips incompatible ${fixture.name} without changing bytes`, async (t) => {
    const { configDir, target } = tempConfig(t);
    fs.writeFileSync(target, fixture.text);

    const result = await geminiAdapter.unmergeMcp({
      configDir,
      priorEntry: { command: 'node', args: ['/x'] },
    });

    assert.deepEqual(result, { removed: false, skipped: { reason: 'absent' }, target });
    assert.equal(fs.readFileSync(target, 'utf8'), fixture.text);
  });
}

test('Gemini MCP refuses unparseable settings and unmerge skips without changing bytes', async (t) => {
  const { configDir, target } = tempConfig(t);
  const before = '{ not json';
  fs.writeFileSync(target, before);

  const mergeResult = await geminiAdapter.mergeMcp(mergeContext(configDir));
  assert.deepEqual(mergeResult, {
    registered: false,
    refused: { reason: 'unparseable' },
    entry: null,
    target,
  });
  assert.equal(fs.readFileSync(target, 'utf8'), before);

  const unmergeResult = await geminiAdapter.unmergeMcp({
    configDir,
    priorEntry: { command: 'node', args: ['/x'] },
  });
  assert.deepEqual(unmergeResult, { removed: false, skipped: { reason: 'absent' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});

test('CR-02 Gemini settings and MCP paths refuse ambiguous block comments before writing', async (t) => {
  const { configDir, target } = tempConfig(t);
  const before = '{\n  "note": "literal /* keep */ text",\n  // force JSONC fallback\n  "theme": "dark"\n}\n';
  fs.writeFileSync(target, before);

  assert.throws(
    () => geminiAdapter.mergeSettings(before, { configDir, otoVersion: '0.5.0' }),
    /ambiguous block comment/,
  );
  assert.throws(
    () => geminiAdapter.unmergeSettings(before, { configDir, otoVersion: '0.5.0' }),
    /ambiguous block comment/,
  );

  const result = await geminiAdapter.mergeMcp(mergeContext(configDir));
  assert.deepEqual(result, {
    registered: false,
    refused: { reason: 'unparseable' },
    entry: null,
    target,
  });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});
