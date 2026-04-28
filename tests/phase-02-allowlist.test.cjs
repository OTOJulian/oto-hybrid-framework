'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function tempPair(t, prefix) {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-src-`));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-out-`));
  t.after(() => {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
  });
  return { src, out };
}

test('engine copies nested LICENSE files byte-for-byte while rewriting other files', { timeout: 30000 }, async (t) => {
  const { src, out } = tempPair(t, 'oto-allowlist');
  const licenseSrc = path.join(REPO_ROOT, 'foundation-frameworks', 'get-shit-done-main', 'LICENSE');
  fs.mkdirSync(path.join(src, 'get-shit-done-main'), { recursive: true });
  fs.copyFileSync(licenseSrc, path.join(src, 'get-shit-done-main', 'LICENSE'));
  fs.writeFileSync(path.join(src, 'foo.md'), 'run gsd now\n');

  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian' });
  assert.equal(result.exitCode, 0);
  assert.equal(sha256(path.join(out, 'get-shit-done-main', 'LICENSE')), sha256(licenseSrc));
  assert.equal(fs.readFileSync(path.join(out, 'foo.md'), 'utf8'), 'run oto now\n');
  assert.equal((fs.readFileSync(path.join(out, 'get-shit-done-main', 'LICENSE'), 'utf8').match(/Copyright \(c\) 2025 Lex Christopherson/g) || []).length, 1);
});

test('engine copies THIRD-PARTY-LICENSES.md and root LICENSE byte-for-byte', { timeout: 30000 }, async (t) => {
  const { src, out } = tempPair(t, 'oto-allowlist');
  for (const file of ['THIRD-PARTY-LICENSES.md', 'LICENSE']) {
    fs.copyFileSync(path.join(REPO_ROOT, file), path.join(src, file));
  }
  fs.writeFileSync(path.join(src, 'bar.md'), 'run gsd now\n');
  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian' });
  assert.equal(result.exitCode, 0);
  assert.equal(sha256(path.join(out, 'THIRD-PARTY-LICENSES.md')), sha256(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md')));
  assert.equal(sha256(path.join(out, 'LICENSE')), sha256(path.join(REPO_ROOT, 'LICENSE')));
});

test('engine preserves upstream URLs in attribution context', { timeout: 30000 }, async (t) => {
  const { src, out } = tempPair(t, 'oto-allowlist');
  fs.writeFileSync(path.join(src, 'attribution.md'), 'Copyright 2025 see github.com/gsd-build/get-shit-done\nregular github.com/gsd-build/get-shit-done/issues\n');
  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian' });
  assert.equal(result.exitCode, 0);
  const text = fs.readFileSync(path.join(out, 'attribution.md'), 'utf8');
  assert.match(text, /Copyright 2025 see github\.com\/gsd-build\/get-shit-done/);
  assert.match(text, /regular github\.com\/OTOJulian\/oto-hybrid-framework\/issues/);
});
