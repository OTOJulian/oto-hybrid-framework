'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  detectKeySource,
  keyfilePath,
  migrateLegacyIntegrationKeys,
  readKeyfile,
  warnIfNoKeyDetected,
  writeKeyfile,
} = require('../oto/bin/lib/secrets.cjs');

function makeTempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-empty-keyfile-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
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

function createKeyfile(base, content, mode = 0o600) {
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  const target = keyfilePath('exa', base);
  fs.writeFileSync(target, content, { mode });
  fs.chmodSync(target, mode);
  return target;
}

function withEmptyExaEnv(t) {
  const previous = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = '';
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });
}

test('readKeyfile treats a zero-byte keyfile as absent', (t) => {
  const base = path.join(makeTempRoot(t), '.oto');
  createKeyfile(base, '');

  assert.equal(readKeyfile('exa', base), null);
});

test('readKeyfile treats a whitespace-only keyfile as absent', (t) => {
  const base = path.join(makeTempRoot(t), '.oto');
  createKeyfile(base, '\n \t\n');

  assert.equal(readKeyfile('exa', base), null);
});

test('readKeyfile heals loose permissions before rejecting empty content', (t) => {
  const base = path.join(makeTempRoot(t), '.oto');
  const target = createKeyfile(base, '\n \t\n', 0o644);

  const result = captureStderr(() => readKeyfile('exa', base));

  assert.equal(result.value, null);
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.match(result.output, /fixed permissions/);
});

test('detectKeySource reports no source for a zero-byte keyfile', (t) => {
  const base = path.join(makeTempRoot(t), '.oto');
  createKeyfile(base, '');
  withEmptyExaEnv(t);

  assert.deepEqual(detectKeySource('exa', base), {
    source: null,
    masked: '(unset)',
  });
});

test('warnIfNoKeyDetected warns when the only keyfile is whitespace-only', (t) => {
  const base = path.join(makeTempRoot(t), '.oto');
  createKeyfile(base, '\n \t\n');
  withEmptyExaEnv(t);

  const result = captureStderr(() => warnIfNoKeyDetected('exa_search', base));

  assert.match(result.output, /no Exa API key detected/);
});

test('migration replaces a zero-byte keyfile with the valid legacy credential', (t) => {
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const target = createKeyfile(base, '');
  const configPath = writeConfig(root, {
    exa_search: 'sk-legacy-gap2-0123456789',
  });

  const result = captureStderr(() => migrateLegacyIntegrationKeys(configPath, base));

  assert.equal(fs.readFileSync(target, 'utf8'), 'sk-legacy-gap2-0123456789\n');
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).exa_search, true);
  assert.equal(result.value.conflicts.includes('exa_search'), false);
  assert.match(result.output, /migrated exa_search API key/);
});

test('migration keeps a different non-empty keyfile as the conflict winner', (t) => {
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const configPath = writeConfig(root, {
    exa_search: 'sk-legacy-gap2-0123456789',
  });
  writeKeyfile('exa', 'sk-existing-keyfile-9999wxyz', base);

  const result = captureStderr(() => migrateLegacyIntegrationKeys(configPath, base));

  assert.equal(
    fs.readFileSync(keyfilePath('exa', base), 'utf8'),
    'sk-existing-keyfile-9999wxyz\n',
  );
  assert.equal(result.value.conflicts.includes('exa_search'), true);
});

test('migration replaces a whitespace-only keyfile with the valid legacy credential', (t) => {
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  const target = createKeyfile(base, '\n \t\n');
  const configPath = writeConfig(root, {
    exa_search: 'sk-legacy-gap2-0123456789',
  });

  const result = captureStderr(() => migrateLegacyIntegrationKeys(configPath, base));

  assert.equal(fs.readFileSync(target, 'utf8'), 'sk-legacy-gap2-0123456789\n');
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).exa_search, true);
  assert.equal(result.value.conflicts.includes('exa_search'), false);
});
