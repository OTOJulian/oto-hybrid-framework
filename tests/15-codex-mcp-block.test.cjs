'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  MCP_BEGIN,
  getMcpBlockInner,
  hasExternalMcpServer,
  mergeMcpBlock,
  unmergeMcpBlock,
} = require('../bin/lib/codex-toml.cjs');

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
