'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  detectKeySource,
  keyfilePath,
  writeKeyfile,
} = require('../oto/bin/lib/secrets.cjs');

function makeTempBase(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-d15-'));
  const base = path.join(root, '.oto');
  fs.mkdirSync(base, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, base, target: keyfilePath('exa', base) };
}

function withoutExaEnv(t) {
  const previous = process.env.EXA_API_KEY;
  delete process.env.EXA_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });
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

test('D-15 trims a non-empty environment key and gives it precedence', (t) => {
  const { base } = makeTempBase(t);
  const previous = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = '  key123  ';
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });

  assert.equal(detectKeySource('exa', base).source, 'env');
});

test('D-15 treats a whitespace-only environment value with no keyfile as absent', (t) => {
  const { base } = makeTempBase(t);
  const previous = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = ' \t ';
  t.after(() => {
    if (previous === undefined) delete process.env.EXA_API_KEY;
    else process.env.EXA_API_KEY = previous;
  });

  assert.deepEqual(detectKeySource('exa', base), { source: null, masked: '(unset)' });
});

test('D-15 detects a non-empty regular keyfile', (t) => {
  withoutExaEnv(t);
  const { base, target } = makeTempBase(t);
  fs.writeFileSync(target, 'sk-abc\n');

  assert.equal(detectKeySource('exa', base).source, 'keyfile');
});

test('D-15 treats empty and whitespace-only keyfiles as absent', (t) => {
  withoutExaEnv(t);
  const { base, target } = makeTempBase(t);

  fs.writeFileSync(target, '');
  assert.equal(detectKeySource('exa', base).source, null);
  fs.writeFileSync(target, '  \n\t');
  assert.equal(detectKeySource('exa', base).source, null);
});

test('D-15 follows a symlink to a non-empty regular keyfile without re-moding it', (t) => {
  withoutExaEnv(t);
  const { root, base, target } = makeTempBase(t);
  const linked = path.join(root, 'password-manager-key');
  fs.writeFileSync(linked, 'sk-linked\n', { mode: 0o644 });
  fs.chmodSync(linked, 0o644);
  fs.symlinkSync(linked, target);

  assert.equal(detectKeySource('exa', base).source, 'keyfile');
  assert.equal(fs.statSync(linked).mode & 0o777, 0o644);
});

test('D-15 refuses a symlink to a directory without throwing', (t) => {
  withoutExaEnv(t);
  const { root, base, target } = makeTempBase(t);
  const linked = path.join(root, 'directory');
  fs.mkdirSync(linked);
  fs.symlinkSync(linked, target);

  const result = captureStderr(() => detectKeySource('exa', base));
  assert.equal(result.value.source, null);
  assert.match(result.output, /not a regular file/);
  assert.equal(result.output.trim().split('\n').length, 1);
});

test('D-15 treats a dangling keyfile symlink as absent', (t) => {
  withoutExaEnv(t);
  const { root, base, target } = makeTempBase(t);
  fs.symlinkSync(path.join(root, 'missing'), target);

  const result = captureStderr(() => detectKeySource('exa', base));
  assert.equal(result.value.source, null);
  assert.match(result.output, /dangling symlink/);
  assert.equal(result.output.trim().split('\n').length, 1);
});

test('WR-07 still refuses writes through an existing symlink', (t) => {
  const { root, base, target } = makeTempBase(t);
  const linked = path.join(root, 'victim');
  fs.writeFileSync(linked, 'unchanged');
  fs.symlinkSync(linked, target);

  assert.throws(() => writeKeyfile('exa', 'replacement', base), /not a regular file/);
  assert.equal(fs.readFileSync(linked, 'utf8'), 'unchanged');
});

test('D-15 refuses a FIFO keyfile without opening it for read', (t) => {
  if (process.platform === 'win32') return t.skip('mkfifo is unavailable on win32');
  withoutExaEnv(t);
  const { base, target } = makeTempBase(t);
  try {
    childProcess.execFileSync('mkfifo', [target]);
  } catch {
    return t.skip('mkfifo is unavailable');
  }

  const result = captureStderr(() => detectKeySource('exa', base));
  assert.equal(result.value.source, null);
  assert.match(result.output, /not a regular file/);
});
