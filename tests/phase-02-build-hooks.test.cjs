'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../scripts/build-hooks.js');

function makeHooksDir(t) {
  const hooksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-build-hooks-test-'));
  t.after(() => {
    fs.rmSync(hooksDir, { recursive: true, force: true });
  });
  return hooksDir;
}

function runBuildHooks(hooksDir) {
  const stdout = [];
  const stderr = [];
  const result = build({
    hooksDir,
    exit: false,
    log: (msg) => stdout.push(msg),
    error: (msg) => stderr.push(msg),
  });
  return {
    ...result,
    stdout: stdout.join('\n'),
    stderr: stderr.join('\n'),
    distDir: path.join(hooksDir, 'dist'),
  };
}

test('build-hooks exits cleanly when hooks only contains .gitkeep', (t) => {
  const hooksDir = makeHooksDir(t);
  fs.writeFileSync(path.join(hooksDir, '.gitkeep'), '');

  const out = runBuildHooks(hooksDir);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /Build complete/);
  assert.ok(fs.existsSync(out.distDir), 'hooks/dist/ was not created');
});

test('build-hooks rejects syntactically invalid JS hooks', (t) => {
  const hooksDir = makeHooksDir(t);
  const badPath = path.join(hooksDir, '__test_bad.js');
  fs.writeFileSync(badPath, 'const x = 1; const x = 2;\n');

  const out = runBuildHooks(hooksDir);
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /SyntaxError|Identifier 'x' has already been declared/);
  const badDistPath = path.join(out.distDir, '__test_bad.js');
  assert.equal(fs.existsSync(badDistPath), false);
});

test('build-hooks copies valid hook files', (t) => {
  const hooksDir = makeHooksDir(t);
  const goodPath = path.join(hooksDir, '__test_good.js');
  fs.writeFileSync(goodPath, "console.log('ok');\n");

  const out = runBuildHooks(hooksDir);
  assert.equal(out.status, 0, out.stderr);
  const goodDistPath = path.join(out.distDir, '__test_good.js');
  assert.equal(fs.readFileSync(goodDistPath, 'utf8'), "console.log('ok');\n");
});
