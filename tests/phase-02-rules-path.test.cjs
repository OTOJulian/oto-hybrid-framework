'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rule = require('../scripts/rebrand/lib/rules/path.cjs');

const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '' };
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'rebrand', 'path-edge.txt'), 'utf8');

test('path rewrites segment matches while preserving surrounding quotes', () => {
  const out = rule.apply("see '.planning/STATE.md'", { from: '.planning', to: '.oto', match: 'segment' }, ctx);
  assert.equal(out.text, "see '.oto/STATE.md'");
});

test('path rewrites path prefixes', () => {
  const out = rule.apply('cat get-shit-done/bin/install.js', { from: 'get-shit-done/', to: 'oto/', match: 'prefix' }, ctx);
  assert.equal(out.text, 'cat oto/bin/install.js');
});

test('path rewrites agent filename prefixes', () => {
  const out = rule.apply('agents/gsd-planner.md', { from: 'agents/gsd-', to: 'agents/oto-', match: 'prefix' }, ctx);
  assert.equal(out.text, 'agents/oto-planner.md');
});

test('path applyToFilename rewrites filenames', () => {
  const rules = [{ from: 'agents/gsd-', to: 'agents/oto-', match: 'prefix' }];
  assert.equal(rule.applyToFilename('agents/gsd-planner.md', rules), 'agents/oto-planner.md');
});

test('path listMatches reports fixture paths', () => {
  const matches = rule.listMatches(fixture, { from: '.planning', to: '.oto', match: 'segment' }, ctx);
  assert.equal(matches.length, 2);
  assert.ok(matches.every((match) => match.classification === 'rename'));
});
