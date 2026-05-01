'use strict';

const fsp = require('node:fs/promises');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const TOKEN_ALLOW_EXT = new Set(['.js', '.cjs', '.sh']);
const TOKEN_ALLOW_NAME = new Set(['oto-session-start']);
const TOKEN_DENY_PATH_CONTAINS = ['foundation-frameworks/', '__fixtures__/'];

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

function shouldSubstitute(relPath) {
  const norm = relPath.split(path.sep).join('/');
  for (const needle of TOKEN_DENY_PATH_CONTAINS) {
    if (norm.includes(needle)) return false;
  }

  const base = norm.split('/').pop() || '';
  if (base.startsWith('LICENSE')) return false;
  if (TOKEN_ALLOW_NAME.has(base)) return true;
  return TOKEN_ALLOW_EXT.has(path.extname(base));
}

function tokenReplace(text, replacements) {
  let out = text;
  for (const key of Object.keys(replacements || {})) {
    out = out.split('{{' + key + '}}').join(String(replacements[key]));
  }
  return out;
}

async function applyTokensToTree(rootDir, replacements) {
  const files = await walkTree(rootDir);
  let changed = 0;

  for (const absPath of files) {
    const relPath = path.relative(rootDir, absPath);
    if (!shouldSubstitute(relPath)) continue;

    const stat = fs.statSync(absPath);
    const text = fs.readFileSync(absPath, 'utf8');
    const replaced = tokenReplace(text, replacements);
    if (replaced === text) continue;

    fs.writeFileSync(absPath, replaced);
    try {
      fs.chmodSync(absPath, stat.mode & 0o777);
    } catch {
      // Windows may not support POSIX mode bits.
    }
    changed += 1;
  }

  return { changed, total: files.length };
}

async function copyTreeWithTokens(src, dst, opts = {}) {
  const result = await copyTree(src, dst, opts);
  const tokenResult = await applyTokensToTree(dst, opts.tokens || {});
  return {
    ...result,
    tokenFilesChanged: tokenResult.changed,
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

module.exports = {
  copyTree,
  removeTree,
  sha256File,
  walkTree,
  tokenReplace,
  shouldSubstitute,
  applyTokensToTree,
  copyTreeWithTokens,
};
