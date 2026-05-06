'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(REPO_ROOT, 'oto/bin/lib/migrate.cjs');

function addRuntimeWorktree(root) {
  const relPath = path.join('.claude', 'worktrees', 'agent-1', '.planning', 'STATE.md');
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [
    '---',
    'gsd_state_version: 1',
    '---',
    '',
    'Archived agent copy with /gsd-execute-phase references.',
    ''
  ].join('\n'));
  return relPath;
}

function addGitignoredResult(root) {
  const relPath = path.join('docs', 'results', 'phase-11-ab.html');
  const filePath = path.join(root, relPath);
  fs.writeFileSync(path.join(root, '.gitignore'), 'docs/results/\n');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [
    '<html>',
    '<body>Local generated result with GSD, gsd, and /gsd-execute-phase tokens.</body>',
    '</html>',
    ''
  ].join('\n'));
  const init = spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
  assert.equal(init.status, 0, `${init.stderr}\n${init.stdout}`);
  return relPath;
}

function addProjectLocalRuntimeSupport(root) {
  const relPath = path.join('.claude', 'get-shit-done', 'workflows', 'add-phase.md');
  const filePath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [
    '# Add phase',
    '',
    'Support file under .claude/get-shit-done with /gsd-add-phase.',
    ''
  ].join('\n'));
  return relPath;
}

function fileManifest(root) {
  const entries = [];
  function walk(dir) {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        walk(abs);
      } else {
        const rel = path.relative(root, abs);
        const hash = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
        entries.push(`${rel}:${hash}`);
      }
    }
  }
  walk(root);
  return entries.sort();
}

test('apply rewrites planning artifacts while preserving source fixture and .planning directory', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const sourceBefore = fileManifest(sourceFixture);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });

  const result = await migrate.apply(fixture, {});
  const state = fs.readFileSync(path.join(fixture, '.planning/STATE.md'), 'utf8');
  const claude = fs.readFileSync(path.join(fixture, 'CLAUDE.md'), 'utf8');
  const plan = fs.readFileSync(path.join(fixture, '.planning/phases/01-example/01-PLAN.md'), 'utf8');

  assert.equal(result.mode, 'apply');
  assert.equal(result.exitCode, 0);
  assert.ok(state.includes('oto_state_version'));
  assert.equal(state.includes('gsd_state_version'), false);
  assert.ok(claude.includes('<!-- OTO:project-start'));
  assert.equal(claude.includes('<!-- GSD:project-start'), false);
  assert.ok(plan.includes('/oto-execute-phase'));
  assert.equal(plan.includes('/gsd-execute-phase'), false);
  assert.deepEqual(fileManifest(sourceFixture), sourceBefore);
  assert.equal(fs.existsSync(path.join(fixture, '.planning')), true);
  assert.equal(fs.existsSync(path.join(fixture, '.oto')), false);
});

test('apply with renameStateDir backs up and rewrites gitignore planning entry', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, '.gitignore'), '.planning/\nnode_modules/\n');

  const result = await migrate.apply(fixture, { renameStateDir: true });

  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(path.join(fixture, '.planning')), false);
  assert.equal(fs.existsSync(path.join(fixture, '.oto')), true);
  assert.equal(fs.readFileSync(path.join(fixture, '.gitignore'), 'utf8'), '.oto/\nnode_modules/\n');
  assert.ok(result.backupDir, 'backupDir should be reported');
  assert.equal(
    fs.readFileSync(path.join(result.backupDir, '.gitignore'), 'utf8'),
    '.planning/\nnode_modules/\n'
  );
});

test('apply leaves runtime agent worktrees untouched', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  const worktreeRelPath = addRuntimeWorktree(fixture);
  const before = fs.readFileSync(path.join(fixture, worktreeRelPath), 'utf8');

  const result = await migrate.apply(fixture, {});
  const after = fs.readFileSync(path.join(fixture, worktreeRelPath), 'utf8');
  const state = fs.readFileSync(path.join(fixture, '.planning/STATE.md'), 'utf8');

  assert.equal(result.exitCode, 0);
  assert.ok(state.includes('oto_state_version'));
  assert.equal(after, before);
  assert.equal(result.filesChanged.some((relPath) => relPath.startsWith(path.join('.claude', 'worktrees'))), false);
});

test('apply leaves untracked gitignored generated artifacts untouched', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  const ignoredRelPath = addGitignoredResult(fixture);
  const before = fs.readFileSync(path.join(fixture, ignoredRelPath), 'utf8');

  const result = await migrate.apply(fixture, {});
  const after = fs.readFileSync(path.join(fixture, ignoredRelPath), 'utf8');
  const state = fs.readFileSync(path.join(fixture, '.planning/STATE.md'), 'utf8');

  assert.equal(result.exitCode, 0);
  assert.ok(state.includes('oto_state_version'));
  assert.equal(after, before);
  assert.equal(result.filesChanged.includes(ignoredRelPath), false);
});

test('apply renames project-local get-shit-done runtime support directory to oto', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const sourceFixture = path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(sourceFixture, fixture, { recursive: true });
  const legacyRelPath = addProjectLocalRuntimeSupport(fixture);
  const legacyBefore = fs.readFileSync(path.join(fixture, legacyRelPath), 'utf8');

  const result = await migrate.apply(fixture, {});
  const otoRelPath = path.join('.claude', 'oto', 'workflows', 'add-phase.md');
  const otoText = fs.readFileSync(path.join(fixture, otoRelPath), 'utf8');

  assert.equal(result.exitCode, 0);
  assert.equal(fs.existsSync(path.join(fixture, legacyRelPath)), false);
  assert.equal(fs.existsSync(path.join(fixture, '.claude', 'get-shit-done')), false);
  assert.ok(otoText.includes('/oto-add-phase'));
  assert.equal(otoText.includes('/gsd-add-phase'), false);
  assert.equal(
    fs.readFileSync(path.join(result.backupDir, legacyRelPath), 'utf8'),
    legacyBefore
  );
});
