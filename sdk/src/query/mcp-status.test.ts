import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkExaCoherence,
  classifyExaRegistration,
  resolveRuntimeMcpTarget,
  type RuntimeName,
} from './mcp-status.js';

const roots: string[] = [];
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

const ENV_KEYS: Record<RuntimeName, string> = {
  claude: 'CLAUDE_CONFIG_DIR',
  codex: 'CODEX_HOME',
  gemini: 'GEMINI_CONFIG_DIR',
};

function fixture(runtime: RuntimeName, create = true) {
  const root = mkdtempSync(join(tmpdir(), `oto-sdk-mcp-status-${runtime}-`));
  roots.push(root);
  const configDir = join(root, 'custom');
  if (create) mkdirSync(configDir, { recursive: true });
  return {
    configDir,
    env: { [ENV_KEYS[runtime]]: configDir },
    homeDir: join(root, 'never-read-default-home'),
  };
}

function seedState(configDir: string, entry: unknown) {
  const stateDir = join(configDir, 'oto');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, '.install.json'), JSON.stringify({
    mcp: { exa: { entry, target: '/target', registered_at: 'now' } },
  }));
}

function seedLive(runtime: RuntimeName, target: string, entry: unknown) {
  if (runtime === 'codex') {
    writeFileSync(target, [
      '# === BEGIN OTO MCP ===',
      '# managed by oto v0.5.0',
      String(entry),
      '# === END OTO MCP ===',
      '',
    ].join('\n'));
    return;
  }
  writeFileSync(target, JSON.stringify({ mcpServers: { exa: entry } }, null, 2));
}

describe('SDK MCP status mirror', () => {
  it.each(['claude', 'codex', 'gemini'] as RuntimeName[])(
    '%s honors the runtime environment override',
    (runtime) => {
      const ctx = fixture(runtime);
      expect(resolveRuntimeMcpTarget(runtime, ctx).configDir).toBe(ctx.configDir);
    },
  );

  it('classifies not-installed', () => {
    const ctx = fixture('claude', false);
    expect(classifyExaRegistration('claude', ctx).status).toBe('not-installed');
  });

  it('classifies not-registered', () => {
    const ctx = fixture('gemini');
    expect(classifyExaRegistration('gemini', ctx).status).toBe('not-registered');
  });

  it('classifies oto-managed', () => {
    const ctx = fixture('claude');
    const { target } = resolveRuntimeMcpTarget('claude', ctx);
    const entry = { type: 'stdio', command: 'node', args: ['/launcher'] };
    seedLive('claude', target, entry);
    seedState(ctx.configDir, entry);
    expect(classifyExaRegistration('claude', ctx).status).toBe('oto-managed');
  });

  it('classifies user-owned including an external Codex table', () => {
    const ctx = fixture('codex');
    const { target } = resolveRuntimeMcpTarget('codex', ctx);
    writeFileSync(target, '[mcp_servers.exa]\ncommand = "user-node"\n');
    expect(classifyExaRegistration('codex', ctx).status).toBe('user-owned');
  });

  it('classifies drifted', () => {
    const ctx = fixture('gemini');
    const { target } = resolveRuntimeMcpTarget('gemini', ctx);
    seedLive('gemini', target, { command: 'new-node' });
    seedState(ctx.configDir, { command: 'old-node' });
    expect(classifyExaRegistration('gemini', ctx).status).toBe('drifted');
  });

  it('classifies missing-but-expected', () => {
    const ctx = fixture('codex');
    seedState(ctx.configDir, '[mcp_servers.exa]\ncommand = "node"');
    expect(classifyExaRegistration('codex', ctx).status).toBe('missing-but-expected');
  });

  it('emits both coherence warning forms', () => {
    expect(checkExaCoherence({
      exaSearchEnabled: true,
      keySource: 'env',
      statuses: [{ runtime: 'claude', status: 'not-registered', target: '/x' }],
    })).toEqual([
      'oto: exa_search is enabled but the exa MCP server is not registered in any runtime — run /oto-settings-integrations',
    ]);
    expect(checkExaCoherence({
      exaSearchEnabled: false,
      keySource: null,
      statuses: [{ runtime: 'gemini', status: 'oto-managed', target: '/x' }],
    })).toEqual([
      'oto: exa MCP server is registered but no usable Exa API key was detected — run /oto-settings-integrations',
    ]);
  });
});
