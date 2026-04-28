'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rule = require('../scripts/rebrand/lib/rules/package.cjs');

const fixturePath = path.join(__dirname, 'fixtures', 'rebrand', 'package-fixture.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('package rewrites name field', () => {
  const out = rule.apply(loadFixture(), { from: 'get-shit-done-cc', to: 'oto', fields: ['name', 'bin'] }, {});
  assert.equal(out.pkg.name, 'oto');
  assert.equal(out.replacements, 2);
});

test('package rewrites bin object key', () => {
  const out = rule.apply(loadFixture(), { from: 'get-shit-done-cc', to: 'oto', fields: ['name', 'bin'] }, {});
  assert.equal(out.pkg.bin.oto, './bin/cli.js');
  assert.equal(out.pkg.bin['get-shit-done-cc'], undefined);
});

test('package applies separate bin rules sequentially', () => {
  const first = rule.apply(loadFixture(), { from: 'get-shit-done-cc', to: 'oto', fields: ['name', 'bin'] }, {});
  const second = rule.apply(first.pkg, { from: 'gsd-sdk', to: 'oto-sdk', fields: ['bin'] }, {});
  assert.equal(second.pkg.bin['oto-sdk'], './bin/sdk.js');
  assert.equal(second.pkg.bin['gsd-sdk'], undefined);
});

test('package applies only to package.json basenames', () => {
  assert.equal(rule.applies('package.json'), true);
  assert.equal(rule.applies('/tmp/project/package.json'), true);
  assert.equal(rule.applies('foo.md'), false);
});
