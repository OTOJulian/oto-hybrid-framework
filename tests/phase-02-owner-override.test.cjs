'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function setupFixture(t) {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-owner-src-'));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-owner-out-'));
  fs.copyFileSync(path.join(REPO_ROOT, 'tests', 'fixtures', 'rebrand', 'url-attribution.md'), path.join(src, 'url-attribution.md'));
  t.after(() => {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
  });
  return { src, out };
}

test('engine owner override controls URL substitution', { timeout: 30000 }, async (t) => {
  const { src, out } = setupFixture(t);
  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'someone' });
  assert.equal(result.exitCode, 0);
  const text = fs.readFileSync(path.join(out, 'url-attribution.md'), 'utf8');
  assert.match(text, /github\.com\/someone\/oto-hybrid-framework\/issues\/123/);
});

test('engine defaults URL substitution owner to OTOJulian', { timeout: 30000 }, async (t) => {
  const { src, out } = setupFixture(t);
  const result = await engine.run({ mode: 'apply', target: src, out });
  assert.equal(result.exitCode, 0);
  const text = fs.readFileSync(path.join(out, 'url-attribution.md'), 'utf8');
  assert.match(text, /github\.com\/OTOJulian\/oto-hybrid-framework\/issues\/123/);
});
