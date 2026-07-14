'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const claude = require('../bin/lib/runtime-claude.cjs');
const codex = require('../bin/lib/runtime-codex.cjs');
const gemini = require('../bin/lib/runtime-gemini.cjs');
const { writeState } = require('../bin/lib/install-state.cjs');
const {
  classifyExaRegistration,
  checkExaCoherence,
  resolveRuntimeMcpTarget,
} = require('../bin/lib/mcp-register.cjs');

const ADAPTERS = { claude, codex, gemini };
const ENV_KEYS = {
  claude: 'CLAUDE_CONFIG_DIR',
  codex: 'CODEX_HOME',
  gemini: 'GEMINI_CONFIG_DIR',
};

function fixture(t, runtime, { create = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `oto-mcp-status-${runtime}-`));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configDir = path.join(root, 'custom-config');
  if (create) fs.mkdirSync(configDir, { recursive: true });
  const env = { [ENV_KEYS[runtime]]: configDir };
  return { root, configDir, env, homeDir: path.join(root, 'nonexistent-default-home') };
}

async function seedLive(runtime, ctx) {
  const adapter = ADAPTERS[runtime];
  const launcherPath = path.join(ctx.configDir, 'hooks', 'oto-exa-mcp.js');
  const result = await adapter.mergeMcp({
    configDir: ctx.configDir,
    env: ctx.env,
    launcherPath,
    otoVersion: '0.5.0',
  });
  assert.equal(result.registered, true);
  return result;
}

function seedState(runtime, ctx, entry, target) {
  const instruction = runtime === 'claude' ? 'CLAUDE.md' : runtime === 'codex' ? 'AGENTS.md' : 'GEMINI.md';
  writeState(path.join(ctx.configDir, 'oto', '.install.json'), {
    version: 1,
    oto_version: '0.5.0',
    installed_at: '2026-07-14T00:00:00.000Z',
    runtime,
    config_dir: ctx.configDir,
    files: [],
    instruction_file: { path: instruction },
    mcp: {
      exa: {
        target,
        registered_at: '2026-07-14T00:00:00.000Z',
        entry,
      },
    },
  });
}

function removeLive(runtime, target) {
  if (runtime === 'codex') {
    fs.writeFileSync(target, '');
    return;
  }
  fs.writeFileSync(target, JSON.stringify({ mcpServers: {} }, null, 2));
}

for (const runtime of Object.keys(ADAPTERS)) {
  test(`${runtime} resolves the environment override without reading the default home`, (t) => {
    const ctx = fixture(t, runtime);
    const resolved = resolveRuntimeMcpTarget(runtime, ctx);
    assert.equal(resolved.configDir, ctx.configDir);
    assert.equal(resolved.target, path.join(
      ctx.configDir,
      runtime === 'claude' ? '.claude.json' : runtime === 'codex' ? 'config.toml' : 'settings.json',
    ));
  });

  test(`${runtime} classifies an absent config directory as not-installed`, (t) => {
    const ctx = fixture(t, runtime, { create: false });
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'not-installed');
  });

  test(`${runtime} classifies an empty installed config directory as not-registered`, (t) => {
    const ctx = fixture(t, runtime);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'not-registered');
  });

  test(`${runtime} classifies a matching live entry and fingerprint as oto-managed`, async (t) => {
    const ctx = fixture(t, runtime);
    const live = await seedLive(runtime, ctx);
    seedState(runtime, ctx, live.entry, live.target);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'oto-managed');
  });

  test(`${runtime} classifies a changed live entry as drifted`, async (t) => {
    const ctx = fixture(t, runtime);
    const live = await seedLive(runtime, ctx);
    seedState(runtime, ctx, runtime === 'codex' ? `${live.entry}\n# old` : { ...live.entry, command: 'old-node' }, live.target);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'drifted');
  });

  test(`${runtime} classifies a live entry without a fingerprint as user-owned`, async (t) => {
    const ctx = fixture(t, runtime);
    await seedLive(runtime, ctx);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'user-owned');
  });

  test(`${runtime} classifies a missing live entry with a fingerprint as missing-but-expected`, async (t) => {
    const ctx = fixture(t, runtime);
    const live = await seedLive(runtime, ctx);
    seedState(runtime, ctx, live.entry, live.target);
    removeLive(runtime, live.target);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'missing-but-expected');
  });

  test(`${runtime} tolerates malformed live configuration`, (t) => {
    const ctx = fixture(t, runtime);
    const { target } = resolveRuntimeMcpTarget(runtime, ctx);
    fs.writeFileSync(target, runtime === 'codex' ? '[mcp_servers.exa' : '{ broken');
    const result = classifyExaRegistration(runtime, ctx);
    assert.equal(result.status, 'not-registered');
    if (runtime !== 'codex') assert.equal(result.detail, 'unparseable');
  });
}

test('codex external exa table wins as user-owned even alongside an oto block', async (t) => {
  const ctx = fixture(t, 'codex');
  const live = await seedLive('codex', ctx);
  seedState('codex', ctx, live.entry, live.target);
  fs.appendFileSync(live.target, '\n[mcp_servers.exa]\ncommand = "user-node"\n');
  assert.equal(classifyExaRegistration('codex', ctx).status, 'user-owned');
});

test('coherence warns when exa_search is enabled but no runtime is registered', () => {
  assert.deepEqual(checkExaCoherence({
    exaSearchEnabled: true,
    keySource: 'env',
    statuses: [{ status: 'not-installed' }, { status: 'not-registered' }],
  }), ['oto: exa_search is enabled but the exa MCP server is not registered in any runtime — run /oto-settings-integrations']);
});

test('coherence warns when an oto-owned registration has no usable key', () => {
  assert.deepEqual(checkExaCoherence({
    exaSearchEnabled: false,
    keySource: null,
    statuses: [{ status: 'oto-managed' }],
  }), ['oto: exa MCP server is registered but no usable Exa API key was detected — run /oto-settings-integrations']);
});

test('coherence is quiet for a usable registered configuration', () => {
  assert.deepEqual(checkExaCoherence({
    exaSearchEnabled: true,
    keySource: 'keyfile',
    statuses: [{ status: 'drifted' }],
  }), []);
});

test('invalid install state never establishes oto ownership (WR-01 pin)', async (t) => {
  for (const runtime of Object.keys(ADAPTERS)) {
    const ctx = fixture(t, runtime);
    const live = await seedLive(runtime, ctx);
    const stateDir = path.join(ctx.configDir, 'oto');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, '.install.json'), JSON.stringify({
      mcp: {
        exa: {
          entry: live.entry,
          target: live.target,
          registered_at: 'now',
        },
      },
    }));

    assert.equal(classifyExaRegistration(runtime, ctx).status, 'user-owned');
    removeLive(runtime, live.target);
    assert.equal(classifyExaRegistration(runtime, ctx).status, 'not-registered');
  }
});
