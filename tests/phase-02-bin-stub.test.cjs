'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const BIN_PATH = path.join(REPO_ROOT, 'bin', 'install.js');

test('bin/install.js prints version and repo hint', () => {
  const out = spawnSync(process.execPath, [BIN_PATH], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /oto v0\.1\.0/);
  assert.match(out.stdout, /\/oto-hybrid-framework/);
});

test('bin/install.js keeps shebang and CJS header', () => {
  const lines = fs.readFileSync(BIN_PATH, 'utf8').split(/\r?\n/);
  assert.equal(lines[0], '#!/usr/bin/env node');
  assert.equal(lines[1], "'use strict';");
});
