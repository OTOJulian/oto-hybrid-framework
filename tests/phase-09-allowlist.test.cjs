'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { matchAllowlist, mergeAll } = require('../bin/lib/sync-merge.cjs');

async function tmpRoot(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-allowlist-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  return root;
}

async function runAllowlistMerge({ root, currentRebrandedDir, inventoryPath = 'decisions/file-inventory.json', allowlistPath = 'decisions/sync-allowlist.json' }) {
  return mergeAll({
    inventoryPath,
    allowlistPath,
    otoDir: path.join(root, 'oto'),
    conflictsDir: path.join(root, '.oto-sync-conflicts'),
    priorRebrandedDir: path.join(root, 'prior'),
    currentRebrandedDir,
    upstream: 'gsd',
    priorTag: 'v1',
    priorSha: 'a'.repeat(40),
    currentTag: 'v2',
    currentSha: 'b'.repeat(40),
    otoVersion: '0.1.0-alpha.1',
    apply: false,
  });
}

test('D-16: glob match - oto-owned path (e.g. bin/lib/codex-toml.cjs) is never compared against upstream', async (t) => {
  const root = await tmpRoot(t);
  const current = path.join(root, 'current');
  await fsp.mkdir(path.join(current, 'bin/lib'), { recursive: true });
  await fsp.writeFile(path.join(current, 'bin/lib/codex-toml.cjs'), "'use strict';\n");

  const result = await runAllowlistMerge({ root, currentRebrandedDir: current });

  assert.equal(result.counts.unclassifiedAdds, 0);
  assert.equal(fs.existsSync(path.join(root, '.oto-sync-conflicts/bin/lib/codex-toml.cjs.added.md')), false);
});

test('D-17 / Pitfall 7: allowlist completeness - sync against foundation-frameworks/get-shit-done-main/ produces 0 unclassified adds', async (t) => {
  const root = await tmpRoot(t);
  const current = path.resolve('foundation-frameworks/get-shit-done-main');

  const result = await runAllowlistMerge({ root, currentRebrandedDir: current });

  assert.equal(result.counts.unclassifiedAdds, 0);
});

test('D-16: glob ** suffix matches deeply nested paths (e.g. .oto/foo/bar)', () => {
  assert.equal(matchAllowlist('.oto/foo/bar/baz', ['.oto/**']), true);
  assert.equal(matchAllowlist('decisions/sub/nested.md', ['decisions/**']), true);
});

test('Pitfall 8: allowlist is read by sync code (decisions/file-inventory.json, decisions/sync-allowlist.json themselves are oto-owned)', async (t) => {
  const root = await tmpRoot(t);
  const current = path.join(root, 'current');
  await fsp.mkdir(path.join(current, 'decisions'), { recursive: true });
  await fsp.writeFile(path.join(current, 'decisions/file-inventory.json'), '{}\n');

  const result = await runAllowlistMerge({ root, currentRebrandedDir: current });

  assert.equal(matchAllowlist('decisions/file-inventory.json', ['decisions/**']), true);
  assert.equal(result.counts.unclassifiedAdds, 0);
});
