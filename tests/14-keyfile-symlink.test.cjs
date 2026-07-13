'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  keyfilePath,
  migrateLegacyIntegrationKeys,
  readKeyfile,
  writeKeyfile,
} = require('../oto/bin/lib/secrets.cjs');

function makeTempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-keyfile-symlink-'));
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

function createSymlinkFixture(t) {
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  const victim = path.join(root, 'victim.txt');
  fs.writeFileSync(victim, 'victim-content', { mode: 0o644 });
  fs.chmodSync(victim, 0o644);
  const target = keyfilePath('exa', base);
  fs.symlinkSync(victim, target);
  return { root, base, victim, target };
}

test('readKeyfile refuses a symlink without reading or re-moding its victim', (t) => {
  const { base, victim } = createSymlinkFixture(t);

  const result = captureStderr(() => readKeyfile('exa', base));

  assert.equal(result.value, null);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'victim-content');
  assert.equal(fs.statSync(victim).mode & 0o777, 0o644);
  assert.match(result.output, /not a regular file/);
});

test('writeKeyfile refuses a symlink without overwriting its victim', (t) => {
  const { base, victim, target } = createSymlinkFixture(t);

  assert.throws(() => writeKeyfile('exa', 'sk-new', base), /not a regular file/);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'victim-content');
  assert.equal(fs.statSync(victim).mode & 0o777, 0o644);
  assert.equal(fs.readlinkSync(target), victim);
});

test('migration fails closed when the destination keyfile is a symlink', (t) => {
  const { root, base, victim } = createSymlinkFixture(t);
  const configPath = writeConfig(root, {
    exa_search: 'sk-legacy-gap2-0123456789',
  });
  const before = fs.readFileSync(configPath, 'utf8');

  assert.throws(
    () => migrateLegacyIntegrationKeys(configPath, base),
    /not a regular file/,
  );
  assert.equal(fs.readFileSync(configPath, 'utf8'), before);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'victim-content');
  assert.equal(fs.statSync(victim).mode & 0o777, 0o644);
});

test('writeKeyfile heals a regular keyfile before replacing its content', (t) => {
  const root = makeTempRoot(t);
  const base = path.join(root, '.oto');
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });
  const target = keyfilePath('exa', base);
  fs.writeFileSync(target, 'old-content\n', { mode: 0o644 });
  fs.chmodSync(target, 0o644);

  writeKeyfile('exa', 'sk-new-key-0123456789', base);

  assert.equal(fs.readFileSync(target, 'utf8'), 'sk-new-key-0123456789\n');
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
});
