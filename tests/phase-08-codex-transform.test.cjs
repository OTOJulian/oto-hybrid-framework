'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_ROOT = path.join(REPO_ROOT, 'tests/fixtures/runtime-parity/codex');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-codex.cjs'));
const { generateCodexAgentToml } = require(path.join(REPO_ROOT, 'bin/lib/codex-transform.cjs'));
const { version: OTO_VERSION } = require(path.join(REPO_ROOT, 'package.json'));

function read(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function readFixture(fileName) {
  return fs.readFileSync(path.join(FIXTURE_ROOT, fileName), 'utf8');
}

test('D-11 oto-executor agent transformed via runtime-codex.transformAgent matches fixture', () => {
  const source = read('oto/agents/oto-executor.md');
  assert.equal(adapter.transformAgent(source), readFixture('oto-executor.expected.md'));
});

test('D-11 oto-executor per-agent .toml emit matches fixture', () => {
  const source = read('oto/agents/oto-executor.md');
  const toml = generateCodexAgentToml(
    'oto-executor',
    source,
    adapter.agentSandboxes,
    null,
    null,
    { otoVersion: OTO_VERSION },
  );

  assert.equal(toml, readFixture('oto-executor.expected.toml'));
  assert.match(toml, /^# managed by oto v/m);
  assert.match(toml, /^sandbox_mode = "workspace-write"$/m);
});

test('D-11 transformed Codex output contains no retained upstream gsd- or superpowers- literals', () => {
  const source = read('oto/agents/oto-executor.md');
  const combined = [
    adapter.transformAgent(source),
    generateCodexAgentToml('oto-executor', source, adapter.agentSandboxes, null, null, { otoVersion: OTO_VERSION }),
  ].join('\n');

  assert.equal(/\bgsd-|superpowers-/.test(combined), false);
  assert.equal(/~\/\.claude\/|\$HOME\/\.claude\//.test(combined), false);
});

test('D-08 /oto-progress command transform output matches fixture', () => {
  assert.equal(
    adapter.transformCommand(read('oto/commands/oto/progress.md')),
    readFixture('oto-progress.expected.md'),
  );
});

test('D-08 oto:test-driven-development skill transform output matches fixture', () => {
  assert.equal(
    adapter.transformSkill(read('oto/skills/test-driven-development/SKILL.md')),
    readFixture('test-driven-development.expected.md'),
  );
});
