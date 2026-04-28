'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rule = require('../scripts/rebrand/lib/rules/skill_ns.cjs');

const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '' };
const skillRule = { from: 'superpowers:', to: 'oto:' };

test('skill_ns rewrites superpowers namespace', () => {
  const out = rule.apply('Skill(skill="superpowers:test-driven-development")', skillRule, ctx);
  assert.equal(out.text, 'Skill(skill="oto:test-driven-development")');
  assert.equal(out.replacements, 1);
});

test('skill_ns boundary avoids embedded namespace text', () => {
  const out = rule.apply('see unsuperpowers:foo', skillRule, ctx);
  assert.equal(out.text, 'see unsuperpowers:foo');
  assert.equal(out.replacements, 0);
});
