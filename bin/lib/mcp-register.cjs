'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { expandTilde } = require('./args.cjs');
const { getMcpBlockInner, inspectExternalMcpServer } = require('./codex-toml.cjs');
const { readState } = require('./install-state.cjs');
const { claudeJsonPath } = require('./runtime-claude.cjs');
const { parseJsoncFailClosed } = require('./jsonc.cjs');

const EXA_SERVER_NAME = 'exa';

function buildLauncherPath(configDir) {
  return path.join(configDir, 'hooks', 'oto-exa-mcp.js');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function buildMcpStateRecord({ target, entry }) {
  return {
    [EXA_SERVER_NAME]: {
      target,
      registered_at: new Date().toISOString(),
      entry,
    },
  };
}

const RUNTIME_TARGETS = {
  claude: { env: 'CLAUDE_CONFIG_DIR', segment: '.claude', file: '.claude.json' },
  codex: { env: 'CODEX_HOME', segment: '.codex', file: 'config.toml' },
  gemini: { env: 'GEMINI_CONFIG_DIR', segment: '.gemini', file: 'settings.json' },
};

function resolveRuntimeMcpTarget(runtimeName, { env = process.env, homeDir = os.homedir() } = {}) {
  const runtime = RUNTIME_TARGETS[runtimeName];
  if (!runtime) throw new Error(`unknown runtime: ${runtimeName}`);
  const configDir = env[runtime.env]
    ? expandTilde(env[runtime.env])
    : path.join(homeDir, runtime.segment);
  const target = runtimeName === 'claude'
    ? claudeJsonPath(env, homeDir)
    : path.join(configDir, runtime.file);
  return { configDir, target };
}

function parseJsonc(text) {
  return parseJsoncFailClosed(text);
}

function readLiveEntry(runtimeName, target) {
  let text;
  try {
    text = fs.readFileSync(target, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { entry: null, external: false };
    return { entry: null, external: false, detail: 'unparseable' };
  }

  if (runtimeName === 'codex') {
    const inspection = inspectExternalMcpServer(text);
    return {
      entry: getMcpBlockInner(text),
      external: inspection.external,
      ...(!inspection.confident ? { detail: 'unparseable' } : {}),
    };
  }

  try {
    const parsed = runtimeName === 'gemini' ? parseJsonc(text) : JSON.parse(text);
    return { entry: parsed?.mcpServers?.exa ?? null, external: false };
  } catch {
    return { entry: null, external: false, detail: 'unparseable' };
  }
}

function classifyExaRegistration(runtimeName, opts = {}) {
  const { configDir, target } = resolveRuntimeMcpTarget(runtimeName, opts);
  if (!fs.existsSync(configDir)) {
    return { runtime: runtimeName, status: 'not-installed', target };
  }

  let record = null;
  try {
    record = readState(path.join(configDir, 'oto', '.install.json'))?.mcp?.exa ?? null;
  } catch {
    record = null;
  }

  const live = readLiveEntry(runtimeName, target);
  let status;
  if (live.external) status = 'user-owned';
  else if (live.entry !== null && record) {
    status = stableStringify(live.entry) === stableStringify(record.entry)
      ? 'oto-managed'
      : 'drifted';
  } else if (live.entry !== null) status = 'user-owned';
  else if (record) status = 'missing-but-expected';
  else status = 'not-registered';

  return {
    runtime: runtimeName,
    status,
    target,
    ...(live.detail ? { detail: live.detail } : {}),
  };
}

function checkExaCoherence({ exaSearchEnabled, keySource, statuses = [] }) {
  const statusNames = statuses.map((item) => typeof item === 'string' ? item : item.status);
  const registered = statusNames.some((status) =>
    ['oto-managed', 'user-owned', 'drifted'].includes(status)
  );
  const otoOwned = statusNames.some((status) => ['oto-managed', 'drifted'].includes(status));
  const warnings = [];
  if (exaSearchEnabled && !registered) {
    warnings.push('oto: exa_search is enabled but the exa MCP server is not registered in any runtime — run /oto-settings-integrations');
  }
  if (otoOwned && keySource == null) {
    warnings.push('oto: exa MCP server is registered but no usable Exa API key was detected — run /oto-settings-integrations');
  }
  return warnings;
}

module.exports = {
  EXA_SERVER_NAME,
  buildLauncherPath,
  stableStringify,
  buildMcpStateRecord,
  resolveRuntimeMcpTarget,
  classifyExaRegistration,
  checkExaCoherence,
};
