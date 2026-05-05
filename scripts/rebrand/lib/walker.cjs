'use strict';
const fs = require('node:fs');
const path = require('node:path');

const SCRATCH_DIRS = new Set(['node_modules', '.git', '.oto-rebrand-out', 'reports']);
const SCRATCH_PATH_PREFIXES = ['.claude/worktrees', '.codex/worktrees', '.gemini/worktrees'];
const BINARY_EXTENSION_RE = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|pdf|zip|tar|gz|bin)$/i;
const PATH_ALLOWLIST_BASENAMES = new Set(['LICENSE', 'LICENSE.md', 'THIRD-PARTY-LICENSES.md']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(glob) {
  if (PATH_ALLOWLIST_BASENAMES.has(glob)) {
    return new RegExp(`(^|.*/)${escapeRegExp(glob)}$`);
  }
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        source += '.*';
        i += 1;
      } else {
        source += '[^/]*';
      }
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`);
}

function compileAllowlist(doNotRename = []) {
  const compiled = { pathGlobs: [], literals: [], regexes: [] };
  for (const entry of doNotRename) {
    if (typeof entry === 'string') {
      if (entry.includes('://') || entry.startsWith('github.com/')) {
        compiled.literals.push(entry);
      } else if (entry.includes('/') || entry.includes('*') || PATH_ALLOWLIST_BASENAMES.has(entry)) {
        compiled.pathGlobs.push({ source: entry, regex: globToRegExp(entry) });
      } else {
        compiled.literals.push(entry);
      }
    } else if (entry && typeof entry.pattern === 'string') {
      compiled.regexes.push({ source: entry.pattern, regex: new RegExp(entry.pattern), reason: entry.reason });
    }
  }
  return compiled;
}

function isBinaryByExtension(relPath) {
  return BINARY_EXTENSION_RE.test(relPath);
}

function hasNulByte(buffer) {
  return buffer.includes(0);
}

function normalizeRelPath(relPath) {
  return relPath.split(path.sep).join('/');
}

function isScratchPath(relPath) {
  if (relPath.split(path.sep).some((part) => SCRATCH_DIRS.has(part))) return true;
  const normalized = normalizeRelPath(relPath);
  return SCRATCH_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function matchesPathGlob(relPath, pathGlobs) {
  const normalized = normalizeRelPath(relPath);
  return pathGlobs.some((entry) => entry.regex.test(normalized));
}

function lookupFileClass(relPath, inventoryByPath = new Map()) {
  const normalized = normalizeRelPath(relPath);
  const entry = inventoryByPath.get(normalized) || inventoryByPath.get(relPath);
  return entry && entry.category ? entry.category : 'other';
}

function collectEntries(root) {
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  return entries.map((entry) => {
    const parent = entry.parentPath || entry.path || root;
    return { entry, absPath: path.join(parent, entry.name) };
  });
}

async function* walk(root, allowlist = compileAllowlist(), inventoryByPath = new Map()) {
  const entries = collectEntries(root);
  for (const { entry, absPath } of entries) {
    const relPath = path.relative(root, absPath);
    if (!relPath || isScratchPath(relPath) || !entry.isFile() || isBinaryByExtension(relPath)) continue;

    const buffer = fs.readFileSync(absPath);
    if (hasNulByte(buffer)) continue;

    const content = buffer.toString('utf8');
    const file_class = lookupFileClass(relPath, inventoryByPath);
    const allowlisted = matchesPathGlob(relPath, allowlist.pathGlobs);
    yield { relPath, absPath, content, file_class, allowlisted };
  }
}

module.exports = {
  compileAllowlist,
  globToRegExp,
  isBinaryByExtension,
  isScratchPath,
  lookupFileClass,
  walk
};
