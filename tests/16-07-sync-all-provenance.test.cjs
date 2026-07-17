'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildBareUpstream } = require('./fixtures/phase-09/build-bare-upstream.cjs');
const { parseSyncArgs } = require('../bin/lib/sync-cli.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const REBRAND_REPORTS = [
  path.join(REPO_ROOT, 'reports/coverage-manifest.pre.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.post.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.delta.md'),
];

async function makeTempRoot(t, prefix = 'oto-sync-all-provenance-') {
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

function inventoryEntry(upstream, targetPath, category = 'workflow') {
  return {
    path: targetPath,
    upstream,
    verdict: 'keep',
    target_path: targetPath,
    reason: '16-07 provenance fixture',
    rebrand_required: true,
    phase_owner: 16,
    category,
  };
}

function runOtoSync(args, cwd) {
  return spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin/install.js'), 'sync', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

async function setupSyncAllProject(t) {
  const project = await makeTempRoot(t);
  await fsp.mkdir(path.join(project, 'oto/workflows'), { recursive: true });
  await fsp.mkdir(path.join(project, '.oto-sync'), { recursive: true });
  await fsp.writeFile(path.join(project, '.oto-sync/BREAKING-CHANGES-gsd.md'), '# Breaking Changes — gsd upstream\n');
  await fsp.writeFile(path.join(project, '.oto-sync/BREAKING-CHANGES-superpowers.md'), '# Breaking Changes — superpowers upstream\n');
  await fsp.copyFile(path.join(REPO_ROOT, 'rename-map.json'), path.join(project, 'rename-map.json'));

  const paths = ['README.md', 'oto/workflows/sample.md', 'oto/workflows/added.md'];
  await writeJson(path.join(project, 'decisions/file-inventory.json'), {
    version: '1',
    generated_at: '2026-07-17T00:00:00.000Z',
    entries: ['gsd', 'superpowers'].flatMap((upstream) => paths.map((targetPath) =>
      inventoryEntry(upstream, targetPath, targetPath === 'README.md' ? 'doc' : 'workflow')
    )),
  });
  await writeJson(path.join(project, 'decisions/sync-allowlist.json'), {
    version: '1',
    oto_owned_globs: ['decisions/**', '.oto/**', '.oto-sync/**', '.oto-sync-conflicts/**'],
    oto_diverged_paths: [],
  });
  await fsp.writeFile(path.join(project, 'oto/workflows/sample.md'), '# local divergent\n\nlocal body\n');
  return project;
}

function resolvedSidecar(upstream, targetPath, body) {
  return [
    '---',
    'kind: modified',
    `upstream: ${upstream}`,
    'prior_tag: v1.0.0',
    `prior_sha: ${'a'.repeat(40)}`,
    'current_tag: v1.1.0',
    `current_sha: ${'b'.repeat(40)}`,
    `target_path: ${targetPath}`,
    'inventory_entry: null',
    'timestamp: 2026-07-17T00:00:00.000Z',
    'oto_version: 0.5.0',
    '---',
    '',
    body,
  ].join('\n');
}

async function writeConflictSidecar(project, upstream, targetPath, body) {
  const sidecarPath = path.join(project, '.oto-sync-conflicts', upstream, `${targetPath}.md`);
  await fsp.mkdir(path.dirname(sidecarPath), { recursive: true });
  await fsp.writeFile(sidecarPath, resolvedSidecar(upstream, targetPath, body));
  return sidecarPath;
}

test('WR-01: --upstream all preserves overlapping conflict evidence for both upstreams', async (t) => {
  await preserveFiles(t, REBRAND_REPORTS);
  const fixtureRoot = await makeTempRoot(t, 'oto-sync-all-upstream-fixture-');
  const fixture = await buildBareUpstream({ rootDir: fixtureRoot });
  const project = await setupSyncAllProject(t);

  const result = runOtoSync([
    '--upstream', 'all',
    '--to', 'v1.0.0',
    '--fixture-url', fixture.bareUrl,
  ], project);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const gsdSidecarPath = path.join(project, '.oto-sync-conflicts/gsd/oto/workflows/sample.md.md');
  const superpowersSidecarPath = path.join(project, '.oto-sync-conflicts/superpowers/oto/workflows/sample.md.md');
  const gsdSidecar = await fsp.readFile(gsdSidecarPath, 'utf8');
  const superpowersSidecar = await fsp.readFile(superpowersSidecarPath, 'utf8');
  assert.match(gsdSidecar, /^upstream: gsd$/m);
  assert.match(superpowersSidecar, /^upstream: superpowers$/m);
  assert.match(gsdSidecar, /# local divergent/);
  assert.match(superpowersSidecar, /# local divergent/);

  const gsdReport = await fsp.readFile(path.join(project, '.oto-sync-conflicts/gsd/REPORT.md'), 'utf8');
  const superpowersReport = await fsp.readFile(path.join(project, '.oto-sync-conflicts/superpowers/REPORT.md'), 'utf8');
  assert.match(gsdReport, /gsd/);
  assert.match(superpowersReport, /superpowers/);
  assert.equal(fs.existsSync(path.join(project, '.oto-sync-conflicts/REPORT.md')), false);
});

test('--accept auto-detects one upstream namespace and leaves the other namespace untouched', async (t) => {
  const project = await makeTempRoot(t);
  const targetPath = 'oto/workflows/one.md';
  const gsdSidecar = await writeConflictSidecar(project, 'gsd', targetPath, '# accepted from gsd\n');
  const untouchedSidecar = await writeConflictSidecar(project, 'superpowers', 'oto/workflows/other.md', '# untouched\n');

  const result = runOtoSync(['--accept', targetPath], project);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(await fsp.readFile(path.join(project, targetPath), 'utf8'), '# accepted from gsd\n');
  assert.equal(fs.existsSync(gsdSidecar), false);
  assert.equal(fs.existsSync(untouchedSidecar), true);
});

test('--accept fails loud on ambiguous provenance and --upstream disambiguates', async (t) => {
  const project = await makeTempRoot(t);
  const targetPath = 'oto/workflows/shared.md';
  const gsdSidecar = await writeConflictSidecar(project, 'gsd', targetPath, '# accepted from gsd\n');
  const superpowersSidecar = await writeConflictSidecar(project, 'superpowers', targetPath, '# retained from superpowers\n');

  const ambiguous = runOtoSync(['--accept', targetPath], project);
  assert.notEqual(ambiguous.status, 0);
  assert.match(ambiguous.stderr, /both upstreams/);
  assert.match(ambiguous.stderr, /--upstream/);
  assert.equal(fs.existsSync(gsdSidecar), true);
  assert.equal(fs.existsSync(superpowersSidecar), true);

  const resolved = runOtoSync(['--accept', targetPath, '--upstream', 'gsd'], project);
  assert.equal(resolved.status, 0, resolved.stderr || resolved.stdout);
  assert.equal(await fsp.readFile(path.join(project, targetPath), 'utf8'), '# accepted from gsd\n');
  assert.equal(fs.existsSync(gsdSidecar), false);
  assert.equal(fs.existsSync(superpowersSidecar), true);
});

test('accept flags allow one explicit upstream but reject sync targets and all', () => {
  const parsed = parseSyncArgs(['--accept', 'oto/workflows/x.md', '--upstream', 'gsd']);
  assert.equal(parsed.mode, 'accept');
  assert.equal(parsed.upstream, 'gsd');
  assert.throws(
    () => parseSyncArgs(['--accept', 'oto/workflows/x.md', '--to', 'v1.0.0']),
    /cannot be combined with --to/
  );
  assert.throws(
    () => parseSyncArgs(['--accept', 'oto/workflows/x.md', '--upstream', 'all']),
    /--upstream must be gsd or superpowers when used with --accept flags/
  );
});
