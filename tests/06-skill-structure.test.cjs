'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'oto/skills');
const COMMANDS_ROOT = path.join(REPO_ROOT, 'oto/commands/oto');
const AGENTS_ROOT = path.join(REPO_ROOT, 'oto/agents');

const SKILL_INVENTORY = {
  'test-driven-development': ['SKILL.md', 'testing-anti-patterns.md'],
  'systematic-debugging': [
    'SKILL.md', 'CREATION-LOG.md',
    'condition-based-waiting.md', 'condition-based-waiting-example.ts',
    'defense-in-depth.md', 'find-polluter.sh',
    'root-cause-tracing.md', 'test-academic.md',
    'test-pressure-1.md', 'test-pressure-2.md', 'test-pressure-3.md',
  ],
  'verification-before-completion': ['SKILL.md'],
  'dispatching-parallel-agents': ['SKILL.md'],
  'using-git-worktrees': ['SKILL.md'],
  'writing-skills': [
    'SKILL.md', 'anthropic-best-practices.md',
    'examples/CLAUDE_MD_TESTING.md',
    'graphviz-conventions.dot', 'persuasion-principles.md',
    'render-graphs.js', 'testing-skills-with-subagents.md',
  ],
  'using-oto': [
    'SKILL.md',
    'references/codex-tools.md',
    'references/copilot-tools.md',
    'references/gemini-tools.md',
  ],
};

function parseFrontmatter(md) {
  // Small frontmatter probe only: enough to assert required scalar fields.
  if (!md.startsWith('---\n')) return null;
  const end = md.indexOf('\n---', 4);
  if (end === -1) return null;
  const body = md.slice(4, end);
  const out = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^([a-z_-]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

test('phase-06 D-07: all 7 skill directories exist with SKILL.md', () => {
  for (const name of Object.keys(SKILL_INVENTORY)) {
    assert.ok(
      fs.existsSync(path.join(SKILLS_ROOT, name, 'SKILL.md')),
      `missing skill entrypoint: ${name}/SKILL.md`,
    );
  }
});

test('phase-06 D-07: every skill SKILL.md frontmatter parses with name and description', () => {
  for (const name of Object.keys(SKILL_INVENTORY)) {
    const body = fs.readFileSync(path.join(SKILLS_ROOT, name, 'SKILL.md'), 'utf8');
    const fm = parseFrontmatter(body);
    assert.notEqual(fm, null, `missing frontmatter: ${name}/SKILL.md`);
    assert.equal(typeof fm.name, 'string', `missing name: ${name}/SKILL.md`);
    assert.equal(typeof fm.description, 'string', `missing description: ${name}/SKILL.md`);
    assert.ok(fm.name.length > 0, `empty name: ${name}/SKILL.md`);
    assert.ok(fm.description.length > 0, `empty description: ${name}/SKILL.md`);
  }
});

test('phase-06 D-07: every skill ships its complete payload from inventory', () => {
  for (const [name, files] of Object.entries(SKILL_INVENTORY)) {
    for (const file of files) {
      assert.ok(
        fs.existsSync(path.join(SKILLS_ROOT, name, file)),
        `missing skill payload: ${name}/${file}`,
      );
    }
  }
});

test('phase-06 D-07: skill name does not collide with any /oto-<name> command', () => {
  for (const name of Object.keys(SKILL_INVENTORY)) {
    assert.equal(
      fs.existsSync(path.join(COMMANDS_ROOT, name + '.md')),
      false,
      `skill collides with command: /oto-${name}`,
    );
  }
});

test('phase-06 SKL-08 axis 1: oto-executor invokes oto:test-driven-development before write', () => {
  const body = fs.readFileSync(path.join(AGENTS_ROOT, 'oto-executor.md'), 'utf8');
  assert.ok(body.includes("Skill('oto:test-driven-development')"));
  assert.ok(body.includes("Skill('oto:verification-before-completion')"));
  assert.equal(body.indexOf('Follow skill rules relevant to the task you are about to commit.'), -1);
});

test('phase-06 SKL-08 axis 2: oto-verifier invokes oto:verification-before-completion at start', () => {
  const body = fs.readFileSync(path.join(AGENTS_ROOT, 'oto-verifier.md'), 'utf8');
  assert.ok(body.includes("Skill('oto:verification-before-completion')"));
  assert.equal(body.indexOf('Apply skill rules when scanning for anti-patterns and verifying quality.'), -1);
});

test('phase-06 SKL-08 axis 3: oto-debugger invokes oto:systematic-debugging at session start', () => {
  const body = fs.readFileSync(path.join(AGENTS_ROOT, 'oto-debugger.md'), 'utf8');
  assert.ok(body.includes("Skill('oto:systematic-debugging')"));
  assert.equal(body.indexOf('Follow skill rules relevant to the bug being investigated and the fix being applied.'), -1);
});
