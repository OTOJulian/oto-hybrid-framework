'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');
const COMMAND_RELATIVE_PATH = 'oto/commands/oto/migrate.md';
const COMMAND_PATH = path.join(REPO_ROOT, COMMAND_RELATIVE_PATH);

test('oto migrate command markdown declares command metadata and execution context', async () => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }
  assert.equal(typeof migrate.main, 'function');

  assert.equal(fs.existsSync(COMMAND_PATH), true, `${COMMAND_RELATIVE_PATH} should exist`);
  const body = fs.readFileSync(COMMAND_PATH, 'utf8');

  assert.match(body, /^---\n[\s\S]*name: oto:migrate/m);
  assert.match(body, /description:\s*\S+/);
  assert.match(body, /allowed-tools:[\s\S]*Read[\s\S]*Write[\s\S]*Edit[\s\S]*Bash/);
  assert.ok(body.includes('<objective>'));
  assert.ok(body.includes('<execution_context>'));
  assert.ok(body.includes('Claude Code, Codex, and Gemini runtime agent worktrees'));
  assert.equal(body.includes('.claude/worktrees/'), false);
});
