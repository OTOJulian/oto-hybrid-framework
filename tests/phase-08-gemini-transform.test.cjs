'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_ROOT = path.join(REPO_ROOT, 'tests/fixtures/runtime-parity/gemini');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-gemini.cjs'));
const {
  convertClaudeToGeminiAgent,
  rewriteTaskCalls,
} = require(path.join(REPO_ROOT, 'bin/lib/gemini-transform.cjs'));
const { installRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function read(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

function readFixture(fileName) {
  return fs.readFileSync(path.join(FIXTURE_ROOT, fileName), 'utf8');
}

test('D-13 oto-executor agent transform matches expected golden', () => {
  assert.equal(adapter.transformAgent(read('oto/agents/oto-executor.md')), readFixture('oto-executor.expected.md'));
});

test('D-13 ${VAR} to $VAR escape leaves no unresolved ${WORD} patterns', () => {
  const source = '---\nname: t\ntools: Bash\n---\nrun ${PHASE} and ${PLAN}\n';
  const out = convertClaudeToGeminiAgent(source);
  assert.equal(/\$\{[A-Za-z_]\w*\}/.test(out), false);
  assert.match(out, /\$PHASE/);
  assert.match(out, /\$PLAN/);
});

test('D-13 frontmatter strips color/skills and emits tools as Gemini YAML array', () => {
  const out = convertClaudeToGeminiAgent('---\nname: t\ndescription: D\ntools: Read, Bash, mcp__x__y\ncolor: red\nskills:\n  - foo\n---\nbody');
  assert.equal(out.includes('color:'), false);
  assert.equal(out.includes('skills:'), false);
  assert.match(out, /^tools:\n  - read_file\n  - run_shell_command$/m);
});

test('D-14 Task() rewrite converts bare Task calls to subagent tool instructions', () => {
  const out = rewriteTaskCalls("Task(subagent_type='oto-x', prompt='Y')");
  assert.equal(out.includes('Task('), false);
  assert.match(out, /`oto-x`/);
  assert.match(out, /prompt: Y/);
});

test('D-14 Task() rewrite preserves fenced-code Task examples verbatim', () => {
  const fenced = "```js\nTask(subagent_type='oto-x', prompt='Y')\n```";
  assert.equal(rewriteTaskCalls(fenced), fenced);
});

test('D-15 parallel Task() block rewrites adjacent calls as a single tool-use block', () => {
  const input = [
    "Task(subagent_type='oto-a', prompt='1')",
    "Task(subagent_type='oto-b', prompt='2')",
    "Task(subagent_type='oto-c', prompt='3')",
  ].join('\n');
  const out = rewriteTaskCalls(input);
  assert.match(out, /single tool-use block/);
  assert.match(out, /oto-a/);
  assert.match(out, /oto-b/);
  assert.match(out, /oto-c/);
});

test('D-13 oto:test-driven-development skill transform matches expected golden', () => {
  assert.equal(
    adapter.transformSkill(read('oto/skills/test-driven-development/SKILL.md')),
    readFixture('test-driven-development.expected.md'),
  );
});

test('D-13 /oto-progress command rewrites to TOML fixture', () => {
  assert.equal(
    adapter.transformCommand(read('oto/commands/oto/progress.md'), { srcKey: 'commands', relPath: 'oto/progress.md' }),
    readFixture('oto-progress.expected.toml'),
  );
  assert.match(readFixture('oto-progress.expected.toml'), /^description = /m);
  assert.match(readFixture('oto-progress.expected.toml'), /^prompt = """$/m);
});

test('W8 production install writes transformed Gemini command content', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-gemini-cmd-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  await installRuntime(adapter, {
    repoRoot: REPO_ROOT,
    flags: { configDir: tmp, runtimes: ['gemini'] },
  });

  const installed = path.join(tmp, 'commands/oto/progress.md');
  assert.equal(fs.readFileSync(installed, 'utf8'), readFixture('oto-progress.expected.toml'));
});

test('Pitfall 1/15: transformed agent has no upstream gsd- or superpowers literals', () => {
  const out = adapter.transformAgent(read('oto/agents/oto-executor.md'));
  assert.equal(/\bgsd-|superpowers-/i.test(out), false);
});
