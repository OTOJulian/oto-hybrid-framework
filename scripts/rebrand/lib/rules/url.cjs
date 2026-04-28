'use strict';
const path = require('node:path');

// Implements the RESEARCH.md url.cjs attribution-preserving URL rewrite strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveTo(rule, context) {
  return rule.to.replace('{{GITHUB_OWNER}}', context.owner || 'OTOJulian');
}

function lineBounds(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const next = text.indexOf('\n', index);
  const end = next === -1 ? text.length : next;
  return { start, end, line: text.slice(start, end) };
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function isAttributionContext(line, filePath = '') {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized === 'THIRD-PARTY-LICENSES.md' || normalized.endsWith('/THIRD-PARTY-LICENSES.md')) return true;
  if (normalized === 'LICENSE' || normalized === 'LICENSE.md' || normalized.endsWith('/LICENSE') || normalized.endsWith('/LICENSE.md')) return true;
  if (/non-attribution/i.test(line)) return false;
  if (/(copyright|\(c\)|attribution|upstream|original|based on)/i.test(line)) return true;
  return /\[.*?(upstream|original|based on).*?\]/i.test(line);
}

function compilePattern(rule) {
  return new RegExp(escapeRegExp(rule.from), 'g');
}

function apply(text, rule, context = {}) {
  const resolvedTo = resolveTo(rule, context);
  let replacements = 0;
  const output = text.replace(compilePattern(rule), (match, offset, fullText) => {
    const { line } = lineBounds(fullText, offset);
    if (rule.preserve_in_attribution === true && isAttributionContext(line, context.filePath)) return match;
    replacements += 1;
    return resolvedTo;
  });
  return { text: output, replacements };
}

function listMatches(text, rule, context = {}) {
  const matches = [];
  const resolvedTo = resolveTo(rule, context);
  for (const match of text.matchAll(compilePattern(rule))) {
    const { line } = lineBounds(text, match.index);
    const classification = rule.preserve_in_attribution === true && isAttributionContext(line, context.filePath) ? 'preserve' : 'rename';
    const pos = lineCol(text, match.index);
    matches.push({ from: match[0], to: resolvedTo, line: pos.line, col: pos.col, classification });
  }
  return matches;
}

function classify(token, rule, context = {}) {
  if (!compilePattern(rule).test(token)) return 'unclassified';
  if (rule.preserve_in_attribution === true && isAttributionContext(token, context.filePath)) return 'skip';
  return 'match';
}

module.exports = { classify, apply, listMatches };
