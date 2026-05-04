'use strict';
// D-10-05: This test ships and asserts unconditionally. Wave 0 EXPECTS
// failure against the stub README; Wave 1's README rewrite makes it pass.
// Whole-suite stub-bypass is FORBIDDEN. Rejects placeholder pattern vX\\.Y\\.Z.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const README = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
const INSTALL_URL_RE = /npm install -g .+\/archive\/v\d+\.\d+\.\d+(?:[-+][\w.-]+)?\.tar\.gz/;

test('DOC-01: README has install URL with concrete archive/v semver tarball', () => {
  assert.match(README, INSTALL_URL_RE, 'README install URL must contain archive/v<semver>.tar.gz');
  assert.doesNotMatch(README, /\barchive\/vX\.Y\.Z\b/);
});

test('DOC-01: README has Install section', () => {
  assert.match(README, /^## Install/m);
});

test('DOC-01: README has Attribution section', () => {
  assert.match(README, /^## Attribution/m);
});

test('DOC-01: README links to commands index', () => {
  assert.ok(README.includes('commands/INDEX.md'));
});

test('DOC-01: README links to third-party licenses', () => {
  assert.ok(README.includes('THIRD-PARTY-LICENSES.md'));
});
