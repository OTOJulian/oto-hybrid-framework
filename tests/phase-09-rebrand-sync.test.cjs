'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const FOUNDATION_GSD = path.join(REPO_ROOT, 'foundation-frameworks/get-shit-done-main');
const REBRAND_REPORTS = [
  path.join(REPO_ROOT, 'reports/coverage-manifest.pre.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.post.json'),
  path.join(REPO_ROOT, 'reports/coverage-manifest.delta.md'),
];

async function makeTempRoot(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-rebrand-sync-test-'));
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

async function copyFixtureSubset(target) {
  const files = [
    'package.json',
    'README.md',
    'get-shit-done/workflows/execute-phase.md',
    'get-shit-done/workflows/plan-phase.md',
  ];
  for (const relPath of files) {
    const source = path.join(FOUNDATION_GSD, relPath);
    const dest = path.join(target, relPath);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(source, dest);
  }
}

async function listFilesRecursive(dir) {
  const out = [];
  async function walk(current, rel = '') {
    for (const entry of await fsp.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const nextRel = path.join(rel, entry.name);
      if (entry.isDirectory()) await walk(full, nextRel);
      else out.push(nextRel.split(path.sep).join('/'));
    }
  }
  await walk(dir);
  return out.sort();
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test("SYN-03: scripts/sync-upstream/rebrand.cjs produces byte-identical output to direct engine.run({mode:'apply'})", async (t) => {
  await preserveFiles(t, REBRAND_REPORTS);
  const root = await makeTempRoot(t);
  const target = path.join(root, 'target');
  const directOut = path.join(root, 'direct');
  const scriptOut = path.join(root, 'script');
  await copyFixtureSubset(target);

  const direct = await engine.run({
    mode: 'apply',
    target,
    out: directOut,
    force: true,
    owner: 'OTOJulian',
    mapPath: path.join(REPO_ROOT, 'rename-map.json'),
  });
  assert.equal(direct.exitCode, 0);

  const script = spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/sync-upstream/rebrand.cjs'),
    '--target', target,
    '--out', scriptOut,
    '--map', path.join(REPO_ROOT, 'rename-map.json'),
  ], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(script.status, 0, script.stderr || script.stdout);

  const directFiles = await listFilesRecursive(directOut);
  const scriptFiles = await listFilesRecursive(scriptOut);
  assert.deepEqual(scriptFiles, directFiles);
  for (const relPath of directFiles) {
    assert.equal(sha256(path.join(scriptOut, relPath)), sha256(path.join(directOut, relPath)), relPath);
  }
});

test('SYN-03: sync rebrand never modifies foundation-frameworks/', async (t) => {
  await preserveFiles(t, REBRAND_REPORTS);
  const root = await makeTempRoot(t);
  const packagePath = path.join(FOUNDATION_GSD, 'package.json');
  const beforeStat = await fsp.stat(packagePath);
  const beforeHash = sha256(packagePath);

  const script = spawnSync(process.execPath, [
    path.join(REPO_ROOT, 'scripts/sync-upstream/rebrand.cjs'),
    '--target', FOUNDATION_GSD,
    '--out', path.join(root, 'out'),
    '--map', path.join(REPO_ROOT, 'rename-map.json'),
  ], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(script.status, 0, script.stderr || script.stdout);

  const afterStat = await fsp.stat(packagePath);
  assert.equal(sha256(packagePath), beforeHash);
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);
});
