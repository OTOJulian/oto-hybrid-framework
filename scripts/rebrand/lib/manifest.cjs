'use strict';
const walker = require('./walker.cjs');

const TOKENS = ['gsd', 'GSD', 'Get Shit Done', 'superpowers', 'Superpowers'];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripAllowlistedContent(content, allowlist) {
  let stripped = content;
  for (const literal of allowlist.literals || []) {
    stripped = stripped.split(literal).join('');
  }
  for (const entry of allowlist.regexes || []) {
    stripped = stripped.replace(entry.regex, '');
  }
  return stripped;
}

function countTokens(content) {
  const counts = {};
  for (const token of TOKENS) {
    const matches = content.match(new RegExp(escapeRegExp(token), 'g'));
    counts[token] = matches ? matches.length : 0;
  }
  return counts;
}

async function build(root, allowlist, inventoryByPath) {
  const result = { version: '1', root, files: {} };
  for await (const { relPath, content, file_class, allowlisted } of walker.walk(root, allowlist, inventoryByPath)) {
    const countable = allowlisted ? '' : stripAllowlistedContent(content, allowlist);
    result.files[relPath] = {
      file_class,
      allowlisted: Boolean(allowlisted),
      counts: countTokens(countable)
    };
  }
  return result;
}

function pathGlobMatches(relPath, pathGlobs) {
  const normalized = relPath.split('\\').join('/');
  return pathGlobs.some((entry) => entry.regex.test(normalized));
}

function assertZeroOutsideAllowlist(postManifest, allowlist) {
  const failures = [];
  for (const [relPath, entry] of Object.entries(postManifest.files || {})) {
    if (entry.allowlisted || pathGlobMatches(relPath, allowlist.pathGlobs || [])) continue;
    for (const token of TOKENS) {
      const count = entry.counts[token] || 0;
      if (count > 0) failures.push({ path: relPath, token, count });
    }
  }
  return failures;
}

function buildPre(targetRoot, allowlist, inventoryByPath) {
  return build(targetRoot, allowlist, inventoryByPath);
}

function buildPost(outRoot, allowlist, inventoryByPath) {
  return build(outRoot, allowlist, inventoryByPath);
}

module.exports = { build, buildPre, buildPost, assertZeroOutsideAllowlist, TOKENS };
