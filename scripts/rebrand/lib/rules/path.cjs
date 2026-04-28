'use strict';
const path = require('node:path');

// Implements the RESEARCH.md path.cjs segment and prefix rewrite strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(rule) {
  const escaped = escapeRegExp(rule.from);
  if (rule.match === 'prefix') return new RegExp(`(^|[\\s"'])${escaped}`, 'g');
  if (rule.match === 'exact') return new RegExp(`(^|[\\s"'])${escaped}([\\s"']|$)`, 'g');
  return new RegExp(`(^|[/"'\\s])${escaped}([/"'\\s]|$)`, 'g');
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
  const output = text.replace(pattern, (match, prefix, suffixOrOffset, maybeOffset) => {
    replacements += 1;
    if (rule.match === 'prefix') return `${prefix}${rule.to}`;
    return `${prefix}${rule.to}${suffixOrOffset}`;
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
    matches.push({ from: rule.from, to: rule.to, line: pos.line, col: pos.col, classification: 'rename' });
  }
  return matches;
}

function classify(token, rule, context = {}) {
  void context;
  if (rule.match === 'prefix' && token.startsWith(rule.from)) return 'match';
  if (rule.match === 'segment' && token.split('/').includes(rule.from)) return 'match';
  if (rule.match === 'exact' && token === rule.from) return 'match';
  return 'unclassified';
}

function applyToFilename(filename, pathRules) {
  const rules = Array.isArray(pathRules) ? pathRules : [pathRules];
  let output = filename;
  for (const rule of rules) {
    if (!rule) continue;
    if (rule.match === 'prefix' && output.startsWith(rule.from)) {
      output = `${rule.to}${output.slice(rule.from.length)}`;
    } else if (rule.match === 'segment') {
      output = output.split('/').map((segment) => segment === rule.from ? rule.to : segment).join('/');
    } else if (rule.match === 'exact' && output === rule.from) {
      output = rule.to;
    }
  }
  return output;
}

module.exports = { classify, apply, listMatches, applyToFilename };
