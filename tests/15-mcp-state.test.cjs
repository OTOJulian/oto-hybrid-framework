'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getMcpBlockInner } = require('../bin/lib/codex-toml.cjs');
const { installRuntime, uninstallRuntime } = require('../bin/lib/install.cjs');
const { readState, validateState } = require('../bin/lib/install-state.cjs');
const claudeAdapter = require('../bin/lib/runtime-claude.cjs');
const codexAdapter = require('../bin/lib/runtime-codex.cjs');
const geminiAdapter = require('../bin/lib/runtime-gemini.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const ADAPTERS = [claudeAdapter, codexAdapter, geminiAdapter];

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

function tempRuntime(t, adapter) {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), `oto-mcp-state-${adapter.name}-`));
  t.after(() => fs.rmSync(configDir, { recursive: true, force: true }));
  const env = adapter.name === 'claude' ? { CLAUDE_CONFIG_DIR: configDir } : {};
  return {
    configDir,
    env,
    opts: {
      flags: { configDir, runtimes: [adapter.name] },
      repoRoot: REPO_ROOT,
      env,
    },
  };
}

function targetPath(adapter, configDir) {
  if (adapter.name === 'claude') return path.join(configDir, '.claude.json');
  return path.join(configDir, adapter.settingsFilename);
}

function liveEntry(adapter, configDir) {
  const target = targetPath(adapter, configDir);
  const text = fs.readFileSync(target, 'utf8');
  if (adapter.name === 'codex') return getMcpBlockInner(text);
  return JSON.parse(text).mcpServers?.exa;
}

function editLiveEntry(adapter, configDir) {
  const target = targetPath(adapter, configDir);
  if (adapter.name === 'codex') {
    const text = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target, text.replace('command = "node"', 'command = "user-edited-node"'));
    return;
  }
  const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
  parsed.mcpServers.exa.command = 'user-edited-node';
  fs.writeFileSync(target, JSON.stringify(parsed, null, 2) + '\n');
}

function seedUserOwnedEntry(adapter, configDir) {
  const target = targetPath(adapter, configDir);
  const entry = adapter.name === 'codex'
    ? '[mcp_servers.exa]\ncommand = "user-exa"\nargs = ["--mine"]\n'
    : { command: 'user-exa', args: ['--mine'] };
  if (adapter.name === 'codex') {
    fs.writeFileSync(target, `# user config\n${entry}`);
  } else {
    fs.writeFileSync(target, JSON.stringify({ mcpServers: { exa: entry } }, null, 2) + '\n');
  }
  return entry;
}

for (const adapter of ADAPTERS) {
  test(`${adapter.name} lifecycle is idempotent and uninstall removes the fingerprinted entry`, async (t) => {
    const { configDir, opts } = tempRuntime(t, adapter);
    const registerOpts = { ...opts, exaMcp: 'register' };

    await installRuntime(adapter, registerOpts);
    const statePath = path.join(configDir, 'oto', '.install.json');
    const firstState = readState(statePath);
    assert.ok(firstState.mcp?.exa?.target);
    assert.ok(firstState.mcp.exa.entry);
    assert.deepEqual(validateState(firstState), []);
    assert.ok(liveEntry(adapter, configDir));
    assert.equal(fs.existsSync(path.join(configDir, 'hooks', 'oto-exa-mcp.js')), true);

    await installRuntime(adapter, registerOpts);
    const secondState = readState(statePath);
    assert.deepEqual(validateState(secondState), []);
    if (adapter.name === 'codex') {
      const target = fs.readFileSync(targetPath(adapter, configDir), 'utf8');
      assert.equal((target.match(/BEGIN OTO MCP/g) || []).length, 1);
    } else {
      const target = JSON.parse(fs.readFileSync(targetPath(adapter, configDir), 'utf8'));
      assert.equal(Object.keys(target.mcpServers).filter((name) => name === 'exa').length, 1);
    }

    await uninstallRuntime(adapter, opts);
    assert.equal(liveEntry(adapter, configDir), adapter.name === 'codex' ? null : undefined);
    assert.equal(fs.existsSync(path.join(configDir, 'hooks', 'oto-exa-mcp.js')), false);
  });

  test(`${adapter.name} lifecycle drift is left in place and reported as modified`, async (t) => {
    const { configDir, opts } = tempRuntime(t, adapter);
    await installRuntime(adapter, { ...opts, exaMcp: 'register' });
    editLiveEntry(adapter, configDir);
    const editedEntry = liveEntry(adapter, configDir);
    const output = [];
    const originalLog = console.log;
    const originalWrite = process.stderr.write;
    console.log = (...args) => output.push(args.join(' '));
    process.stderr.write = (chunk) => {
      output.push(String(chunk));
      return true;
    };
    try {
      await uninstallRuntime(adapter, opts);
    } finally {
      console.log = originalLog;
      process.stderr.write = originalWrite;
    }
    assert.deepEqual(liveEntry(adapter, configDir), editedEntry);
    assert.match(output.join('\n'), /modified since oto registered it/);
  });

  test(`${adapter.name} lifecycle refuses a user-owned entry without recording MCP state`, async (t) => {
    const { configDir, opts } = tempRuntime(t, adapter);
    const userEntry = seedUserOwnedEntry(adapter, configDir);
    await installRuntime(adapter, { ...opts, exaMcp: 'register' });
    const state = readState(path.join(configDir, 'oto', '.install.json'));
    assert.equal(state.mcp, undefined);
    if (adapter.name === 'codex') {
      assert.ok(fs.readFileSync(targetPath(adapter, configDir), 'utf8').includes(userEntry));
    } else {
      assert.deepEqual(liveEntry(adapter, configDir), userEntry);
    }
  });

  test(`${adapter.name} lifecycle carries forward MCP state on plain reinstall`, async (t) => {
    const { configDir, opts } = tempRuntime(t, adapter);
    const statePath = path.join(configDir, 'oto', '.install.json');
    await installRuntime(adapter, { ...opts, exaMcp: 'register' });
    const registered = readState(statePath).mcp.exa;
    await installRuntime(adapter, opts);
    assert.deepEqual(readState(statePath).mcp.exa, registered);
  });
}

const CLAUDE_INCOMPATIBLE_LIFECYCLE_FIXTURES = [
  { name: 'array-container', text: '{"mcpServers":["user-entry"],"keep":true}' },
  { name: 'string-container', text: '{"mcpServers":"user-entry","keep":true}' },
  { name: 'null-root', text: 'null' },
  { name: 'array-root', text: '[]' },
  { name: 'primitive-root', text: '42' },
];

const GEMINI_TOLERATED_LIFECYCLE_FIXTURES = [
  { name: 'array-container', text: '{"mcpServers":["user-entry"],"keep":true}' },
  { name: 'string-container', text: '{"mcpServers":"user-entry","keep":true}' },
  { name: 'array-root', text: '[]' },
];

const GEMINI_THROWING_ROOT_FIXTURES = [
  { name: 'null-root', text: 'null' },
  { name: 'primitive-root', text: '42' },
];

for (const fixture of CLAUDE_INCOMPATIBLE_LIFECYCLE_FIXTURES) {
  test(`claude lifecycle refuses ${fixture.name} without recording MCP state or touching bytes`, async (t) => {
    const { configDir, opts } = tempRuntime(t, claudeAdapter);
    const target = targetPath(claudeAdapter, configDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fixture.text);
    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));
    try {
      await installRuntime(claudeAdapter, { ...opts, exaMcp: 'register' });
    } finally {
      console.log = originalLog;
    }

    const state = readState(path.join(configDir, 'oto', '.install.json'));
    assert.equal(state.mcp, undefined);
    assert.deepEqual(validateState(state), []);
    assert.equal(fs.readFileSync(target, 'utf8'), fixture.text);
    assert.match(output.join('\n'), /exa MCP registration skipped/);
  });
}

// Byte-identity is asserted at adapter level (Task 1); at lifecycle level mergeSettings legitimately rewrites settings.json first (outside CR-01), so the contract here is semantic preservation + refusal + no fingerprint.
for (const fixture of GEMINI_TOLERATED_LIFECYCLE_FIXTURES) {
  test(`gemini lifecycle refuses ${fixture.name} semantically without recording MCP state`, async (t) => {
    const { configDir, opts } = tempRuntime(t, geminiAdapter);
    const target = targetPath(geminiAdapter, configDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fixture.text);
    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));
    try {
      await installRuntime(geminiAdapter, { ...opts, exaMcp: 'register' });
    } finally {
      console.log = originalLog;
    }

    const state = readState(path.join(configDir, 'oto', '.install.json'));
    assert.equal(state.mcp, undefined);
    assert.deepEqual(validateState(state), []);
    const text = fs.readFileSync(target, 'utf8');
    const settings = JSON.parse(text);
    if (fixture.name === 'array-container') {
      assert.deepEqual(settings.mcpServers, ['user-entry']);
      assert.equal(settings.keep, true);
    } else if (fixture.name === 'string-container') {
      assert.equal(settings.mcpServers, 'user-entry');
      assert.equal(settings.keep, true);
    } else {
      assert.deepEqual(settings, []);
    }
    assert.equal(text.includes('"exa"'), false);
    assert.match(output.join('\n'), /exa MCP registration skipped/);
  });
}

for (const fixture of GEMINI_THROWING_ROOT_FIXTURES) {
  test(`WR-01 Gemini ${fixture.name} preflight failure leaves no payload, marker, or state`, async (t) => {
    const { configDir, opts } = tempRuntime(t, geminiAdapter);
    const target = targetPath(geminiAdapter, configDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fixture.text);

    await assert.rejects(installRuntime(geminiAdapter, { ...opts, exaMcp: 'register' }));
    assert.equal(fs.existsSync(path.join(configDir, 'oto', '.install.json')), false);
    assert.equal(fs.existsSync(path.join(configDir, 'commands')), false);
    assert.equal(fs.existsSync(path.join(configDir, 'hooks')), false);
    assert.equal(fs.existsSync(path.join(configDir, 'GEMINI.md')), false);
    assert.equal(fs.readFileSync(target, 'utf8'), fixture.text);
  });
}

for (const [name, text] of [
  ['quoted-child-table', '[mcp_servers."exa"]\ncommand = "user-node"\n'],
  ['quoted-parent-table', '["mcp_servers".exa]\ncommand = "user-node"\n'],
  ['dotted-assignment', 'mcp_servers.exa = { command = "user-node" }\n'],
  ['inline-table', 'mcp_servers = { exa = { command = "user-node" } }\n'],
]) {
  test(`CR-01 Codex lifecycle refuses ${name} without recording MCP ownership`, async (t) => {
    const { configDir, opts } = tempRuntime(t, codexAdapter);
    const target = targetPath(codexAdapter, configDir);
    fs.writeFileSync(target, text);

    await installRuntime(codexAdapter, { ...opts, exaMcp: 'register' });

    const state = readState(path.join(configDir, 'oto', '.install.json'));
    assert.equal(state.mcp, undefined);
    assert.equal(fs.readFileSync(target, 'utf8').includes(text.trim()), true);
  });
}
