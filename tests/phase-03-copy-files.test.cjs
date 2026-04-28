'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { copyTree, removeTree, sha256File, walkTree } = require('../bin/lib/copy-files.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 (copy, hash, walk, and remove primitives)
// Filled by: 03-04-PLAN.md (Wave 1) [STATUS: filled]
// Sources: 03-VALIDATION.md per-task verification map

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-copy-files-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

test('INS-04: copyTree returns 0 filesCopied when src absent', async (t) => {
  const dir = tmpDir(t);
  const src = path.join(dir, 'missing-src');
  const dst = path.join(dir, 'dst');

  assert.deepEqual(await copyTree(src, dst), { filesCopied: 0, files: [] });
  assert.equal(fs.existsSync(dst), false);

  const fileSrc = path.join(dir, 'file-src.txt');
  fs.writeFileSync(fileSrc, 'not a directory');
  await assert.rejects(
    () => copyTree(fileSrc, path.join(dir, 'file-dst')),
    /src must be a directory/
  );
});

test('INS-04: copyTree copies tree of files into dst recursively', async (t) => {
  const dir = tmpDir(t);
  const src = path.join(dir, 'src');
  const dst = path.join(dir, 'dst');
  fs.mkdirSync(path.join(src, 'a', 'b'), { recursive: true });
  fs.writeFileSync(path.join(src, 'root.txt'), 'root');
  fs.writeFileSync(path.join(src, 'a', 'b', 'c.txt'), 'nested');

  const result = await copyTree(src, dst);

  assert.equal(result.filesCopied, 2);
  assert.deepEqual(result.files.map((file) => file.relPath).sort(), ['a/b/c.txt', 'root.txt']);
  assert.equal(fs.readFileSync(path.join(dst, 'root.txt'), 'utf8'), 'root');
  assert.equal(fs.readFileSync(path.join(dst, 'a', 'b', 'c.txt'), 'utf8'), 'nested');
  for (const file of result.files) {
    assert.equal(file.absPath, path.join(dst, file.relPath));
  }
});

test('INS-04: copyTree-written files are not symlinks (lstat().isSymbolicLink() === false)', async (t) => {
  const dir = tmpDir(t);
  const src = path.join(dir, 'src');
  const dst = path.join(dir, 'dst');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(src, 'file.txt'), 'regular file');

  await copyTree(src, dst);

  assert.equal(fs.lstatSync(path.join(dst, 'file.txt')).isSymbolicLink(), false);
});

test('INS-04: copyTree rejects source tree containing a symlink', async (t) => {
  const dir = tmpDir(t);
  const src = path.join(dir, 'src');
  fs.mkdirSync(src, { recursive: true });
  fs.symlinkSync('/etc/hosts', path.join(src, 'evil'));

  await assert.rejects(
    () => copyTree(src, path.join(dir, 'dst')),
    /symlink not allowed/
  );
});

test('INS-04: sha256File returns deterministic 64-hex digest', async (t) => {
  const dir = tmpDir(t);
  const file = path.join(dir, 'hello.txt');
  fs.writeFileSync(file, 'hello world');

  const first = await sha256File(file);
  const second = await sha256File(file);

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
});

test('INS-04: walkTree returns [] for absent root', async (t) => {
  const dir = tmpDir(t);
  assert.deepEqual(await walkTree(path.join(dir, 'missing-root')), []);

  const root = path.join(dir, 'root');
  fs.mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
  fs.writeFileSync(path.join(root, 'a', 'b', 'c.txt'), 'c');
  fs.writeFileSync(path.join(root, 'a', 'd.txt'), 'd');
  fs.symlinkSync('/etc/hosts', path.join(root, 'a', 'host-link'));

  const files = await walkTree(root);
  assert.deepEqual(files.sort(), [
    path.join(root, 'a', 'b', 'c.txt'),
    path.join(root, 'a', 'd.txt'),
  ]);
  assert.equal(files.some((file) => fs.lstatSync(file).isDirectory()), false);
});

test('INS-04: removeTree is no-op for absent path', async (t) => {
  const dir = tmpDir(t);
  const absent = path.join(dir, 'absent');
  await removeTree(absent);
  assert.equal(fs.existsSync(absent), false);

  const populated = path.join(dir, 'populated');
  fs.mkdirSync(path.join(populated, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(populated, 'nested', 'file.txt'), 'remove me');
  await removeTree(populated);
  assert.equal(fs.existsSync(populated), false);
});
