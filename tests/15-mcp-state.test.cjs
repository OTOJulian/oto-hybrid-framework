'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateState } = require('../bin/lib/install-state.cjs');

function validState(mcp) {
  return {
    version: 1,
    oto_version: '0.5.0',
    installed_at: '2026-07-14T00:00:00.000Z',
    runtime: 'claude',
    config_dir: '/tmp/oto-test',
    files: [],
    instruction_file: { path: 'CLAUDE.md' },
    ...(mcp === undefined ? {} : { mcp }),
  };
}

test('validateState accepts Claude-shaped MCP state', () => {
  const errors = validateState(validState({
    exa: {
      target: '/tmp/.claude.json',
      registered_at: '2026-07-14T00:00:00.000Z',
      entry: { type: 'stdio', command: 'node', args: ['/tmp/hooks/oto-exa-mcp.js'] },
    },
  }));
  assert.deepEqual(errors, []);
});

test('validateState accepts Codex string-entry MCP state', () => {
  const errors = validateState(validState({
    exa: {
      target: '/tmp/config.toml',
      registered_at: '2026-07-14T00:00:00.000Z',
      entry: '[mcp_servers.exa]\ncommand = "node"',
    },
  }));
  assert.deepEqual(errors, []);
});

for (const [name, mcp] of [
  ['non-object mcp', 'nope'],
  ['missing target', { exa: { registered_at: 'now', entry: {} } }],
  ['null entry', { exa: { target: '/tmp/config', registered_at: 'now', entry: null } }],
]) {
  test(`validateState rejects ${name}`, () => {
    const errors = validateState(validState(mcp));
    assert.ok(errors.some((error) => error.includes('mcp')), errors.join('; '));
  });
}
