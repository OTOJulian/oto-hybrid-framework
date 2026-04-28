'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ruleModule = require('../scripts/rebrand/lib/rules/url.cjs');

const rule = {
  from: 'github.com/gsd-build/get-shit-done',
  to: 'github.com/{{GITHUB_OWNER}}/oto-hybrid-framework',
  preserve_in_attribution: true
};
const ctx = { owner: 'OTOJulian', allowlist: { pathGlobs: [], literals: [], regexes: [] }, fileClass: 'other', filePath: 'README.md', fileContent: '' };

test('url rewrites using default owner', () => {
  const out = ruleModule.apply('see github.com/gsd-build/get-shit-done/issues', rule, ctx);
  assert.equal(out.text, 'see github.com/OTOJulian/oto-hybrid-framework/issues');
  assert.equal(out.replacements, 1);
});

test('url rewrites using context owner override', () => {
  const out = ruleModule.apply('see github.com/gsd-build/get-shit-done/issues', rule, { ...ctx, owner: 'someone' });
  assert.equal(out.text, 'see github.com/someone/oto-hybrid-framework/issues');
});

test('url preserves copyright attribution lines', () => {
  const out = ruleModule.apply('Copyright (c) 2025 see github.com/gsd-build/get-shit-done', rule, ctx);
  assert.equal(out.replacements, 0);
});

test('url preserves third-party license file context', () => {
  const out = ruleModule.apply('see github.com/gsd-build/get-shit-done', rule, { ...ctx, filePath: 'THIRD-PARTY-LICENSES.md' });
  assert.equal(out.replacements, 0);
});

test('url rewrites non-attribution URL occurrences', () => {
  const out = ruleModule.apply('regular text github.com/gsd-build/get-shit-done/issues/123', rule, ctx);
  assert.equal(out.text, 'regular text github.com/OTOJulian/oto-hybrid-framework/issues/123');
  assert.equal(out.replacements, 1);
});
