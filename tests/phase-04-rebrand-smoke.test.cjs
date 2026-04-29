'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

function countFiles(dir, ext = '.md') {
  const full = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  let count = 0;
  const stack = [full];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && p.endsWith(ext)) count++;
    }
  }
  return count;
}

test('phase-04 rebrand-smoke: oto/commands/oto contains expected core commands', () => {
  const expected = [
    'oto/commands/oto/new-project.md',
    'oto/commands/oto/discuss-phase.md',
    'oto/commands/oto/plan-phase.md',
    'oto/commands/oto/execute-phase.md',
    'oto/commands/oto/verify-work.md',
    'oto/commands/oto/ship.md',
    'oto/commands/oto/debug.md',
    'oto/commands/oto/ai-integration-phase.md',
    'oto/commands/oto/autonomous.md',
    'oto/commands/oto/set-profile.md',
    'oto/commands/oto/help.md',
    'oto/commands/oto/progress.md',
    'oto/commands/oto/resume-work.md',
    'oto/commands/oto/pause-work.md',
  ];
  for (const rel of expected) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `missing: ${rel}`);
  }
});

test('phase-04 rebrand-smoke: oto/agents has exactly 23 oto-* agent files', () => {
  const dir = path.join(REPO_ROOT, 'oto/agents');
  const files = fs.readdirSync(dir).filter(f => f.startsWith('oto-') && f.endsWith('.md'));
  assert.equal(files.length, 23, `expected 23 retained agents, got ${files.length}`);
});

test('phase-04 rebrand-smoke: oto/workflows includes nested subdirs', () => {
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'oto/workflows/discuss-phase/modes/default.md')));
  assert.ok(fs.existsSync(path.join(REPO_ROOT, 'oto/workflows/execute-phase/steps/codebase-drift-gate.md')));
});

test('phase-04 rebrand-smoke: contexts, templates, references populated', () => {
  assert.ok(countFiles('oto/contexts') >= 3, 'expected 3+ context files');
  assert.ok(countFiles('oto/templates') >= 30, 'expected 30+ template files');
  assert.ok(countFiles('oto/references') >= 40, 'expected 40+ reference files');
});

test('phase-04 rebrand-smoke: ultraplan-phase removed (REQUIREMENTS Out of Scope override)', () => {
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'oto/commands/oto/ultraplan-phase.md')));
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'oto/workflows/ultraplan-phase.md')));
});
