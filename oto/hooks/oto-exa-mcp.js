#!/usr/bin/env node
'use strict';

// ADR-16 launcher for the Exa MCP stdio server.
// Version bumps are intentionally confined to the single @3.2.1 spawn argument.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

function resolveKey({ env = process.env, keyfileDir } = {}) {
  const envKey = typeof env.EXA_API_KEY === 'string'
    ? env.EXA_API_KEY.trim()
    : '';
  if (envKey) return envKey;

  const resolvedKeyfileDir = keyfileDir
    || env.OTO_KEYFILE_DIR
    || path.join(os.homedir(), '.oto');
  const keyfile = path.join(resolvedKeyfileDir, 'exa_api_key');

  try {
    const stat = fs.statSync(keyfile);
    if (!stat.isFile()) return null;

    const key = fs.readFileSync(keyfile, 'utf8').trim();
    return key || null;
  } catch {
    return null;
  }
}

function buildSpawnCommand() {
  return {
    cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: [
      '-y',
      'exa-mcp-server@3.2.1',
      'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa',
    ],
  };
}

function main() {
  const key = resolveKey();
  if (!key) {
    process.stderr.write('oto-exa-mcp: no Exa API key (EXA_API_KEY or ~/.oto/exa_api_key) — run /oto-settings-integrations\n');
    process.exit(1);
  }

  const { cmd, args } = buildSpawnCommand();
  const child = childProcess.spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, EXA_API_KEY: key },
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => child.kill(signal));
  }

  child.on('error', () => {
    process.stderr.write('oto-exa-mcp: failed to spawn npx\n');
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 1));
  });
}

module.exports = { resolveKey, buildSpawnCommand };

if (require.main === module) main();
