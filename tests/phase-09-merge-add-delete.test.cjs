'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { mergeAll } = require('../bin/lib/sync-merge.cjs');

async function writeJson(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function makeRoot(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-merge-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = {
    root,
    otoDir: path.join(root, 'oto'),
    conflictsDir: path.join(root, '.oto-sync-conflicts'),
    priorRebrandedDir: path.join(root, 'prior'),
    currentRebrandedDir: path.join(root, 'current'),
    inventoryPath: path.join(root, 'inventory.json'),
    allowlistPath: path.join(root, 'allowlist.json'),
  };
  await fsp.mkdir(paths.otoDir, { recursive: true });
  await fsp.mkdir(paths.priorRebrandedDir, { recursive: true });
  await fsp.mkdir(paths.currentRebrandedDir, { recursive: true });
  await writeJson(paths.allowlistPath, { version: '1', oto_owned_globs: [], oto_diverged_paths: [] });
  return paths;
}

function inventory(entries) {
  return { version: '1', generated_at: '2026-05-04T00:00:00.000Z', entries };
}

function entry(targetPath, extra = {}) {
  return {
    upstream: 'gsd',
    path: targetPath,
    verdict: 'keep',
    target_path: targetPath,
    reason: 'test',
    rebrand_required: true,
    phase_owner: 9,
    category: 'workflow',
    ...extra,
  };
}

async function runMerge(paths) {
  return mergeAll({
    inventoryPath: paths.inventoryPath,
    allowlistPath: paths.allowlistPath,
    otoDir: paths.otoDir,
    conflictsDir: paths.conflictsDir,
    priorRebrandedDir: paths.priorRebrandedDir,
    currentRebrandedDir: paths.currentRebrandedDir,
    upstream: 'gsd',
    priorTag: 'v1',
    priorSha: 'a'.repeat(40),
    currentTag: 'v2',
    currentSha: 'b'.repeat(40),
    otoVersion: '0.1.0',
    apply: false,
  });
}

test('SYN-04 / D-10: added file (in current, not in inventory, not in allowlist) emits .oto-sync-conflicts/<path>.added.md', async (t) => {
  const paths = await makeRoot(t);
  const target = 'oto/workflows/conflict.md';
  await writeJson(paths.inventoryPath, inventory([entry(target)]));
  await fsp.mkdir(path.join(paths.currentRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.currentRebrandedDir, target), '# added\n');

  const result = await runMerge(paths);
  const sidecar = path.join(paths.conflictsDir, `${target}.added.md`);

  assert.equal(result.counts.added, 1);
  assert.equal(fs.existsSync(sidecar), true);
  assert.match(await fsp.readFile(sidecar, 'utf8'), /kind: added/);
});

test('SYN-04 / D-10: deleted file (in prior, not in current, oto/ has it) emits .oto-sync-conflicts/<path>.deleted.md', async (t) => {
  const paths = await makeRoot(t);
  const target = 'oto/workflows/sample.md';
  await writeJson(paths.inventoryPath, inventory([entry(target)]));
  await fsp.mkdir(path.join(paths.priorRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.priorRebrandedDir, target), '# old\n');
  await fsp.mkdir(path.join(paths.otoDir, 'workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.otoDir, 'workflows/sample.md'), '# local\n');

  const result = await runMerge(paths);
  const sidecar = path.join(paths.conflictsDir, `${target}.deleted.md`);

  assert.equal(result.counts.deleted, 1);
  assert.equal(fs.existsSync(sidecar), true);
  assert.match(await fsp.readFile(sidecar, 'utf8'), /kind: deleted/);
});

test('SYN-04 / D-17: unclassified-add path causes non-zero exit even if all merges clean', async (t) => {
  const paths = await makeRoot(t);
  await writeJson(paths.inventoryPath, inventory([]));
  const target = 'oto/workflows/random-new.md';
  await fsp.mkdir(path.join(paths.currentRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.currentRebrandedDir, target), '# random\n');

  const result = await runMerge(paths);
  const sidecar = path.join(paths.conflictsDir, `${target}.added.md`);

  assert.equal(result.exitCode, 1);
  assert.equal(result.counts.unclassifiedAdds, 1);
  assert.equal(fs.existsSync(sidecar), true);
  assert.match(await fsp.readFile(sidecar, 'utf8'), /inventory_entry: null/);
});

test('SYN-04 / D-13: sidecar suffix convention .added.md / .deleted.md uses path under .oto-sync-conflicts/', async (t) => {
  const paths = await makeRoot(t);
  const added = 'oto/workflows/added.md';
  const deleted = 'oto/workflows/deleted.md';
  await writeJson(paths.inventoryPath, inventory([entry(added), entry(deleted)]));
  await fsp.mkdir(path.join(paths.currentRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.mkdir(path.join(paths.priorRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.mkdir(path.join(paths.otoDir, 'workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.currentRebrandedDir, added), '# added\n');
  await fsp.writeFile(path.join(paths.priorRebrandedDir, deleted), '# deleted\n');
  await fsp.writeFile(path.join(paths.otoDir, 'workflows/deleted.md'), '# local\n');

  await runMerge(paths);

  assert.equal(fs.existsSync(path.join(paths.conflictsDir, `${added}.added.md`)), true);
  assert.equal(fs.existsSync(path.join(paths.conflictsDir, `${deleted}.deleted.md`)), true);
});

test('D-11: mergeAll resolves rebranded snapshots by target_path rather than upstream path', async (t) => {
  const paths = await makeRoot(t);
  const target = 'oto/workflows/foo-renamed.md';
  await writeJson(paths.inventoryPath, inventory([
    entry(target, { path: 'workflows/foo.md', target_path: target }),
  ]));
  await fsp.mkdir(path.join(paths.currentRebrandedDir, 'oto/workflows'), { recursive: true });
  await fsp.writeFile(path.join(paths.currentRebrandedDir, target), '# renamed target\n');

  const result = await runMerge(paths);

  assert.equal(result.counts.added, 1);
  assert.equal(fs.existsSync(path.join(paths.conflictsDir, `${target}.added.md`)), true);
});
