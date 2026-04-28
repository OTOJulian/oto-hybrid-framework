'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const HOOKS_DIR = path.join(REPO_ROOT, 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-hooks.js');

function runBuildHooks() {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
}

test('build-hooks exits cleanly when hooks only contains .gitkeep', () => {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  const out = runBuildHooks();
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /Build complete/);
  assert.ok(fs.existsSync(DIST_DIR), 'hooks/dist/ was not created');
});

test('build-hooks rejects syntactically invalid JS hooks', (t) => {
  const badPath = path.join(HOOKS_DIR, '__test_bad.js');
  const badDistPath = path.join(DIST_DIR, '__test_bad.js');
  t.after(() => {
    fs.rmSync(badPath, { force: true });
    fs.rmSync(badDistPath, { force: true });
  });
  fs.writeFileSync(badPath, 'const x = 1; const x = 2;\n');

  const out = runBuildHooks();
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /SyntaxError|Identifier 'x' has already been declared/);
  assert.equal(fs.existsSync(badDistPath), false);
});

test('build-hooks copies valid hook files', (t) => {
  const goodPath = path.join(HOOKS_DIR, '__test_good.js');
  const goodDistPath = path.join(DIST_DIR, '__test_good.js');
  t.after(() => {
    fs.rmSync(goodPath, { force: true });
    fs.rmSync(goodDistPath, { force: true });
  });
  fs.writeFileSync(goodPath, "console.log('ok');\n");

  const out = runBuildHooks();
  assert.equal(out.status, 0, out.stderr);
  assert.equal(fs.readFileSync(goodDistPath, 'utf8'), "console.log('ok');\n");
});
