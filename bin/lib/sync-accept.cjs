'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const HEADER_RE = /^---\n([\s\S]*?\n)---\n/;
const MARKER_RE = /^(<{7}|={7}|>{7})/m;

function stripYamlHeader(content) {
  const match = HEADER_RE.exec(content);
  if (!match) throw new Error('Conflict file missing YAML header');
  return content.slice(match[0].length);
}

function refuseIfMarkersRemain(content) {
  if (MARKER_RE.test(content)) {
    throw new Error('Refusing to accept: <<<<<<< / ======= / >>>>>>> markers still present at start-of-line');
  }
}

function assertSafeAcceptPath(rootDir, relPath) {
  const resolved = path.resolve(rootDir, relPath);
  const root = path.resolve(rootDir) + path.sep;
  if (!resolved.startsWith(root) && resolved !== path.resolve(rootDir)) {
    throw new Error(`refusing path traversal: '${relPath}' resolves outside ${rootDir}`);
  }
  return resolved;
}

function stripOtoPrefixForOtoRoot(otoDir, relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (path.basename(path.resolve(otoDir)) === 'oto' && normalized.startsWith('oto/')) {
    return normalized.slice('oto/'.length);
  }
  return normalized;
}

function targetPathFor(otoDir, relPath) {
  return assertSafeAcceptPath(otoDir, stripOtoPrefixForOtoRoot(otoDir, relPath));
}

async function readSidecar(sidecar) {
  try {
    return await fsp.readFile(sidecar, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Conflict sidecar not found at ${sidecar}; nothing to accept`);
    }
    throw error;
  }
}

async function acceptConflict({ relPath, otoDir, conflictsDir }) {
  const sidecar = assertSafeAcceptPath(conflictsDir, `${relPath}.md`);
  const target = targetPathFor(otoDir, relPath);
  const raw = await readSidecar(sidecar);
  refuseIfMarkersRemain(raw);
  const stripped = stripYamlHeader(raw);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, stripped);
  await fsp.unlink(sidecar);
  return { acceptedPath: target };
}

async function acceptDeletion({ relPath, otoDir, conflictsDir, inventoryPath }) {
  const sidecar = assertSafeAcceptPath(conflictsDir, `${relPath}.deleted.md`);
  const target = targetPathFor(otoDir, relPath);
  await readSidecar(sidecar);
  const inventory = JSON.parse(await fsp.readFile(inventoryPath, 'utf8'));
  const entry = (inventory.entries || []).find((candidate) => candidate.target_path === relPath);
  if (!entry) throw new Error(`No inventory entry with target_path '${relPath}'`);
  entry.verdict = 'dropped_upstream';
  await fsp.writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  try {
    await fsp.unlink(target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await fsp.unlink(sidecar);
  return { removedPath: target, inventoryUpdated: true };
}

async function keepDeleted({ relPath, conflictsDir, allowlistPath }) {
  const sidecar = assertSafeAcceptPath(conflictsDir, `${relPath}.deleted.md`);
  await readSidecar(sidecar);
  const allowlist = JSON.parse(await fsp.readFile(allowlistPath, 'utf8'));
  allowlist.oto_diverged_paths = allowlist.oto_diverged_paths || [];
  if (!allowlist.oto_diverged_paths.includes(relPath)) {
    allowlist.oto_diverged_paths.push(relPath);
  }
  await fsp.writeFile(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);
  await fsp.unlink(sidecar);
  return { divergedPath: relPath, allowlistUpdated: true };
}

module.exports = {
  acceptConflict,
  acceptDeletion,
  keepDeleted,
  stripYamlHeader,
  refuseIfMarkersRemain,
  assertSafeAcceptPath,
};
