'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

test('package.json has the locked top-level shape', () => {
  assert.deepEqual(Object.keys(pkg).sort(), [
    'author',
    'bin',
    'dependencies',
    'description',
    'engines',
    'files',
    'license',
    'name',
    'repository',
    'scripts',
    'version',
  ].sort());
  for (const key of ['main', 'exports', 'type', 'devDependencies', 'prepublishOnly']) {
    assert.equal(Object.hasOwn(pkg, key), false, `${key} must be omitted`);
  }
});

test('package metadata matches Phase 2 distribution decisions', () => {
  assert.equal(pkg.engines.node, '>=22.0.0');
  assert.equal(pkg.name, 'oto');
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(pkg.bin, { oto: 'bin/install.js', 'oto-sdk': 'bin/oto-sdk.js' });
  assert.deepEqual(pkg.dependencies, {
    '@anthropic-ai/claude-agent-sdk': '^0.2.84',
    ws: '^8.20.0',
  });
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.author, 'Julian Isaac');
});

test('scripts use install-time hook build and zero prepublishOnly', () => {
  assert.equal(pkg.scripts.postinstall, 'node scripts/build-hooks.js');
  assert.equal(Object.hasOwn(pkg.scripts, 'prepare'), false);
  assert.equal(pkg.scripts.test, 'node --test --test-concurrency=4 tests/*.test.cjs');
  assert.equal(pkg.scripts.rebrand, 'node scripts/rebrand.cjs --apply --force');
  assert.ok(pkg.scripts['rebrand:dry-run']);
  assert.ok(pkg.scripts['rebrand:roundtrip']);
  assert.equal('prepublishOnly' in pkg.scripts, false);
});

test('files allowlist includes only the intended package surface', () => {
  assert.deepEqual(pkg.files, [
    'bin/',
    'oto/',
    'hooks/',
    'scripts/rebrand/',
    'scripts/sync-upstream/',
    'scripts/build-hooks.js',
    'sdk/dist/',
    'sdk/package.json',
    'sdk/prompts/',
    'rename-map.json',
    'schema/',
    'package.json',
    'README.md',
    'LICENSE',
    'THIRD-PARTY-LICENSES.md',
  ]);
  assert.equal(pkg.files.includes('foundation-frameworks/'), false);
  assert.equal(pkg.files.includes('tests/'), false);
});

test('repository points to the public GitHub install target', () => {
  assert.equal(pkg.repository.url, 'git+https://github.com/OTOJulian/oto-hybrid-framework.git');
});
