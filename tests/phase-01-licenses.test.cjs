'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

test('LICENSE exists at repo root', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'LICENSE')), 'LICENSE missing');
});

test('LICENSE contains "Copyright (c) 2026 Julian Isaac"', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8');
  assert.match(content, /Copyright \(c\) 2026 Julian Isaac/, 'oto copyright line missing');
});

test('LICENSE contains "MIT License" header', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf8');
  assert.match(content, /^MIT License/m, 'MIT header missing');
});

test('THIRD-PARTY-LICENSES.md exists at repo root', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md')), 'THIRD-PARTY-LICENSES.md missing');
});

test('THIRD-PARTY-LICENSES.md contains Lex Christopherson copyright verbatim', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Copyright (c) 2025 Lex Christopherson'), 'GSD copyright line missing');
});

test('THIRD-PARTY-LICENSES.md contains Jesse Vincent copyright verbatim', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Copyright (c) 2025 Jesse Vincent'), 'Superpowers copyright line missing');
});

test('THIRD-PARTY-LICENSES.md contains MIT permission paragraph', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
  assert.ok(content.includes('Permission is hereby granted, free of charge'), 'MIT permission paragraph missing');
});
