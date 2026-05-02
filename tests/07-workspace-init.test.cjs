'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');

function createTempHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-07-home-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}

function writeWorkspace(home, name) {
  const workspaceBase = path.join(home, 'oto-workspaces');
  const workspacePath = path.join(workspaceBase, name);
  fs.mkdirSync(workspacePath, { recursive: true });
  fs.writeFileSync(path.join(workspacePath, 'WORKSPACE.md'), [
    `# Workspace: ${name}`,
    '',
    'Created: 2026-05-02',
    'Strategy: worktree',
    '',
    '## Member Repos',
    '',
    '| Repo | Source | Branch | Strategy |',
    '|------|--------|--------|----------|',
    '',
  ].join('\n'));
  return workspacePath;
}

function runInit(key, args = [], env = {}) {
  const res = spawnSync(process.execPath, [OTO_TOOLS, 'init', key, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, OTO_WORKSTREAM: '', ...env },
  });
  assert.equal(res.status, 0, `init ${key} failed: stderr=${res.stderr}`);
  return JSON.parse(res.stdout);
}

test('phase 07 - workspace init handlers smoke', { concurrency: false }, async (t) => {
  await t.test('init new-workspace returns documented keys', () => {
    const home = createTempHome(t);
    const out = runInit('new-workspace', [], { HOME: home });
    for (const key of [
      'default_workspace_base',
      'child_repos',
      'child_repo_count',
      'worktree_available',
      'is_git_repo',
      'cwd_repo_name',
      'project_root',
    ]) {
      assert.ok(key in out, `missing key: ${key} in ${JSON.stringify(out)}`);
    }
    assert.equal(out.default_workspace_base, path.join(home, 'oto-workspaces'));
    assert.ok(Array.isArray(out.child_repos), 'child_repos should be array');
  });

  await t.test('init list-workspaces returns documented keys', () => {
    const home = createTempHome(t);
    writeWorkspace(home, 'listed-demo');
    const out = runInit('list-workspaces', [], { HOME: home });
    for (const key of ['workspace_base', 'workspaces', 'workspace_count']) {
      assert.ok(key in out, `missing key: ${key} in ${JSON.stringify(out)}`);
    }
    assert.ok(Array.isArray(out.workspaces), 'workspaces should be array');
    assert.equal(out.workspace_count, 1);
    assert.equal(out.workspaces[0].name, 'listed-demo');
  });

  await t.test('init remove-workspace returns documented keys', () => {
    const home = createTempHome(t);
    writeWorkspace(home, 'remove-demo');
    const out = runInit('remove-workspace', ['remove-demo'], { HOME: home });
    for (const key of [
      'workspace_name',
      'workspace_path',
      'has_manifest',
      'strategy',
      'repos',
      'repo_count',
      'dirty_repos',
      'has_dirty_repos',
    ]) {
      assert.ok(key in out, `missing key: ${key} in ${JSON.stringify(out)}`);
    }
    assert.equal(out.workspace_name, 'remove-demo');
    assert.equal(out.has_manifest, true);
    assert.ok(Array.isArray(out.repos), 'repos should be array');
    assert.ok(Array.isArray(out.dirty_repos), 'dirty_repos should be array');
  });
});
