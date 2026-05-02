'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const adapter = require('../bin/lib/runtime-claude.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_ROOT = path.join(__dirname, 'fixtures/runtime-parity/claude');

function readRepo(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function readFixture(fileName) {
  return fs.readFileSync(path.join(FIXTURE_ROOT, fileName), 'utf8');
}

test('Pitfall 5 baseline: oto-executor agent through transformAgent is byte-identical to source', () => {
  const source = readRepo('oto/agents/oto-executor.md');
  const expected = readFixture('oto-executor.expected.md');
  assert.equal(adapter.transformAgent(source), expected, 'Claude transformAgent must remain identity');
  assert.equal(source, expected, 'Claude fixture must remain byte-identical to source');
});

test('Pitfall 5 baseline: /oto-progress command through transformCommand is byte-identical to source', () => {
  const source = readRepo('oto/commands/oto/progress.md');
  const expected = readFixture('oto-progress.expected.md');
  assert.equal(adapter.transformCommand(source), expected, 'Claude transformCommand must remain identity');
  assert.equal(source, expected, 'Claude fixture must remain byte-identical to source');
});

test('Pitfall 5 baseline: oto:test-driven-development skill through transformSkill is byte-identical to source', () => {
  const source = readRepo('oto/skills/test-driven-development/SKILL.md');
  const expected = readFixture('test-driven-development.expected.md');
  assert.equal(adapter.transformSkill(source), expected, 'Claude transformSkill must remain identity');
  assert.equal(source, expected, 'Claude fixture must remain byte-identical to source');
});

test('Pitfall 1/15 baseline: Claude fixture trio carries zero upstream identity literals', () => {
  for (const fileName of [
    'oto-executor.expected.md',
    'oto-progress.expected.md',
    'test-driven-development.expected.md',
  ]) {
    const content = readFixture(fileName);
    assert.equal(/\bgsd-/i.test(content), false, `${fileName}: gsd- literal leaked`);
    assert.equal(/\bsuperpowers\b/i.test(content), false, `${fileName}: superpowers literal leaked`);
  }
});
