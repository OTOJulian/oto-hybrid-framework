'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseSyncArgs, runStatus } = require('../bin/lib/sync-cli.cjs');
const { assertGitVersion } = require('../bin/lib/sync-pull.cjs');
const { buildBareUpstream } = require('./fixtures/phase-09/build-bare-upstream.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const REBRAND_REPORTS = [
  path.join(REPO_ROOT, 'reports/coverage-manifest.pre.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.post.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.delta.md'),
];

async function makeTempRoot(t, prefix = 'oto-sync-cli-test-') {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  return root;
}

async function preserveFiles(t, files) {
  const snapshots = [];
  for (const filePath of files) {
    try {
      snapshots.push({ filePath, existed: true, content: await fsp.readFile(filePath) });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      snapshots.push({ filePath, existed: false });
    }
  }
  t.after(async () => {
    for (const snapshot of snapshots) {
      if (snapshot.existed) {
        await fsp.mkdir(path.dirname(snapshot.filePath), { recursive: true });
        await fsp.writeFile(snapshot.filePath, snapshot.content);
      } else {
        await fsp.rm(snapshot.filePath, { force: true });
      }
    }
  });
}

async function writeJson(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function inventoryEntry(targetPath, extra = {}) {
  return {
    path: targetPath,
    upstream: 'gsd',
    verdict: 'keep',
    target_path: targetPath,
    reason: 'cli integration fixture',
    rebrand_required: true,
    phase_owner: 9,
    category: 'workflow',
    ...extra,
  };
}

async function setupSyncProject(t) {
  const root = await makeTempRoot(t);
  await fsp.mkdir(path.join(root, 'oto'), { recursive: true });
  await fsp.mkdir(path.join(root, '.oto-sync'), { recursive: true });
  await fsp.writeFile(path.join(root, '.oto-sync/BREAKING-CHANGES-gsd.md'), '# Breaking Changes — gsd upstream\n');
  await fsp.copyFile(path.join(REPO_ROOT, 'rename-map.json'), path.join(root, 'rename-map.json'));
  await writeJson(path.join(root, 'decisions/file-inventory.json'), {
    version: '1',
    generated_at: '2026-05-04T00:00:00.000Z',
    entries: [
      inventoryEntry('README.md', { category: 'doc' }),
      inventoryEntry('oto/workflows/sample.md'),
      inventoryEntry('oto/workflows/added.md'),
    ],
  });
  await writeJson(path.join(root, 'decisions/sync-allowlist.json'), {
    version: '1',
    oto_owned_globs: ['decisions/**', '.oto/**', '.oto-sync/**', '.oto-sync-conflicts/**'],
    oto_diverged_paths: [],
  });
  return root;
}

function runOtoSync(args, cwd) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin/install.js'), 'sync', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

async function makeFixture(t) {
  const fixtureRoot = await makeTempRoot(t, 'oto-sync-upstream-fixture-');
  return buildBareUpstream({ rootDir: fixtureRoot });
}

test('D-19: oto sync flag parser parses --upstream, --to, --apply, --dry-run, --accept, --status', () => {
  const dry = parseSyncArgs(['--upstream', 'gsd', '--to', 'v1.0.0']);
  assert.equal(dry.mode, 'full');
  assert.equal(dry.upstream, 'gsd');
  assert.equal(dry.to, 'v1.0.0');
  assert.equal(dry.apply, false);

  const apply = parseSyncArgs(['--upstream', 'gsd', '--to', 'v1.0.0', '--apply']);
  assert.equal(apply.apply, true);
  const accept = parseSyncArgs(['--accept', 'oto/workflows/x.md']);
  assert.equal(accept.mode, 'accept');
  assert.equal(accept.accept, 'oto/workflows/x.md');
  const status = parseSyncArgs(['--status']);
  assert.equal(status.mode, 'status');
});

test("D-19: bin/install.js dispatches 'oto sync ...' to bin/lib/sync-cli.cjs", () => {
  const result = spawnSync(process.execPath, ['bin/install.js', 'sync', '--status'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /oto sync — status/);
  assert.doesNotMatch(result.stderr, /Invalid argument/);
});

test('SYN-07 (override): oto sync --upstream gsd --to <fixture-tag> end-to-end against bare-repo fixture (default --dry-run, no writes)', async (t) => {
  await preserveFiles(t, REBRAND_REPORTS);
  const fixture = await makeFixture(t);
  const project = await setupSyncProject(t);
  await fsp.writeFile(path.join(project, 'oto/local-sentinel.md'), 'local sentinel\n');

  const result = runOtoSync([
    '--upstream', 'gsd',
    '--to', 'v1.0.0',
    '--fixture-url', fixture.bareUrl,
  ], project);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(await fsp.readFile(path.join(project, 'oto/local-sentinel.md'), 'utf8'), 'local sentinel\n');
  assert.equal(fs.existsSync(path.join(project, 'oto/README.md')), false);
  assert.equal(fs.existsSync(path.join(project, 'oto/workflows/sample.md')), false);
  assert.equal(fs.existsSync(path.join(project, '.oto-sync-conflicts/REPORT.md')), true);
});

test('SYN-07 (override): oto sync --upstream gsd --to <fixture-tag> --apply writes to oto/', async (t) => {
  await preserveFiles(t, REBRAND_REPORTS);
  const fixture = await makeFixture(t);
  const project = await setupSyncProject(t);
  const first = runOtoSync([
    '--upstream', 'gsd',
    '--to', 'v1.0.0',
    '--apply',
    '--fixture-url', fixture.bareUrl,
  ], project);
  assert.equal(first.status, 0, first.stderr || first.stdout);

  await fsp.appendFile(path.join(project, 'oto/workflows/sample.md'), '\nlocal oto note\n');
  const beforeLogSize = (await fsp.stat(path.join(project, '.oto-sync/BREAKING-CHANGES-gsd.md'))).size;
  const second = runOtoSync([
    '--upstream', 'gsd',
    '--to', 'v1.1.0',
    '--apply',
    '--fixture-url', fixture.bareUrl,
  ], project);

  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.match(await fsp.readFile(path.join(project, 'oto/workflows/sample.md'), 'utf8'), /local oto note/);
  assert.equal(await fsp.readFile(path.join(project, 'oto/workflows/added.md'), 'utf8'), '# added\n');
  const report = await fsp.readFile(path.join(project, '.oto-sync-conflicts/REPORT.md'), 'utf8');
  assert.match(report, /v1\.1\.0/);
  const logStat = await fsp.stat(path.join(project, '.oto-sync/BREAKING-CHANGES-gsd.md'));
  assert.ok(logStat.size > beforeLogSize);
  const currentPin = JSON.parse(await fsp.readFile(path.join(project, '.oto-sync/upstream/gsd/last-synced-commit.json'), 'utf8'));
  const priorPin = JSON.parse(await fsp.readFile(path.join(project, '.oto-sync/upstream/gsd/prior-last-synced-commit.json'), 'utf8'));
  assert.equal(currentPin.ref, 'v1.1.0');
  assert.match(currentPin.sha, /^[0-9a-f]{40}$/);
  assert.equal(priorPin.ref, 'v1.0.0');
});

test('D-19: oto sync --status shows pending conflicts and last-synced refs', async (t) => {
  const root = await makeTempRoot(t);
  const originalCwd = process.cwd();
  const writes = [];
  const originalWrite = process.stdout.write;
  t.after(() => {
    process.chdir(originalCwd);
    process.stdout.write = originalWrite;
  });
  process.chdir(root);
  process.stdout.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  await writeJson(path.join(root, '.oto-sync/upstream/gsd/last-synced-commit.json'), {
    upstream: 'gsd',
    ref_kind: 'tag-or-branch',
    ref: 'v1.1.0',
    sha: 'a'.repeat(40),
    timestamp: '2026-05-04T00:00:00.000Z',
  });
  await fsp.mkdir(path.join(root, '.oto-sync-conflicts/oto/workflows'), { recursive: true });
  await fsp.writeFile(path.join(root, '.oto-sync-conflicts/oto/workflows/a.added.md'), 'x');
  await fsp.writeFile(path.join(root, '.oto-sync-conflicts/oto/workflows/b.deleted.md'), 'x');

  const code = await runStatus();
  const output = writes.join('');
  assert.equal(code, 0);
  assert.match(output, /v1\.1\.0/);
  assert.match(output, /M=0 A=1 D=1/);
});

test('Pitfall 9: git --version parsing - lenient regex; fail-loud on unparseable output', () => {
  assert.doesNotThrow(() => assertGitVersion(() => ({ stdout: 'git version 2.39.3 (Apple Git-146)', stderr: '', status: 0 })));
  assert.throws(
    () => assertGitVersion(() => ({ stdout: 'banana 99.99', stderr: '', status: 0 })),
    /git ≥ 2\.0/
  );
});

test("Ref injection guard (T-09-03): --to '$(rm -rf /)' rejected by ref validator before passing to git", () => {
  assert.throws(
    () => parseSyncArgs(['--upstream', 'gsd', '--to', '$(rm -rf /)']),
    /Invalid ref/
  );
});
