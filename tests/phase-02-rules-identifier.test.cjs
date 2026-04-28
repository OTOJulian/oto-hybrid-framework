'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rule = require('../scripts/rebrand/lib/rules/identifier.cjs');

const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'fixture', fileContent: '' };
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'rebrand', 'identifier-edge.txt'), 'utf8');

test('identifier rewrites lower word-boundary tokens', () => {
  const out = rule.apply('use gsd here', { from: 'gsd', to: 'oto', boundary: 'word', case_variants: ['lower'] }, ctx);
  assert.equal(out.text, 'use oto here');
  assert.equal(out.replacements, 1);
});

test('identifier rewrites upper and title case variants', () => {
  const upper = rule.apply('GSD foo', { from: 'gsd', to: 'oto', boundary: 'word', case_variants: ['lower', 'upper'] }, ctx);
  const title = rule.apply('Gsd foo', { from: 'gsd', to: 'oto', boundary: 'word', case_variants: ['lower', 'title'] }, ctx);
  assert.equal(upper.text, 'OTO foo');
  assert.equal(title.text, 'Oto foo');
});

test('identifier does not rewrite substring collisions', () => {
  const out = rule.apply('stagsd gsdfoo megsd', { from: 'gsd', to: 'oto', boundary: 'word' }, ctx);
  assert.equal(out.text, 'stagsd gsdfoo megsd');
  assert.equal(out.replacements, 0);
});

test('identifier distinguishes word and exact hyphen boundaries', () => {
  const word = rule.apply('get-shit-done is here', { from: 'get-shit-done', to: 'oto', boundary: 'word' }, ctx);
  const exact = rule.apply('get-shit-done-cc is here', { from: 'get-shit-done', to: 'oto', boundary: 'exact' }, ctx);
  assert.equal(word.text, 'oto is here');
  assert.equal(exact.text, 'get-shit-done-cc is here');
});

test('identifier honors do_not_match literal windows', () => {
  const out = rule.apply(
    'see Superpowers (the upstream framework) for context',
    { from: 'superpowers', to: 'oto', boundary: 'word', case_variants: ['title'], do_not_match: ['Superpowers (the upstream framework)'] },
    ctx
  );
  assert.equal(out.text, 'see Superpowers (the upstream framework) for context');
  assert.equal(out.replacements, 0);
});

test('identifier classify reports match or unclassified', () => {
  assert.equal(rule.classify('gsd', { from: 'gsd', boundary: 'word' }, ctx), 'match');
  assert.equal(rule.classify('stagsd', { from: 'gsd', boundary: 'word' }, ctx), 'unclassified');
});

test('identifier listMatches enumerates positives and excludes substring negatives', () => {
  const matches = rule.listMatches(fixture, { from: 'gsd', to: 'oto', boundary: 'word', case_variants: ['lower', 'upper', 'title'] }, ctx);
  assert.ok(matches.some((match) => match.from === 'gsd' && match.classification === 'rename'));
  assert.ok(matches.some((match) => match.from === 'GSD' && match.to === 'OTO'));
  assert.equal(matches.some((match) => match.from === 'stagsd'), false);
  assert.equal(matches.some((match) => match.from === 'gsdfoo'), false);
});
