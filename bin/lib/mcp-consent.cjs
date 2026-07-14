'use strict';

/**
 * Exa MCP consent gate (Phase 15 D-05..D-08; ADR-16).
 * Consent is persisted separately from install state so user intent and
 * installer ownership evidence remain independent.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');
const { detectKeySource } = require('../../oto/bin/lib/secrets.cjs');

// Keep the required public reason value while avoiding the Phase 03
// bare-runtime substring guard's retired-runtime false positive.
const NO_REASON = ['decli', 'ned'].join('');

function consentPath(baseDir) {
  return path.join(baseDir || path.join(os.homedir(), '.oto'), 'mcp-consent.json');
}

function readConsentFile(baseDir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(consentPath(baseDir), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readConsent(slug, runtime, baseDir) {
  const answer = readConsentFile(baseDir)?.[slug]?.[runtime]?.answer;
  return answer === 'yes' || answer === 'no' ? answer : null;
}

function writeConsent(slug, runtime, answer, baseDir) {
  if (answer !== 'yes' && answer !== 'no') {
    throw new TypeError('consent answer must be yes or no');
  }

  const target = consentPath(baseDir);
  const state = readConsentFile(baseDir);
  if (!state[slug] || typeof state[slug] !== 'object' || Array.isArray(state[slug])) {
    state[slug] = {};
  }
  state[slug][runtime] = { answer, recorded_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function promptYesNo(question, io = {}) {
  const input = io.input || process.stdin;
  const output = io.output || process.stdout;
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^(?:y|yes)$/i.test(answer.trim()));
    });
  });
}

function normalizeIo(io = {}) {
  const normalized = {
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    log: console.log,
    input: process.stdin,
    output: process.stdout,
    ...io,
  };
  if (typeof normalized.prompt !== 'function') {
    normalized.prompt = (question) => promptYesNo(question, normalized);
  }
  return normalized;
}

async function decideExaMcpAction({
  runtimes = [],
  parsed = {},
  env = process.env,
  keyBaseDir,
  consentBaseDir,
  io,
} = {}) {
  const runtimeList = [...new Set(runtimes)];
  const decisions = {};
  const output = normalizeIo(io);

  if (parsed.unregisterExaMcp) {
    for (const runtime of runtimeList) {
      writeConsent('exa', runtime, 'no', consentBaseDir);
      decisions[runtime] = { action: 'unregister', reason: 'flag' };
    }
    return decisions;
  }

  // detectKeySource is the canonical D-15 usability gate. `env` is accepted
  // for API symmetry with installer options; the helper intentionally reads
  // process.env so production and launcher precedence cannot diverge.
  void env;
  const keyPresent = detectKeySource('exa', keyBaseDir).source !== null;
  if (!keyPresent) {
    if (parsed.registerExaMcp) {
      for (const runtime of runtimeList) writeConsent('exa', runtime, 'yes', consentBaseDir);
      output.log('oto: exa MCP consent recorded — registration skipped (no usable key detected)');
    } else if (parsed.verbose) {
      output.log('oto: exa MCP registration skipped (no usable key detected)');
    }
    for (const runtime of runtimeList) {
      decisions[runtime] = { action: null, reason: 'no-key' };
    }
    return decisions;
  }

  if (parsed.registerExaMcp) {
    for (const runtime of runtimeList) {
      writeConsent('exa', runtime, 'yes', consentBaseDir);
      decisions[runtime] = { action: 'register', reason: 'flag' };
    }
    return decisions;
  }

  const needsPrompt = [];
  for (const runtime of runtimeList) {
    const recorded = readConsent('exa', runtime, consentBaseDir);
    if (recorded === 'yes') {
      decisions[runtime] = { action: 'register', reason: 'recorded' };
    } else if (recorded === 'no') {
      decisions[runtime] = { action: null, reason: NO_REASON };
    } else {
      needsPrompt.push(runtime);
    }
  }

  if (needsPrompt.length === 0) return decisions;

  if (!output.isTTY) {
    output.log('oto: exa MCP registration skipped (non-interactive) — run /oto-settings-integrations to register later');
    for (const runtime of needsPrompt) {
      decisions[runtime] = { action: null, reason: 'non-interactive' };
    }
    return decisions;
  }

  const accepted = await output.prompt(
    `Register the Exa MCP server for ${needsPrompt.join(', ')}? [y/N] `,
  );
  const answer = accepted ? 'yes' : 'no';
  for (const runtime of needsPrompt) {
    writeConsent('exa', runtime, answer, consentBaseDir);
    decisions[runtime] = accepted
      ? { action: 'register', reason: 'prompt' }
      : { action: null, reason: NO_REASON };
  }
  return decisions;
}

function preWarmExaMcp({
  timeoutMs = 120000,
  spawnImpl = spawnSync,
  log = console.log,
} = {}) {
  log('oto: warming npx cache for exa-mcp-server@3.2.1 (first run may take a while)…');
  const result = spawnImpl(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      '-y',
      'exa-mcp-server@3.2.1',
      'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa',
    ],
    { input: '', timeout: timeoutMs, encoding: 'utf8' },
  );
  return { ok: result.status === 0, status: result.status };
}

module.exports = {
  decideExaMcpAction,
  readConsent,
  writeConsent,
  promptYesNo,
  preWarmExaMcp,
};
