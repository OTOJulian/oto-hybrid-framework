'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');
const SCRATCH = path.join(REPO_ROOT, '.oto-rebrand-out');

function sha256OfDirTree(root) {
  if (!fs.existsSync(root)) return '<absent>';
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

function roundtripLeftovers() {
  return fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith('oto-rebrand-rt-'));
}

function waitForNoRoundtripLeftovers() {
  const deadline = Date.now() + 5000;
  let leftovers = roundtripLeftovers();
  while (leftovers.length > 0 && Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    leftovers = roundtripLeftovers();
  }
  return leftovers;
}

test('verify-roundtrip does not touch .oto-rebrand-out', { timeout: 60000 }, () => {
  const before = sha256OfDirTree(SCRATCH);
  const result = childProcess.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--verify-roundtrip', '--target', 'foundation-frameworks/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  const after = sha256OfDirTree(SCRATCH);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(after, before);
});

test('verify-roundtrip cleans up temporary roundtrip directories', { timeout: 60000 }, () => {
  const result = childProcess.spawnSync(process.execPath, ['scripts/rebrand.cjs', '--verify-roundtrip', '--target', 'foundation-frameworks/'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const leftovers = waitForNoRoundtripLeftovers();
  assert.deepEqual(leftovers, []);
});
