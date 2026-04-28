'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rule = require('../scripts/rebrand/lib/rules/command.cjs');

const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '' };
const commandRule = { from: '/gsd-', to: '/oto-' };
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'rebrand', 'command-vs-skill_ns.md'), 'utf8');

test('command rewrites slash command prefixes', () => {
  const out = rule.apply('see /gsd-plan-phase here', commandRule, ctx);
  assert.equal(out.text, 'see /oto-plan-phase here');
});

test('command does not touch skill namespace syntax', () => {
  const out = rule.apply('Skill(skill="gsd:do")', commandRule, ctx);
  assert.equal(out.replacements, 0);
});

test('command fixture rewrites only slash command occurrences', () => {
  const out = rule.apply(fixture, commandRule, ctx);
  assert.equal(out.text.includes('/oto-do'), true);
  assert.equal(out.text.includes('Skill(skill="gsd:do")'), true);
  assert.equal(out.text.includes('not-a-command-/gsd-something'), true);
  assert.equal(out.replacements, 1);
});
