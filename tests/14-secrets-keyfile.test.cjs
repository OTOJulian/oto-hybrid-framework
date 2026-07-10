'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const secrets = require('../oto/bin/lib/secrets.cjs');

function makeTempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-secrets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function requireFunction(name) {
  assert.equal(typeof secrets[name], 'function', `${name} must be exported`);
  return secrets[name];
}

function captureStderr(fn) {
  const originalWrite = process.stderr.write;
  let output = '';
  process.stderr.write = (chunk, ...args) => {
    output += String(chunk);
    if (typeof args.at(-1) === 'function') args.at(-1)();
    return true;
  };
  try {
    return { value: fn(), output };
  } finally {
    process.stderr.write = originalWrite;
  }
}

function writeConfig(root, value) {
  const configPath = path.join(root, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(value, null, 2) + '\n');
  return configPath;
}

test('writeKeyfile creates an allowlisted 0600 keyfile in a 0700 base directory', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const keyfilePath = requireFunction('keyfilePath');
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');

  writeKeyfile('exa', 'k', base);

  const target = keyfilePath('exa', base);
  assert.equal(fs.readFileSync(target, 'utf8'), 'k\n');
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.equal(fs.statSync(base).mode & 0o777, 0o700);
  assert.throws(() => keyfilePath('../escape', base), /unknown integration/i);
});

test('readKeyfile returns trimmed content and null when the keyfile is missing', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const readKeyfile = requireFunction('readKeyfile');
  const base = path.join(makeTempRoot(t), '.oto');

  assert.equal(readKeyfile('exa', base), null);
  writeKeyfile('exa', '  sk-read-value  ', base);
  assert.deepEqual(readKeyfile('exa', base), { value: 'sk-read-value', healed: false });
});

test('readKeyfile heals loose permissions to 0600 and reports the repair', (t) => {
  const keyfilePath = requireFunction('keyfilePath');
  const readKeyfile = requireFunction('readKeyfile');
  const base = path.join(makeTempRoot(t), '.oto');
  fs.mkdirSync(base, { recursive: true });
  const target = keyfilePath('exa', base);
  fs.writeFileSync(target, 'sk-heal-value\n', { mode: 0o644 });
  fs.chmodSync(target, 0o644);

  const result = captureStderr(() => readKeyfile('exa', base));

  assert.deepEqual(result.value, { value: 'sk-heal-value', healed: true });
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.equal(result.output, `fixed permissions on ${target} (now 0600)\n`);
  assert.doesNotMatch(result.output, /sk-heal-value/);
});

test('deleteKeyfile reports whether an existing keyfile was removed', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const deleteKeyfile = requireFunction('deleteKeyfile');
  const base = path.join(makeTempRoot(t), '.oto');
  writeKeyfile('exa', 'sk-delete', base);

  assert.equal(deleteKeyfile('exa', base), true);
  assert.equal(deleteKeyfile('exa', base), false);
});

test('detectKeySource gives a non-empty environment variable precedence over a keyfile', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const detectKeySource = requireFunction('detectKeySource');
  const base = path.join(makeTempRoot(t), '.oto');
  const previous = process.env.EXA_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });
  writeKeyfile('exa', 'sk-keyfile-1234', base);
  process.env.EXA_API_KEY = 'sk-environment-5678';

  assert.deepEqual(detectKeySource('exa', base), {
    source: 'env',
    envVar: 'EXA_API_KEY',
    masked: '****5678',
    shadowedKeyfile: true,
  });
});

test('detectKeySource reports a keyfile source and then no source when it is removed', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const deleteKeyfile = requireFunction('deleteKeyfile');
  const detectKeySource = requireFunction('detectKeySource');
  const keyfilePath = requireFunction('keyfilePath');
  const base = path.join(makeTempRoot(t), '.oto');
  const previous = process.env.EXA_API_KEY;
  delete process.env.EXA_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });
  writeKeyfile('exa', 'sk-keyfile-1234', base);

  assert.deepEqual(detectKeySource('exa', base), {
    source: 'keyfile',
    path: keyfilePath('exa', base),
    masked: '****1234',
  });
  deleteKeyfile('exa', base);
  assert.deepEqual(detectKeySource('exa', base), { source: null, masked: '(unset)' });
});

test('validateIntegrationValue rejects non-boolean integration values only', () => {
  const validateIntegrationValue = requireFunction('validateIntegrationValue');

  const rejected = validateIntegrationValue('exa_search', 'sk-abc');
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /booleans only/);
  assert.match(rejected.message, /secret-set exa/);
  assert.deepEqual(validateIntegrationValue('exa_search', true), { ok: true });
  assert.deepEqual(validateIntegrationValue('exa_search', false), { ok: true });
  assert.deepEqual(validateIntegrationValue('model_profile', 'quality'), { ok: true });
});

test('migrateLegacyIntegrationKeys moves a config string into a 0600 keyfile', (t) => {
  const migrateLegacyIntegrationKeys = requireFunction('migrateLegacyIntegrationKeys');
  const keyfilePath = requireFunction('keyfilePath');
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const configPath = writeConfig(root, { exa_search: 'sk-legacy1234', model_profile: 'inherit' });

  const result = captureStderr(() => migrateLegacyIntegrationKeys(configPath, base));

  assert.deepEqual(result.value, { migrated: ['exa_search'], conflicts: [] });
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf8')), {
    exa_search: true,
    model_profile: 'inherit',
  });
  const target = keyfilePath('exa', base);
  assert.equal(fs.readFileSync(target, 'utf8'), 'sk-legacy1234\n');
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.match(result.output, /migrated exa_search API key/);
  assert.match(result.output, /rotating it at the provider/);
  assert.doesNotMatch(result.output, /sk-legacy1234/);
});

test('migration keeps a different existing keyfile and drops the legacy config string', (t) => {
  const writeKeyfile = requireFunction('writeKeyfile');
  const migrateLegacyIntegrationKeys = requireFunction('migrateLegacyIntegrationKeys');
  const keyfilePath = requireFunction('keyfilePath');
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const configPath = writeConfig(root, { exa_search: 'sk-config-abcd' });
  writeKeyfile('exa', 'sk-keyfile-wxyz', base);

  const result = captureStderr(() => migrateLegacyIntegrationKeys(configPath, base));

  assert.deepEqual(result.value, { migrated: ['exa_search'], conflicts: ['exa_search'] });
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).exa_search, true);
  assert.equal(fs.readFileSync(keyfilePath('exa', base), 'utf8'), 'sk-keyfile-wxyz\n');
  assert.match(result.output, /\*\*\*\*wxyz/);
  assert.match(result.output, /\*\*\*\*abcd/);
  assert.match(result.output, /rotating it at the provider/);
  assert.doesNotMatch(result.output, /sk-keyfile-wxyz|sk-config-abcd/);
});

test('migration safely no-ops for missing, malformed, and boolean-only config files', (t) => {
  const migrateLegacyIntegrationKeys = requireFunction('migrateLegacyIntegrationKeys');
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const missing = path.join(root, 'missing.json');
  const malformed = path.join(root, 'malformed.json');
  fs.writeFileSync(malformed, '{not-json');
  const cleanRoot = path.join(root, 'clean-dir');
  fs.mkdirSync(cleanRoot);
  const clean = writeConfig(cleanRoot, {
    exa_search: false,
    brave_search: true,
    firecrawl: false,
  });

  assert.deepEqual(migrateLegacyIntegrationKeys(missing, base), { migrated: [] });
  assert.deepEqual(migrateLegacyIntegrationKeys(malformed, base), { migrated: [] });
  const before = fs.readFileSync(clean, 'utf8');
  assert.deepEqual(migrateLegacyIntegrationKeys(clean, base), { migrated: [] });
  assert.equal(fs.readFileSync(clean, 'utf8'), before);
  assert.equal(fs.existsSync(base), false);
});

test('migration coerces non-string, non-boolean integration values without creating keyfiles', (t) => {
  const migrateLegacyIntegrationKeys = requireFunction('migrateLegacyIntegrationKeys');
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const configPath = writeConfig(root, {
    exa_search: 1,
    brave_search: null,
    firecrawl: 0,
  });

  assert.deepEqual(migrateLegacyIntegrationKeys(configPath, base), {
    migrated: ['exa_search', 'brave_search', 'firecrawl'],
    conflicts: [],
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf8')), {
    exa_search: true,
    brave_search: false,
    firecrawl: false,
  });
  assert.equal(fs.existsSync(base), false);
});
