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

test('Claude MCP round-trip restores the original object graph', async (t) => {
  const { configDir, target } = tempConfig(t);
  const original = {
    projects: { '/work/repo': { allowedTools: ['Read', 'Write'] } },
    onboarding: { complete: true },
    numStartups: 8,
    mcpServers: { other: { type: 'http', url: 'https://example.test/mcp' } },
  };
  fs.writeFileSync(target, JSON.stringify(original, null, 4) + '\n');

  const merged = await claudeAdapter.mergeMcp(mergeContext(configDir));
  const result = await claudeAdapter.unmergeMcp({
    configDir: path.join(configDir, 'ignored-settings-dir'),
    env: { CLAUDE_CONFIG_DIR: configDir },
    priorEntry: merged.entry,
  });

  assert.deepEqual(result, { removed: true, skipped: null, target });
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), original);
});

test('Claude MCP drift is reported and the edited entry is left in place', async (t) => {
  const { configDir, target } = tempConfig(t);
  const merged = await claudeAdapter.mergeMcp(mergeContext(configDir));
  const state = JSON.parse(fs.readFileSync(target, 'utf8'));
  state.mcpServers.exa.args = ['/custom/edited-launcher.js'];
  fs.writeFileSync(target, JSON.stringify(state, null, 2));
  const before = fs.readFileSync(target, 'utf8');

  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  let result;
  try {
    result = await claudeAdapter.unmergeMcp({
      env: { CLAUDE_CONFIG_DIR: configDir },
      priorEntry: merged.entry,
    });
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.deepEqual(result, { removed: false, skipped: { reason: 'drifted' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
  assert.equal(writes.join(''), 'oto: exa entry was modified since oto registered it — left in place.\n');
});

test('Claude MCP user-owned unmerge skips a live entry when priorEntry is null', async (t) => {
  const { configDir, target } = tempConfig(t);
  const userEntry = { type: 'http', url: 'https://mcp.exa.ai/mcp' };
  fs.writeFileSync(target, JSON.stringify({ mcpServers: { exa: userEntry } }, null, 2));
  const before = fs.readFileSync(target, 'utf8');

  const originalWrite = process.stderr.write;
  process.stderr.write = () => true;
  let result;
  try {
    result = await claudeAdapter.unmergeMcp({
      env: { CLAUDE_CONFIG_DIR: configDir },
      priorEntry: null,
    });
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.deepEqual(result, { removed: false, skipped: { reason: 'user-owned' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), before);
});

test('Claude MCP double-merge is byte-identical and idempotent', async (t) => {
  const { configDir, target } = tempConfig(t);
  const ctx = mergeContext(configDir);

  const first = await claudeAdapter.mergeMcp(ctx);
  const afterFirst = fs.readFileSync(target, 'utf8');
  const second = await claudeAdapter.mergeMcp({ ...ctx, priorEntry: first.entry });
  const afterSecond = fs.readFileSync(target, 'utf8');

  assert.equal(first.registered, true);
  assert.equal(second.registered, true);
  assert.equal(afterSecond, afterFirst);
});
