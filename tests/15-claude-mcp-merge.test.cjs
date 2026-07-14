'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const claudeAdapter = require('../bin/lib/runtime-claude.cjs');

function tempConfig(t) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-claude-mcp-'));
  t.after(() => fs.rmSync(configDir, { recursive: true, force: true }));
  return {
    configDir,
    env: { CLAUDE_CONFIG_DIR: configDir },
    target: path.join(configDir, '.claude.json'),
  };
}

function mergeContext(configDir, launcherPath = '/opt/oto/hooks/oto-exa-mcp.js') {
  return {
    configDir: path.join(configDir, 'ignored-settings-dir'),
    env: { CLAUDE_CONFIG_DIR: configDir },
    launcherPath,
    otoVersion: '0.5.0',
    priorEntry: null,
  };
}

test('claudeJsonPath resolves CLAUDE_CONFIG_DIR, home fallback, and tilde values', () => {
  assert.equal(
    claudeAdapter.claudeJsonPath({ CLAUDE_CONFIG_DIR: '/tmp/x' }),
    path.join('/tmp/x', '.claude.json'),
  );
  assert.equal(
    claudeAdapter.claudeJsonPath({}, '/home/u'),
    path.join('/home/u', '.claude.json'),
  );
  assert.equal(
    claudeAdapter.claudeJsonPath({ CLAUDE_CONFIG_DIR: '~/custom' }),
    path.join(os.homedir(), 'custom', '.claude.json'),
  );
});

test('mergeMcp creates strict JSON in the env-resolved .claude.json', async (t) => {
  const { configDir, target } = tempConfig(t);
  const launcherPath = '/opt/oto/hooks/oto-exa-mcp.js';
  const result = await claudeAdapter.mergeMcp(mergeContext(configDir, launcherPath));

  const expectedEntry = { type: 'stdio', command: 'node', args: [launcherPath] };
  assert.deepEqual(result, {
    registered: true,
    refused: null,
    entry: expectedEntry,
    target,
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), {
    mcpServers: { exa: expectedEntry },
  });
});

test('mergeMcp preserves rich Claude state and other MCP servers', async (t) => {
  const { configDir, target } = tempConfig(t);
  const original = {
    projects: { '/work/repo': { allowedTools: ['Read'], history: ['one'] } },
    onboarding: { complete: true, theme: 'dark' },
    numStartups: 42,
    mcpServers: { other: { type: 'http', url: 'https://example.test/mcp' } },
  };
  fs.writeFileSync(target, JSON.stringify(original, null, 2));

  await claudeAdapter.mergeMcp(mergeContext(configDir));
  const actual = JSON.parse(fs.readFileSync(target, 'utf8'));

  const { mcpServers: originalServers, ...originalNonMcp } = original;
  const { mcpServers: actualServers, ...actualNonMcp } = actual;
  assert.deepEqual(actualNonMcp, originalNonMcp);
  assert.deepEqual(actualServers.other, originalServers.other);
  assert.deepEqual(actualServers.exa, {
    type: 'stdio',
    command: 'node',
    args: ['/opt/oto/hooks/oto-exa-mcp.js'],
  });
});

test('mergeMcp refuses a user-owned exa entry without changing file bytes', async (t) => {
  const { configDir, target } = tempConfig(t);
  const before = JSON.stringify({
    projects: { keep: true },
    mcpServers: { exa: { type: 'http', url: 'https://mcp.exa.ai/mcp' } },
  }, null, 4) + '\n';
  fs.writeFileSync(target, before);

  const result = await claudeAdapter.mergeMcp(mergeContext(configDir));

  assert.equal(result.registered, false);
  assert.equal(result.refused.reason, 'user-owned');
  assert.deepEqual(result.refused.existing, {
    type: 'http',
    url: 'https://mcp.exa.ai/mcp',
  });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});

test('mergeMcp refreshes an equal managed entry idempotently', async (t) => {
  const { configDir, target } = tempConfig(t);
  const ctx = mergeContext(configDir);
  const first = await claudeAdapter.mergeMcp(ctx);
  const afterFirst = fs.readFileSync(target, 'utf8');
  const second = await claudeAdapter.mergeMcp({ ...ctx, priorEntry: first.entry });
  const afterSecond = fs.readFileSync(target, 'utf8');

  assert.equal(first.registered, true);
  assert.equal(second.registered, true);
  assert.deepEqual(second.entry, first.entry);
  assert.equal(afterSecond, afterFirst);
  assert.equal(Object.keys(JSON.parse(afterSecond).mcpServers).filter((key) => key === 'exa').length, 1);
});

test('mergeMcp refuses unparseable JSON without changing file bytes', async (t) => {
  const { configDir, target } = tempConfig(t);
  const before = '{ "projects": { broken JSON';
  fs.writeFileSync(target, before);

  const result = await claudeAdapter.mergeMcp(mergeContext(configDir));

  assert.deepEqual(result, {
    registered: false,
    refused: { reason: 'unparseable' },
    entry: null,
    target,
  });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});
