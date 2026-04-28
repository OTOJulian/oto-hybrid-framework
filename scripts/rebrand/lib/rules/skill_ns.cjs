'use strict';

// Implements the RESEARCH.md skill_ns.cjs namespace rewrite strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(rule) {
  return new RegExp(`\\b${escapeRegExp(rule.from)}([a-z][a-z0-9-]*)\\b`, 'g');
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function apply(text, rule, context = {}) {
  void context;
  let replacements = 0;
  const output = text.replace(compilePattern(rule), (match, suffix) => {
    replacements += 1;
    return `${rule.to}${suffix}`;
  });
  return { text: output, replacements };
}

function listMatches(text, rule, context = {}) {
  void context;
  const matches = [];
  const pattern = compilePattern(rule);
  for (const match of text.matchAll(pattern)) {
    const pos = lineCol(text, match.index);
    matches.push({ from: `${rule.from}${match[1]}`, to: `${rule.to}${match[1]}`, line: pos.line, col: pos.col, classification: 'rename' });
  }
  return matches;
}

function classify(token, rule, context = {}) {
  void context;
  const pattern = new RegExp(`^${escapeRegExp(rule.from)}[a-z][a-z0-9-]*$`);
  return pattern.test(token) ? 'match' : 'unclassified';
}

module.exports = { classify, apply, listMatches };
