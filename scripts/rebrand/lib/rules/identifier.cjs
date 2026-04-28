'use strict';
const path = require('node:path');

// Implements the RESEARCH.md identifier.cjs boundary strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function applyCase(value, variant) {
  if (variant === 'upper') return value.toUpperCase();
  if (variant === 'title') return titleCase(value);
  if (variant === 'lower') return value.toLowerCase();
  return value;
}

function variantPairs(rule) {
  if (!Array.isArray(rule.case_variants) || rule.case_variants.length === 0) {
    return [{ from: rule.from, to: rule.to }];
  }
  return rule.case_variants.map((variant) => ({
    from: applyCase(rule.from, variant),
    to: applyCase(rule.to, variant)
  }));
}

function compilePattern(from, boundary = 'word') {
  const escaped = escapeRegExp(from);
  if (boundary === 'exact') return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, 'g');
  if (boundary === 'prefix') return new RegExp(`\\b${escaped}`, 'g');
  return new RegExp(`\\b${escaped}\\b`, 'g');
}

function inDoNotMatchWindow(fullText, offset, match, doNotMatch = []) {
  if (!Array.isArray(doNotMatch) || doNotMatch.length === 0) return false;
  const start = Math.max(0, offset - 64);
  const end = Math.min(fullText.length, offset + match.length + 64);
  const window = fullText.slice(start, end);
  return doNotMatch.some((literal) => window.includes(literal));
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function apply(text, rule, context = {}) {
  void context;
  let replacements = 0;
  let output = text;
  for (const pair of variantPairs(rule)) {
    const pattern = compilePattern(pair.from, rule.boundary);
    output = output.replace(pattern, (match, offset, fullText) => {
      if (inDoNotMatchWindow(fullText, offset, match, rule.do_not_match)) return match;
      replacements += 1;
      return pair.to;
    });
  }
  return { text: output, replacements };
}

function listMatches(text, rule, context = {}) {
  void context;
  const matches = [];
  for (const pair of variantPairs(rule)) {
    const pattern = compilePattern(pair.from, rule.boundary);
    for (const match of text.matchAll(pattern)) {
      const classification = inDoNotMatchWindow(text, match.index, match[0], rule.do_not_match) ? 'preserve' : 'rename';
      const pos = lineCol(text, match.index);
      matches.push({ from: match[0], to: pair.to, line: pos.line, col: pos.col, classification });
    }
  }
  return matches.sort((a, b) => a.line - b.line || a.col - b.col);
}

function classify(token, rule, context = {}) {
  void context;
  for (const pair of variantPairs(rule)) {
    const pattern = compilePattern(pair.from, rule.boundary);
    const matched = pattern.test(token);
    pattern.lastIndex = 0;
    if (matched) {
      if (Array.isArray(rule.do_not_match) && rule.do_not_match.includes(token)) return 'skip';
      return 'match';
    }
  }
  return 'unclassified';
}

module.exports = { classify, apply, listMatches };
