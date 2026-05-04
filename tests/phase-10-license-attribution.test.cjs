'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const THIRD_PARTY = fs.readFileSync(path.join(REPO_ROOT, 'THIRD-PARTY-LICENSES.md'), 'utf8');
const GSD_LICENSE = fs.readFileSync(path.join(REPO_ROOT, 'foundation-frameworks/get-shit-done-main/LICENSE'), 'utf8');
const SUPERPOWERS_LICENSE = fs.readFileSync(path.join(REPO_ROOT, 'foundation-frameworks/superpowers-main/LICENSE'), 'utf8');

test('CI-06: THIRD-PARTY-LICENSES embeds GSD MIT license verbatim', () => {
  assert.ok(
    THIRD_PARTY.includes(GSD_LICENSE.trim()),
    'foundation-frameworks/get-shit-done-main/LICENSE body is not embedded verbatim',
  );
});

test('CI-06: THIRD-PARTY-LICENSES embeds Superpowers MIT license verbatim', () => {
  assert.ok(
    THIRD_PARTY.includes(SUPERPOWERS_LICENSE.trim()),
    'foundation-frameworks/superpowers-main/LICENSE body is not embedded verbatim',
  );
});

test('CI-06: upstream copyright lines are preserved verbatim', () => {
  assert.ok(THIRD_PARTY.includes('Copyright (c) 2025 Lex Christopherson'));
  assert.ok(THIRD_PARTY.includes('Copyright (c) 2025 Jesse Vincent'));
});
