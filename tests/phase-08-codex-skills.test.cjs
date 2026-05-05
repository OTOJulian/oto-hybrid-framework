'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  convertClaudeCommandToCodexSkill,
  getCodexSkillAdapterHeader,
} = require('../bin/lib/codex-transform.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Task 1: convertClaudeCommandToCodexSkill + getCodexSkillAdapterHeader
// ---------------------------------------------------------------------------

test('QUICK-260505-bxx-02: getCodexSkillAdapterHeader interpolates $oto-<name> as the invocation token', () => {
  const header = getCodexSkillAdapterHeader('oto-help');
  assert.match(header, /<codex_skill_adapter>/);
  assert.match(header, /<\/codex_skill_adapter>/);
  assert.match(header, /\$oto-help/);
  // Adapter prose must mention oto workflows (renamed from upstream "GSD workflows").
  assert.match(header, /oto workflows/);
  // Translation rules preserved verbatim.
  assert.match(header, /AskUserQuestion/);
  assert.match(header, /request_user_input/);
  assert.match(header, /Task\(/);
  assert.match(header, /spawn_agent/);
  // GSD_ARGS token is left literal (it's what convertClaudeToCodexMarkdown produces).
  assert.match(header, /\{\{GSD_ARGS\}\}/);
});

test('QUICK-260505-bxx-02: convertClaudeCommandToCodexSkill produces well-formed SKILL.md from a real command file', () => {
  const progressMd = fs.readFileSync(
    path.join(REPO_ROOT, 'oto', 'commands', 'oto', 'progress.md'),
    'utf8'
  );
  const out = convertClaudeCommandToCodexSkill(progressMd, 'oto-progress');

  // 1. Frontmatter starts with name (yamlQuote → JSON.stringify form, double-quoted).
  assert.ok(out.startsWith('---\nname: "oto-progress"\n'), 'should start with frontmatter and quoted name');
  // 2. Description sourced from input frontmatter.
  assert.match(out, /^description:\s*"/m);
  // 3. metadata.short-description present.
  assert.match(out, /^metadata:\n  short-description:\s*"/m);
  // 4. Adapter markers present.
  assert.match(out, /<codex_skill_adapter>/);
  assert.match(out, /<\/codex_skill_adapter>/);
  // 5. Adapter prose mentions $oto-progress as invocation token.
  assert.match(out, /\$oto-progress/);
  // 6. Adapter prose contains the AskUserQuestion / Task() translation rules.
  assert.match(out, /AskUserQuestion.*request_user_input/s);
  assert.match(out, /Task\([^)]*\).*spawn_agent/s);
  assert.match(out, /\{\{GSD_ARGS\}\}/);
  // 7. Body translation: $ARGUMENTS → {{GSD_ARGS}}, ~/.claude/ → ~/.codex/.
  assert.equal(out.includes('$ARGUMENTS'), false, '$ARGUMENTS should be replaced');
  assert.equal(out.includes('~/.claude/'), false, '~/.claude/ should be replaced with ~/.codex/');
  assert.match(out, /~\/\.codex\//);
});

test('QUICK-260505-bxx-02: short-description is truncated to 180 chars when description is long', () => {
  const longDescription = 'x'.repeat(300);
  const input = `---\nname: oto-foo\ndescription: ${longDescription}\n---\nbody`;
  const out = convertClaudeCommandToCodexSkill(input, 'oto-foo');

  // Pull the short-description value from the frontmatter.
  const m = out.match(/short-description:\s*"([^"]+)"/);
  assert.ok(m, 'short-description should be present');
  assert.equal(m[1].length, 180);
  assert.ok(m[1].endsWith('...'), 'long short-description should end with ellipsis');
});

test('QUICK-260505-bxx-02: short-description equals description when ≤180 chars', () => {
  const input = `---\nname: oto-bar\ndescription: short and sweet\n---\nbody`;
  const out = convertClaudeCommandToCodexSkill(input, 'oto-bar');

  const desc = out.match(/^description:\s*"([^"]+)"/m);
  const short = out.match(/short-description:\s*"([^"]+)"/);
  assert.ok(desc && short);
  assert.equal(desc[1], short[1]);
});

test('QUICK-260505-bxx-02: missing/empty frontmatter falls back to "Run oto workflow <name>."', () => {
  const empty = 'no frontmatter here, just body';
  const out = convertClaudeCommandToCodexSkill(empty, 'oto-foo');
  assert.match(out, /^description:\s*"Run oto workflow oto-foo\."/m);
});

test('QUICK-260505-bxx-02: frontmatter without description field falls back to oto workflow stub', () => {
  const noDesc = `---\nname: oto-baz\n---\nsome body`;
  const out = convertClaudeCommandToCodexSkill(noDesc, 'oto-baz');
  assert.match(out, /^description:\s*"Run oto workflow oto-baz\."/m);
});

// ---------------------------------------------------------------------------
// Task 2: installRuntime / uninstallRuntime override hooks
// ---------------------------------------------------------------------------

const codexAdapter = require('../bin/lib/runtime-codex.cjs');
const claudeAdapter = require('../bin/lib/runtime-claude.cjs');
const { installRuntime, uninstallRuntime } = require('../bin/lib/install.cjs');

async function makeFixtureRepo(commands /* { 'foo.md': 'content' } */) {
  const repoRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-fixture-'));
  // Mirror the package.json so install.cjs's require('../../package.json') still works
  // when adapters resolve repoRoot. We don't need to override that — install.cjs reads
  // OTO_VERSION from the real package.json at module scope. We just need the source dirs
  // under our fixture repo.
  for (const dir of [
    'oto/commands/oto',
    'oto/agents',
    'oto/skills',
    'oto/hooks/dist',
    'oto/workflows',
    'oto/references',
    'oto/templates',
    'oto/contexts',
  ]) {
    await fsp.mkdir(path.join(repoRoot, dir), { recursive: true });
  }
  for (const [filename, content] of Object.entries(commands)) {
    await fsp.writeFile(path.join(repoRoot, 'oto/commands/oto', filename), content);
  }
  return repoRoot;
}

async function rmrf(p) {
  await fsp.rm(p, { recursive: true, force: true });
}

const FOO_MD = `---\nname: oto-foo\ndescription: Foo command body\n---\n<objective>foo body $ARGUMENTS</objective>\n`;
const BAR_MD = `---\nname: oto-bar\ndescription: Bar command body\n---\n<objective>bar body</objective>\n`;

test('QUICK-260505-bxx-01: codex installRuntime emits skills/oto-<name>/SKILL.md per command file', async () => {
  const repoRoot = await makeFixtureRepo({ 'foo.md': FOO_MD, 'bar.md': BAR_MD });
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-codex-'));
  try {
    await installRuntime(codexAdapter, { repoRoot, flags: { configDir: tmp } });

    const fooSkill = path.join(tmp, 'skills', 'oto-foo', 'SKILL.md');
    const barSkill = path.join(tmp, 'skills', 'oto-bar', 'SKILL.md');
    assert.ok(fs.existsSync(fooSkill), 'oto-foo SKILL.md should exist');
    assert.ok(fs.existsSync(barSkill), 'oto-bar SKILL.md should exist');

    const fooContent = await fsp.readFile(fooSkill, 'utf8');
    assert.ok(fooContent.startsWith('---\nname: "oto-foo"\n'));
    assert.match(fooContent, /<codex_skill_adapter>/);
    assert.match(fooContent, /\$oto-foo/);

    // Override replaces default copy: NO commands/oto/foo.md.
    assert.equal(fs.existsSync(path.join(tmp, 'commands', 'oto', 'foo.md')), false,
      'override should skip default commands copy');

    // Install state records SKILL.md paths.
    const state = JSON.parse(await fsp.readFile(path.join(tmp, 'oto', '.install.json'), 'utf8'));
    const paths = state.files.map((f) => f.path);
    assert.ok(paths.some((p) => p.endsWith('skills/oto-foo/SKILL.md')), 'state should track oto-foo SKILL.md');
    assert.ok(paths.some((p) => p.endsWith('skills/oto-bar/SKILL.md')), 'state should track oto-bar SKILL.md');
  } finally {
    await rmrf(repoRoot);
    await rmrf(tmp);
  }
});

test('QUICK-260505-bxx-01: re-install with smaller command set removes orphaned oto-* skills', async () => {
  const repoRoot = await makeFixtureRepo({ 'foo.md': FOO_MD, 'bar.md': BAR_MD });
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-codex-'));
  try {
    await installRuntime(codexAdapter, { repoRoot, flags: { configDir: tmp } });
    assert.ok(fs.existsSync(path.join(tmp, 'skills', 'oto-bar', 'SKILL.md')));

    // Remove bar.md from the source and reinstall.
    await fsp.rm(path.join(repoRoot, 'oto/commands/oto', 'bar.md'));
    await installRuntime(codexAdapter, { repoRoot, flags: { configDir: tmp } });

    assert.ok(fs.existsSync(path.join(tmp, 'skills', 'oto-foo', 'SKILL.md')), 'oto-foo should remain');
    assert.equal(fs.existsSync(path.join(tmp, 'skills', 'oto-bar')), false, 'oto-bar dir should be removed');
  } finally {
    await rmrf(repoRoot);
    await rmrf(tmp);
  }
});

test('QUICK-260505-bxx-03: codex uninstallRuntime removes skills/oto-* and legacy commands/oto/* leftovers', async () => {
  const repoRoot = await makeFixtureRepo({ 'foo.md': FOO_MD });
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-codex-'));
  try {
    await installRuntime(codexAdapter, { repoRoot, flags: { configDir: tmp } });

    // Pre-seed a legacy commands/oto/legacy.md leftover (simulates a prior install
    // before this fix landed).
    await fsp.mkdir(path.join(tmp, 'commands', 'oto'), { recursive: true });
    await fsp.writeFile(path.join(tmp, 'commands', 'oto', 'legacy.md'), 'legacy stub\n');

    // Pre-seed an UNRELATED non-oto subtree we must NOT touch.
    await fsp.mkdir(path.join(tmp, 'commands', 'non-oto'), { recursive: true });
    await fsp.writeFile(path.join(tmp, 'commands', 'non-oto', 'keep.md'), 'keep me\n');

    await uninstallRuntime(codexAdapter, { flags: { configDir: tmp } });

    // skills/oto-* gone.
    assert.equal(fs.existsSync(path.join(tmp, 'skills', 'oto-foo')), false);
    // legacy commands/oto/ gone.
    assert.equal(fs.existsSync(path.join(tmp, 'commands', 'oto')), false);
    // non-oto sibling preserved.
    assert.ok(fs.existsSync(path.join(tmp, 'commands', 'non-oto', 'keep.md')),
      'unrelated commands subtrees should survive');
  } finally {
    await rmrf(repoRoot);
    await rmrf(tmp);
  }
});

test('QUICK-260505-bxx-04: claude installRuntime path is unchanged (no Codex regression)', async () => {
  const repoRoot = await makeFixtureRepo({ 'foo.md': FOO_MD });
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-claude-'));
  try {
    await installRuntime(claudeAdapter, { repoRoot, flags: { configDir: tmp } });
    // Claude still gets per-file copy under commands/oto/.
    const fooCmd = path.join(tmp, 'commands', 'oto', 'foo.md');
    assert.ok(fs.existsSync(fooCmd), 'claude install should still produce commands/oto/foo.md');
    // And does NOT produce skills/oto-foo/SKILL.md.
    assert.equal(fs.existsSync(path.join(tmp, 'skills', 'oto-foo')), false,
      'claude install should not produce skills/oto-* dirs');
  } finally {
    await rmrf(repoRoot);
    await rmrf(tmp);
  }
});
