'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  acceptConflict,
  acceptDeletion,
  keepDeleted,
  refuseIfMarkersRemain,
  assertSafeAcceptPath,
} = require('../bin/lib/sync-accept.cjs');
const { emitYamlHeader } = require('../bin/lib/sync-merge.cjs');

async function makeRoot(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-accept-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const dirs = {
    root,
    otoDir: path.join(root, 'oto'),
    conflictsDir: path.join(root, '.oto-sync-conflicts'),
  };
  await fsp.mkdir(dirs.otoDir, { recursive: true });
  await fsp.mkdir(dirs.conflictsDir, { recursive: true });
  return dirs;
}

function header(relPath, kind = 'modified') {
  return emitYamlHeader({
    kind,
    upstream: 'gsd',
    prior_tag: 'v1',
    prior_sha: 'a'.repeat(40),
    current_tag: 'v2',
    current_sha: 'b'.repeat(40),
    target_path: relPath,
    inventory_entry: { target_path: relPath, verdict: 'keep' },
    timestamp: '2026-05-04T00:00:00.000Z',
    oto_version: '0.1.0-alpha.1',
  });
}

async function writeSidecar(conflictsDir, relPath, suffix, body) {
  const sidecar = path.join(conflictsDir, `${relPath}${suffix}`);
  await fsp.mkdir(path.dirname(sidecar), { recursive: true });
  await fsp.writeFile(sidecar, body);
  return sidecar;
}

test('D-15: oto sync --accept <path> strips YAML header, validates no <<<<<<< markers, writes to oto/<target>, deletes sidecar', async (t) => {
  const { otoDir, conflictsDir } = await makeRoot(t);
  const relPath = 'oto/workflows/x.md';
  const sidecar = await writeSidecar(conflictsDir, relPath, '.md', `${header(relPath)}resolved content body\n`);

  const result = await acceptConflict({ relPath, otoDir, conflictsDir });
  const target = path.join(otoDir, 'workflows/x.md');

  assert.equal(result.acceptedPath, target);
  assert.equal(await fsp.readFile(target, 'utf8'), 'resolved content body\n');
  assert.equal(fs.existsSync(sidecar), false);
});

test('D-15: oto sync --accept <path> refuses with non-zero exit if <<<<<<< markers still present', async (t) => {
  const { otoDir, conflictsDir } = await makeRoot(t);
  const relPath = 'oto/workflows/x.md';
  const sidecar = await writeSidecar(conflictsDir, relPath, '.md', `${header(relPath)}<<<<<<< oto-current\nx\n=======\ny\n>>>>>>> upstream-rebranded\n`);

  await assert.rejects(() => acceptConflict({ relPath, otoDir, conflictsDir }), /markers still present/);
  assert.equal(fs.existsSync(sidecar), true);
  assert.equal(fs.existsSync(path.join(otoDir, 'workflows/x.md')), false);
});

test('D-15: oto sync --accept-deletion <path> removes file from oto/ and updates inventory verdict to dropped_upstream', async (t) => {
  const { root, otoDir, conflictsDir } = await makeRoot(t);
  const relPath = 'oto/workflows/old.md';
  const target = path.join(otoDir, 'workflows/old.md');
  const inventoryPath = path.join(root, 'inventory.json');
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, 'old\n');
  const sidecar = await writeSidecar(conflictsDir, relPath, '.deleted.md', `${header(relPath, 'deleted')}old\n`);
  await fsp.writeFile(inventoryPath, `${JSON.stringify({
    entries: [{ upstream: 'gsd', path: 'old.md', verdict: 'keep', target_path: relPath, reason: 'test' }],
  }, null, 2)}\n`);

  const result = await acceptDeletion({ relPath, otoDir, conflictsDir, inventoryPath });
  const inventory = JSON.parse(await fsp.readFile(inventoryPath, 'utf8'));

  assert.equal(result.inventoryUpdated, true);
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(sidecar), false);
  assert.equal(inventory.entries[0].verdict, 'dropped_upstream');
});

test('D-15: oto sync --keep-deleted <path> records oto-divergence and deletes sidecar without removing oto/<target>', async (t) => {
  const { root, otoDir, conflictsDir } = await makeRoot(t);
  const relPath = 'oto/workflows/keep.md';
  const target = path.join(otoDir, 'workflows/keep.md');
  const allowlistPath = path.join(root, 'allowlist.json');
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, 'oto local\n');
  const sidecar = await writeSidecar(conflictsDir, relPath, '.deleted.md', `${header(relPath, 'deleted')}old\n`);
  await fsp.writeFile(allowlistPath, JSON.stringify({ version: '1', oto_owned_globs: [], oto_diverged_paths: [] }, null, 2) + '\n');

  const result = await keepDeleted({ relPath, conflictsDir, allowlistPath });
  const allowlist = JSON.parse(await fsp.readFile(allowlistPath, 'utf8'));

  assert.equal(result.allowlistUpdated, true);
  assert.equal(await fsp.readFile(target, 'utf8'), 'oto local\n');
  assert.deepEqual(allowlist.oto_diverged_paths, [relPath]);
  assert.equal(fs.existsSync(sidecar), false);
});

test('Path traversal guard (T-09-04): --accept <path> outside oto/ rejected', () => {
  assert.throws(() => assertSafeAcceptPath('/tmp/oto', '../etc/passwd'), /path traversal/);
  assert.throws(() => assertSafeAcceptPath('/tmp/oto', '/etc/passwd'), /path traversal/);
});

test('T-09-06: marker refusal is start-of-line anchored', () => {
  assert.throws(() => refuseIfMarkersRemain('<<<<<<< oto-current\n'), /markers still present/);
  assert.doesNotThrow(() => refuseIfMarkersRemain('text containing <<<<<<< inline does not refuse'));
});
