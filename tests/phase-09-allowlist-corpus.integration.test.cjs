'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { mergeAll } = require('../bin/lib/sync-merge.cjs');
const { GSD_REF, probeCorpusClone, cloneCorpus } = require('./helpers/corpus-clone.cjs');

test(
  'D-17 / Pitfall 7: allowlist completeness - sync against a real cloned upstream tree produces 0 unclassified adds',
  { timeout: 120000, skip: probeCorpusClone(GSD_REF).reason || false },
  async (t) => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-allowlist-corpus-'));
    t.after(() => fsp.rm(root, { recursive: true, force: true }));
    const current = await cloneCorpus(GSD_REF);

    const result = await mergeAll({
      inventoryPath: 'decisions/file-inventory.json',
      allowlistPath: 'decisions/sync-allowlist.json',
      otoDir: path.join(root, 'oto'),
      conflictsDir: path.join(root, '.oto-sync-conflicts'),
      priorRebrandedDir: path.join(root, 'prior'),
      currentRebrandedDir: current,
      upstream: 'gsd',
      priorTag: 'v1',
      priorSha: 'a'.repeat(40),
      currentTag: 'v2',
      currentSha: 'b'.repeat(40),
      otoVersion: '0.1.0',
      apply: false,
    });

    assert.equal(result.counts.unclassifiedAdds, 0);
  }
);
