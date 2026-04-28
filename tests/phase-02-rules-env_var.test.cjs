'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ruleModule = require('../scripts/rebrand/lib/rules/env_var.cjs');

const rule = { from: 'GSD_', to: 'OTO_', apply_to_pattern: '^GSD_[A-Z][A-Z0-9_]*$' };
const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '' };

test('env_var rewrites bounded env vars', () => {
  const out = ruleModule.apply('process.env.GSD_VERSION', rule, ctx);
  assert.equal(out.text, 'process.env.OTO_VERSION');
  assert.equal(out.replacements, 1);
});

test('env_var does not rewrite embedded tokens', () => {
  const out = ruleModule.apply('MY_GSD_VAR', rule, ctx);
  assert.equal(out.replacements, 0);
});

test('env_var does not rewrite wrong-shape lowercase tokens', () => {
  const out = ruleModule.apply('GSD_lowercase_thing', rule, ctx);
  assert.equal(out.replacements, 0);
});

test('env_var rewrites multiple tokens on one line', () => {
  const out = ruleModule.apply('GSD_RUNTIME=foo GSD_VERSION=bar', rule, ctx);
  assert.equal(out.text, 'OTO_RUNTIME=foo OTO_VERSION=bar');
  assert.equal(out.replacements, 2);
});

test('env_var honors literal allowlist while rewriting adjacent matches', () => {
  const out = ruleModule.apply('CLAUDE_PLUGIN_ROOT=foo GSD_VERSION=bar', rule, { ...ctx, allowlist: { pathGlobs: [], literals: ['CLAUDE_PLUGIN_ROOT'], regexes: [] } });
  assert.equal(out.text, 'CLAUDE_PLUGIN_ROOT=foo OTO_VERSION=bar');
  assert.equal(out.replacements, 1);
});
