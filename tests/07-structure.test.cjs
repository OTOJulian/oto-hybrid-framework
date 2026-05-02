'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const IN_SCOPE = [
  'oto/bin/lib/workstream.cjs',
  'oto/workflows/new-workspace.md',
  'oto/workflows/list-workspaces.md',
  'oto/workflows/remove-workspace.md',
  'oto/commands/oto/workstreams.md',
  'oto/commands/oto/new-workspace.md',
  'oto/commands/oto/list-workspaces.md',
  'oto/commands/oto/remove-workspace.md',
  'oto/references/workstream-flag.md',
];
const COMMANDS = [
  'oto/commands/oto/workstreams.md',
  'oto/commands/oto/new-workspace.md',
  'oto/commands/oto/list-workspaces.md',
  'oto/commands/oto/remove-workspace.md',
];
const WORKFLOWS = [
  'oto/workflows/new-workspace.md',
  'oto/workflows/list-workspaces.md',
  'oto/workflows/remove-workspace.md',
];
const LEAK_RE = /\bgsd-|\bGSD_|Get Shit Done|\bsuperpowers\b|\bSuperpowers\b|\.planning\//;

function read(relPath) {
  return fs.readFileSync(path.resolve(REPO_ROOT, relPath), 'utf8');
}

function parseFrontmatter(text) {
  assert.ok(text.startsWith('---\n'), 'frontmatter must start at beginning of file');
  const end = text.indexOf('\n---', 4);
  assert.notEqual(end, -1, 'frontmatter must have closing delimiter');
  const body = text.slice(4, end);
  const parsed = {};
  for (const line of body.split('\n')) {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (match) parsed[match[1]] = match[2].trim();
  }
  return parsed;
}

test('phase 07 - structure smoke', { concurrency: false }, async (t) => {
  await t.test('all 9 in-scope files exist', () => {
    for (const relPath of IN_SCOPE) {
      assert.ok(fs.existsSync(path.resolve(REPO_ROOT, relPath)), `missing ${relPath}`);
    }
  });

  await t.test('no leak literals in any in-scope file', () => {
    for (const relPath of IN_SCOPE) {
      const text = read(relPath);
      assert.equal(LEAK_RE.test(text), false, `${relPath} contains an upstream leak literal`);
    }
  });

  await t.test('command frontmatter parses on all 4 commands', () => {
    for (const relPath of COMMANDS) {
      const fm = parseFrontmatter(read(relPath));
      assert.equal(typeof fm.description, 'string', `${relPath} missing description`);
      assert.ok(fm.description.length > 0, `${relPath} has empty description`);
    }
  });

  await t.test('workflow body invokes oto-sdk query in all 3 workflows', () => {
    for (const relPath of WORKFLOWS) {
      assert.match(read(relPath), /oto-sdk query/, `${relPath} should invoke oto-sdk query`);
    }
  });

  await t.test('using-git-worktrees SKILL.md has Workflow Deference section', () => {
    const skill = read('oto/skills/using-git-worktrees/SKILL.md');
    assert.match(skill, /^## Workflow Deference$/m);
    assert.match(skill, /\/oto-new-workspace/);
    assert.match(skill, /<!-- oto:workflow-deference-directive -->/);
    assert.match(skill, /<!-- \/oto:workflow-deference-directive -->/);
  });
});
