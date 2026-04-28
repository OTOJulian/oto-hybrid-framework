'use strict';

// Implements the RESEARCH.md command.cjs slash-command rewrite strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(rule) {
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(rule.from)}([a-z][a-z0-9-]*)\\b`, 'g');
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function apply(text, rule, context = {}) {
  void context;
  let replacements = 0;
  const pattern = compilePattern(rule);
  const output = text.replace(pattern, (match, prefix, suffix) => {
    replacements += 1;
    return `${prefix}${rule.to}${suffix}`;
  });
  return { text: output, replacements };
}

function listMatches(text, rule, context = {}) {
  void context;
  const matches = [];
  const pattern = compilePattern(rule);
  for (const match of text.matchAll(pattern)) {
    const prefix = match[1] || '';
    const offset = match.index + prefix.length;
    const pos = lineCol(text, offset);
    matches.push({ from: `${rule.from}${match[2]}`, to: `${rule.to}${match[2]}`, line: pos.line, col: pos.col, classification: 'rename' });
  }
  return matches;
}

function classify(token, rule, context = {}) {
  void context;
  return new RegExp(`^${escapeRegExp(rule.from)}[a-z][a-z0-9-]*$`).test(token) ? 'match' : 'unclassified';
}

module.exports = { classify, apply, listMatches };
