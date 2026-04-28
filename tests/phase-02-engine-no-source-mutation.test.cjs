'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const TARGET = path.join(REPO_ROOT, 'foundation-frameworks');

function sha256OfDirTree(root) {
  const hash = crypto.createHash('sha256');
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath || entry.path || root;
      const absPath = path.join(parent, entry.name);
      return path.relative(root, absPath);
    })
    .sort();
  for (const relPath of files) {
    hash.update(relPath);
    hash.update(fs.readFileSync(path.join(root, relPath)));
  }
  return hash.digest('hex');
}

test('engine apply never mutates the source tree', { timeout: 30000 }, async (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-no-mutation-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const before = sha256OfDirTree(TARGET);
  const result = await engine.run({ mode: 'apply', target: TARGET, out, owner: 'OTOJulian' });
  const after = sha256OfDirTree(TARGET);
  assert.equal(result.exitCode, 0);
  assert.equal(after, before);
});

test('engine dry-run never creates an output tree and does not mutate source', { timeout: 30000 }, async () => {
  const before = sha256OfDirTree(TARGET);
  const out = path.join(os.tmpdir(), `oto-dryrun-out-${Date.now()}`);
  const result = await engine.run({ mode: 'dry-run', target: TARGET, out, owner: 'OTOJulian' });
  const after = sha256OfDirTree(TARGET);
  assert.equal(result.exitCode, 0);
  assert.equal(after, before);
  assert.equal(fs.existsSync(out), false);
});
