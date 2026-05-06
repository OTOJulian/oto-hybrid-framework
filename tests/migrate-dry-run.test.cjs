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

test('dryRun returns report shape and does not write to fixture copy', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), fixture, { recursive: true });
  const before = fileManifest(fixture);

  const result = await migrate.dryRun(fixture);
  const after = fileManifest(fixture);

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.exitCode, 0);
  assert.ok(Array.isArray(result.files));
  assert.deepEqual(after, before);
  assert.ok(Array.isArray(result.summary.rule_types));
  assert.ok(result.summary.rule_types.some((type) => ['identifier', 'command', 'frontmatter', 'marker'].includes(type)));
  assert.equal(fs.existsSync(path.join(fixture, 'reports')), false);
});

test('dryRun excludes runtime agent worktrees from report scope', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), fixture, { recursive: true });
  const worktreeRelPath = addRuntimeWorktree(fixture);

  const result = await migrate.dryRun(fixture);

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.exitCode, 0);
  assert.equal(result.files.some((file) => file.path === worktreeRelPath), false);
  assert.equal(result.files.some((file) => file.path.startsWith(path.join('.claude', 'worktrees'))), false);
  assert.ok(fs.readFileSync(path.join(fixture, worktreeRelPath), 'utf8').includes('/gsd-execute-phase'));
});

test('dryRun excludes untracked gitignored generated artifacts from report scope', async (t) => {
  let migrate;
  try {
    migrate = require(MIGRATE_PATH);
  } catch (error) {
    assert.fail(`Cannot load migrate.cjs from ${MIGRATE_PATH}: ${error.message}`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migrate-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fixture = path.join(tmp, 'fixture');
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/gsd-project-minimal'), fixture, { recursive: true });
  const ignoredRelPath = addGitignoredResult(fixture);

  const result = await migrate.dryRun(fixture);

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.exitCode, 0);
  assert.equal(result.files.some((file) => file.path === ignoredRelPath), false);
  assert.ok(fs.readFileSync(path.join(fixture, ignoredRelPath), 'utf8').includes('/gsd-execute-phase'));
});
