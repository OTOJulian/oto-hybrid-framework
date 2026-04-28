'use strict';

const fsp = require('node:fs/promises');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function assertNoSymlinks(root) {
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink()) {
    throw new Error('copyTree: symlink not allowed in source tree: ' + root);
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error('copyTree: symlink not allowed in source tree: ' + absPath);
    }
    if (entry.isDirectory()) {
      assertNoSymlinks(absPath);
    }
  }
}

async function copyTree(src, dst, opts = {}) {
  void opts;

  if (!fs.existsSync(src)) {
    return { filesCopied: 0, files: [] };
  }

  const srcStat = fs.statSync(src);
  if (!srcStat.isDirectory()) {
    throw new Error('copyTree: src must be a directory, got file: ' + src);
  }

  assertNoSymlinks(src);
  await fsp.mkdir(dst, { recursive: true });
  await fsp.cp(src, dst, {
    recursive: true,
    force: true,
    errorOnExist: false,
    dereference: false,
  });

  const files = await walkTree(dst);
  return {
    filesCopied: files.length,
    files: files.map((absPath) => ({
      absPath,
      relPath: path.relative(dst, absPath),
    })),
  };
}

async function removeTree(dst) {
  await fsp.rm(dst, { recursive: true, force: true });
}

async function walkTree(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink()) {
    return [];
  }
  if (rootStat.isFile()) {
    return [root];
  }

  const out = [];

  async function rec(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        await rec(absPath);
      } else if (entry.isFile()) {
        out.push(absPath);
      }
    }
  }

  await rec(root);
  return out;
}

async function sha256File(absPath) {
  const buf = await fsp.readFile(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

module.exports = { copyTree, removeTree, sha256File, walkTree };
