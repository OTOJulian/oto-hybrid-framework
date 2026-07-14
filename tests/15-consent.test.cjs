'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { parseCliArgs, ArgError } = require('../bin/lib/args.cjs');
const consentModulePath = path.join(__dirname, '..', 'bin', 'lib', 'mcp-consent.cjs');

function consentModule() {
  assert.equal(fs.existsSync(consentModulePath), true, 'mcp-consent.cjs must exist');
  return require(consentModulePath);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-15-consent-'));
  const keyBaseDir = path.join(root, 'keys');
  const consentBaseDir = path.join(root, 'consent');
  fs.mkdirSync(keyBaseDir, { recursive: true });
  return {
    root,
    keyBaseDir,
    consentBaseDir,
    seedKey(value = 'sk-test-present-1234') {
      fs.writeFileSync(path.join(keyBaseDir, 'exa_api_key'), value + '\n', { mode: 0o600 });
    },
    cleanup() { fs.rmSync(root, { recursive: true, force: true }); },
  };
}

function scriptedIo({ answer = '', isTTY = true } = {}) {
  const prompts = [];
  const logs = [];
  return {
    prompts,
    logs,
    io: {
      isTTY,
      log(line) { logs.push(line); },
      async prompt(question) {
        prompts.push(question);
        return /^(?:y|yes)$/i.test(answer.trim());
      },
    },
  };
}

test('15 consent args: register flag parses on install', () => {
  const parsed = parseCliArgs(['install', '--claude', '--register-exa-mcp']);
  assert.equal(parsed.registerExaMcp, true);
  assert.equal(parsed.unregisterExaMcp, false);
});

test('15 consent args: register and unregister flags are mutually exclusive', () => {
  assert.throws(
    () => parseCliArgs(['install', '--claude', '--register-exa-mcp', '--unregister-exa-mcp']),
    (error) => error instanceof ArgError && error.exitCode === 3 && /mutually exclusive/.test(error.message),
  );
});

test('15 consent args: Exa MCP flags are install-only', () => {
  assert.throws(
    () => parseCliArgs(['uninstall', '--claude', '--register-exa-mcp']),
    (error) => error instanceof ArgError && error.exitCode === 3 && /install-only/.test(error.message),
  );
  assert.throws(
    () => parseCliArgs(['uninstall', '--claude', '--unregister-exa-mcp']),
    (error) => error instanceof ArgError && error.exitCode === 3 && /install-only/.test(error.message),
  );
});

test('15 consent: unregister flag needs no key, persists no, and never prompts', async (t) => {
  const f = fixture(); t.after(f.cleanup);
  const { decideExaMcpAction, readConsent } = consentModule();
  const spy = scriptedIo();
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: { unregisterExaMcp: true },
    keyBaseDir: f.keyBaseDir, consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: 'unregister', reason: 'flag' },
    codex: { action: 'unregister', reason: 'flag' },
  });
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'no');
  assert.equal(readConsent('exa', 'codex', f.consentBaseDir), 'no');
  assert.equal(spy.prompts.length, 0);
});

test('15 consent: no usable key silently skips and never prompts', async (t) => {
  const f = fixture(); t.after(f.cleanup);
  const { decideExaMcpAction } = consentModule();
  const spy = scriptedIo();
  const result = await decideExaMcpAction({
    runtimes: ['claude'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, { claude: { action: null, reason: 'no-key' } });
  assert.equal(spy.prompts.length, 0);
  assert.equal(spy.logs.length, 0);
});

test('15 consent: register flag without key records yes but never registers or prompts', async (t) => {
  const f = fixture(); t.after(f.cleanup);
  const { decideExaMcpAction, readConsent } = consentModule();
  const spy = scriptedIo();
  const keyless = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: { registerExaMcp: true },
    keyBaseDir: f.keyBaseDir, consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(keyless, {
    claude: { action: null, reason: 'no-key' },
    codex: { action: null, reason: 'no-key' },
  });
  assert.equal(Object.values(keyless).some((decision) => decision.action === 'register'), false);
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'yes');
  assert.equal(readConsent('exa', 'codex', f.consentBaseDir), 'yes');
  assert.equal(spy.prompts.length, 0);
  assert.deepEqual(spy.logs, ['oto: exa MCP consent recorded — registration skipped (no usable key detected)']);

  f.seedKey();
  const followUpSpy = scriptedIo();
  const followUp = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: followUpSpy.io,
  });
  assert.deepEqual(followUp, {
    claude: { action: 'register', reason: 'recorded' },
    codex: { action: 'register', reason: 'recorded' },
  });
  assert.equal(followUpSpy.prompts.length, 0);
});

test('15 consent: register flag with key registers all, persists yes, and never prompts', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction, readConsent } = consentModule();
  const spy = scriptedIo();
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'gemini'], parsed: { registerExaMcp: true },
    keyBaseDir: f.keyBaseDir, consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: 'register', reason: 'flag' },
    gemini: { action: 'register', reason: 'flag' },
  });
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'yes');
  assert.equal(readConsent('exa', 'gemini', f.consentBaseDir), 'yes');
  assert.equal(spy.prompts.length, 0);
});

test('15 consent: recorded yes and no answers are honored silently per runtime', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction, writeConsent } = consentModule();
  writeConsent('exa', 'claude', 'yes', f.consentBaseDir);
  writeConsent('exa', 'codex', 'no', f.consentBaseDir);
  const spy = scriptedIo();
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: 'register', reason: 'recorded' },
    codex: { action: null, reason: 'declined' },
  });
  assert.equal(spy.prompts.length, 0);
});

test('15 consent: non-TTY logs once and skips every unrecorded runtime without prompting', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction } = consentModule();
  const spy = scriptedIo({ isTTY: false });
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: null, reason: 'non-interactive' },
    codex: { action: null, reason: 'non-interactive' },
  });
  assert.equal(spy.prompts.length, 0);
  assert.deepEqual(spy.logs, ['oto: exa MCP registration skipped (non-interactive) — run /oto-settings-integrations to register later']);
});

test('15 consent: one TTY prompt names two runtimes and one yes persists for both', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction, readConsent } = consentModule();
  const spy = scriptedIo({ answer: 'yes' });
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: 'register', reason: 'prompt' },
    codex: { action: 'register', reason: 'prompt' },
  });
  assert.deepEqual(spy.prompts, ['Register the Exa MCP server for claude, codex? [y/N] ']);
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'yes');
  assert.equal(readConsent('exa', 'codex', f.consentBaseDir), 'yes');
});

test('15 consent: mixed recorded and unrecorded state prompts only for unrecorded runtime', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction, writeConsent, readConsent } = consentModule();
  writeConsent('exa', 'claude', 'yes', f.consentBaseDir);
  const spy = scriptedIo({ answer: 'n' });
  const result = await decideExaMcpAction({
    runtimes: ['claude', 'codex'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, {
    claude: { action: 'register', reason: 'recorded' },
    codex: { action: null, reason: 'declined' },
  });
  assert.deepEqual(spy.prompts, ['Register the Exa MCP server for codex? [y/N] ']);
  assert.equal(readConsent('exa', 'codex', f.consentBaseDir), 'no');
});

test('15 consent: single-runtime default answer is No and persists decline', async (t) => {
  const f = fixture(); t.after(f.cleanup); f.seedKey();
  const { decideExaMcpAction, readConsent } = consentModule();
  const spy = scriptedIo({ answer: '' });
  const result = await decideExaMcpAction({
    runtimes: ['claude'], parsed: {}, keyBaseDir: f.keyBaseDir,
    consentBaseDir: f.consentBaseDir, io: spy.io,
  });
  assert.deepEqual(result, { claude: { action: null, reason: 'declined' } });
  assert.deepEqual(spy.prompts, ['Register the Exa MCP server for claude? [y/N] ']);
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'no');
});

test('15 consent: readConsent tolerates missing and malformed state, writeConsent merge-preserves', (t) => {
  const f = fixture(); t.after(f.cleanup);
  const { readConsent, writeConsent } = consentModule();
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), null);
  fs.mkdirSync(f.consentBaseDir, { recursive: true });
  fs.writeFileSync(path.join(f.consentBaseDir, 'mcp-consent.json'), '{broken');
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), null);
  writeConsent('exa', 'claude', 'yes', f.consentBaseDir);
  writeConsent('exa', 'codex', 'no', f.consentBaseDir);
  assert.equal(readConsent('exa', 'claude', f.consentBaseDir), 'yes');
  assert.equal(readConsent('exa', 'codex', f.consentBaseDir), 'no');
});

test('15 consent: promptYesNo accepts yes case-insensitively and defaults empty to No', async () => {
  const { promptYesNo } = consentModule();
  async function run(answer) {
    const { Readable, Writable } = require('node:stream');
    const input = Readable.from([answer + '\n']);
    let outputText = '';
    const output = new Writable({ write(chunk, _encoding, callback) { outputText += chunk; callback(); } });
    const result = await promptYesNo('Proceed? ', { input, output });
    return { result, outputText };
  }
  assert.deepEqual(await run('YeS'), { result: true, outputText: 'Proceed? ' });
  assert.deepEqual(await run(''), { result: false, outputText: 'Proceed? ' });
});

test('15 consent: pre-warm uses exact pinned argv and empty stdin without real npx', () => {
  const { preWarmExaMcp } = consentModule();
  const calls = [];
  const result = preWarmExaMcp({
    timeoutMs: 4321,
    log() {},
    spawnImpl(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });
  assert.deepEqual(result, { ok: true, status: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  assert.deepEqual(calls[0].args, [
    '-y', 'exa-mcp-server@3.2.1',
    'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa',
  ]);
  assert.equal(calls[0].options.input, '');
  assert.equal(calls[0].options.timeout, 4321);
  assert.equal(calls[0].options.encoding, 'utf8');
});

test('15 consent installer: one full-runtime decision call is wired before the install loop', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'bin', 'install.js'), 'utf8');
  assert.equal((source.match(/await decideExaMcpAction\(/g) || []).length, 1);
  assert.match(source, /runtimes:\s*targetedRuntimes/);
  assert.match(source, /exaMcp:\s*decisions\[rt\]\.action/);
  assert.ok(source.indexOf('await decideExaMcpAction(') < source.indexOf('for (const rt of targetedRuntimes)'));
});

test('15 consent installer: non-TTY no-key install completes without prompting or hanging', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-15-consent-install-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configDir = path.join(root, 'claude');
  const env = { ...process.env, HOME: root };
  delete env.EXA_API_KEY;
  const result = spawnSync(
    process.execPath,
    ['bin/install.js', 'install', '--claude', '--config-dir', configDir],
    { cwd: path.join(__dirname, '..'), env, input: '', encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /Register the Exa MCP server/);
  assert.doesNotMatch(result.stdout + result.stderr, /skipped \(non-interactive\)/);
});
