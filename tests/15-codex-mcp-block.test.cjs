'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  MCP_BEGIN,
  getMcpBlockInner,
  hasExternalMcpServer,
  mergeMcpBlock,
  unmergeMcpBlock,
} = require('../bin/lib/codex-toml.cjs');
const codexAdapter = require('../bin/lib/runtime-codex.cjs');

const FIX_USER_TOML = `# user comment
model = "gpt-5.3-codex"

[mcp_servers.brave]
command = "brave-mcp"

# === BEGIN OTO HOOKS ===
# managed by oto v0.4.1
[[hooks.SessionStart]]
[[hooks.SessionStart.hooks]]
type = "command"
command = "bash /Users/julian/.codex/hooks/oto-session-start --codex"
# === END OTO HOOKS ===

  
`;

const MCP_CTX = {
  otoVersion: '0.5.0',
  launcherPath: '/Users/julian/.codex/hooks/oto-exa-mcp.js',
};

test('MCP-04 text merge and unmerge preserve all user TOML byte-identically', () => {
  const { text: merged, refused, entry } = mergeMcpBlock(FIX_USER_TOML, MCP_CTX);

  assert.equal(refused, null);
  assert.equal(typeof entry, 'string');
  assert.match(merged, /\[mcp_servers\.brave\]/);
  assert.match(merged, /BEGIN OTO HOOKS/);
  assert.equal(unmergeMcpBlock(merged), FIX_USER_TOML);
});

test('MCP-04 text merge refuses a user-owned exa table without changing input', () => {
  const input = '# mine\n[mcp_servers.exa]\ncommand = "custom-exa"\n';
  const result = mergeMcpBlock(input, MCP_CTX);

  assert.deepEqual(result.refused, { reason: 'user-owned' });
  assert.equal(result.entry, null);
  assert.equal(result.text, input);
});

for (const [name, input] of [
  ['quoted table segment', '[mcp_servers."exa"]\ncommand = "custom-exa"\n'],
  ['quoted parent table segment', '["mcp_servers".exa]\ncommand = "custom-exa"\n'],
  ['fully quoted table path', '["mcp_servers"."exa"]\ncommand = "custom-exa"\n'],
  ['dotted assignment', 'mcp_servers.exa = { command = "custom-exa" }\n'],
  ['quoted dotted assignment', '"mcp_servers"."exa" = { command = "custom-exa" }\n'],
  ['inline table', 'mcp_servers = { exa = { command = "custom-exa" } }\n'],
  ['quoted inline-table key', 'mcp_servers = { "exa" = { command = "custom-exa" } }\n'],
]) {
  test(`CR-01 text merge refuses ${name} without changing input`, () => {
    const result = mergeMcpBlock(input, MCP_CTX);

    assert.deepEqual(result.refused, { reason: 'user-owned' });
    assert.equal(result.entry, null);
    assert.equal(result.text, input);
  });
}

test('CR-01 text merge refuses TOML it cannot confidently parse without changing input', () => {
  const input = '[mcp_servers.exa\ncommand = "custom-exa"\n';
  const result = mergeMcpBlock(input, MCP_CTX);

  assert.deepEqual(result.refused, { reason: 'unparseable' });
  assert.equal(result.entry, null);
  assert.equal(result.text, input);
});

test('MCP-04 text merge is idempotent and emits exactly one marker block', () => {
  const once = mergeMcpBlock(FIX_USER_TOML, MCP_CTX).text;
  const twice = mergeMcpBlock(once, MCP_CTX).text;

  assert.equal((twice.match(/BEGIN OTO MCP/g) || []).length, 1);
  assert.equal(twice, once);
  assert.equal(getMcpBlockInner(twice), mergeMcpBlock(once, MCP_CTX).entry);
});

test('MCP-04 external detection ignores managed exa and detects table or array forms', () => {
  const managed = mergeMcpBlock('', MCP_CTX).text;

  assert.equal(hasExternalMcpServer(managed), false);
  assert.equal(hasExternalMcpServer('[mcp_servers.exa]\ncommand = "mine"\n'), true);
  assert.equal(hasExternalMcpServer('[[mcp_servers.exa]]\ncommand = "mine"\n'), true);
  assert.equal(hasExternalMcpServer('[mcp_servers.brave]\ncommand = "brave"\n'), false);
});

test('MCP-04 launcher path uses JSON string quoting without corrupting TOML lines', () => {
  const launcherPath = 'C:\\Users\\Julian\\"quoted"\\oto-exa-mcp.js';
  const { text } = mergeMcpBlock('', { ...MCP_CTX, launcherPath });

  assert.ok(MCP_BEGIN);
  assert.match(text, new RegExp(`^args = \\[${escapeRegExp(JSON.stringify(launcherPath))}\\]$`, 'm'));
  assert.equal(text.split('\n').filter((line) => line.startsWith('args = ')).length, 1);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('MCP-04 adapter fresh write creates config.toml and returns its fingerprint', async (t) => {
  const configDir = makeTempConfigDir(t);
  const target = path.join(configDir, 'config.toml');
  const result = await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });

  assert.deepEqual(result, {
    registered: true,
    refused: null,
    entry: getMcpBlockInner(fs.readFileSync(target, 'utf8')),
    target,
  });
  assert.equal((fs.readFileSync(target, 'utf8').match(/BEGIN OTO MCP/g) || []).length, 1);
});

test('MCP-04 adapter re-merge is idempotent with exactly one block', async (t) => {
  const configDir = makeTempConfigDir(t);
  await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });
  const once = fs.readFileSync(path.join(configDir, 'config.toml'), 'utf8');
  const result = await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });
  const twice = fs.readFileSync(path.join(configDir, 'config.toml'), 'utf8');

  assert.equal(result.registered, true);
  assert.equal(twice, once);
  assert.equal((twice.match(/BEGIN OTO MCP/g) || []).length, 1);
});

test('MCP-04 adapter fingerprint-matched unmerge restores user content byte-identically', async (t) => {
  const configDir = makeTempConfigDir(t);
  const target = path.join(configDir, 'config.toml');
  fs.writeFileSync(target, FIX_USER_TOML);
  const merged = await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });
  const result = await codexAdapter.unmergeMcp({ configDir, priorEntry: merged.entry });

  assert.deepEqual(result, { removed: true, skipped: null, target });
  assert.equal(fs.readFileSync(target, 'utf8'), FIX_USER_TOML);
});

test('MCP-04 adapter drifted unmerge leaves edited block in place and reports one line', async (t) => {
  const configDir = makeTempConfigDir(t);
  const target = path.join(configDir, 'config.toml');
  const merged = await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });
  const edited = fs.readFileSync(target, 'utf8').replace('command = "node"', 'command = "custom-node"');
  fs.writeFileSync(target, edited);
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };

  let result;
  try {
    result = await codexAdapter.unmergeMcp({ configDir, priorEntry: merged.entry });
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.deepEqual(result, { removed: false, skipped: { reason: 'drifted' }, target });
  assert.equal(fs.readFileSync(target, 'utf8'), edited);
  assert.deepEqual(writes, ['oto: exa entry was modified since oto registered it — left in place.\n']);
});

test('MCP-04 adapter refuses user-owned exa without changing config.toml', async (t) => {
  const configDir = makeTempConfigDir(t);
  const target = path.join(configDir, 'config.toml');
  const input = '# user owned\n[mcp_servers.exa]\ncommand = "custom-exa"\n';
  fs.writeFileSync(target, input);
  const result = await codexAdapter.mergeMcp({ configDir, ...MCP_CTX });

  assert.deepEqual(result, {
    registered: false,
    refused: { reason: 'user-owned' },
    entry: null,
    target,
  });
  assert.equal(fs.readFileSync(target, 'utf8'), input);
});

function makeTempConfigDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-codex-mcp-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
