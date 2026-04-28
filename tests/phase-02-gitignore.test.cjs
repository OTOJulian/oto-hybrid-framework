'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

test('.gitignore includes Phase 2 scratch and install artifacts', () => {
  const gitignoreLines = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8')
    .split(/\r?\n/);
  for (const line of ['.oto-rebrand-out/', 'reports/', 'hooks/dist/', 'node_modules/', '*.log', '/tmp-*']) {
    assert.ok(gitignoreLines.includes(line), `${line} missing from .gitignore`);
  }
});
