'use strict';

// Implements the RESEARCH.md env_var.cjs bounded env-var rewrite strategy.

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(rule) {
  return new RegExp(`\\b${escapeRegExp(rule.from)}[A-Z][A-Z0-9_]*\\b`, 'g');
}

function lineCol(text, index) {
  const before = text.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function allowlisted(token, context = {}) {
  return Boolean(context.allowlist && Array.isArray(context.allowlist.literals) && context.allowlist.literals.includes(token));
}

function validShape(token, rule) {
  if (!rule.apply_to_pattern) return true;
  return new RegExp(rule.apply_to_pattern).test(token);
}

function apply(text, rule, context = {}) {
  let replacements = 0;
  const output = text.replace(compilePattern(rule), (match) => {
    if (!validShape(match, rule) || allowlisted(match, context)) return match;
    replacements += 1;
    return `${rule.to}${match.slice(rule.from.length)}`;
  });
  return { text: output, replacements };
}

function listMatches(text, rule, context = {}) {
  const matches = [];
  for (const match of text.matchAll(compilePattern(rule))) {
    if (!validShape(match[0], rule)) continue;
    const classification = allowlisted(match[0], context) ? 'preserve' : 'rename';
    const pos = lineCol(text, match.index);
    matches.push({ from: match[0], to: `${rule.to}${match[0].slice(rule.from.length)}`, line: pos.line, col: pos.col, classification });
  }
  return matches;
}

function classify(token, rule, context = {}) {
  if (!new RegExp(`^${escapeRegExp(rule.from)}[A-Z][A-Z0-9_]*$`).test(token) || !validShape(token, rule)) return 'unclassified';
  return allowlisted(token, context) ? 'skip' : 'match';
}

module.exports = { classify, apply, listMatches };
