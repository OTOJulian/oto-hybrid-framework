'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');
const { GSD_REF, probeCorpusClone, cloneCorpus } = require('./helpers/corpus-clone.cjs');

test(
  'engine dry-run classifies the real upstream tree with zero unclassified matches',
  { timeout: 120000, skip: probeCorpusClone(GSD_REF).reason || false },
  async () => {
    const target = await cloneCorpus(GSD_REF);
    const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-corpus-classify-'));
    try {
      const result = await engine.run({ mode: 'dry-run', target, mapPath: 'rename-map.json', reportsDir });
      assert.equal(result.exitCode, 0);
      const report = JSON.parse(fs.readFileSync(path.join(reportsDir, 'rebrand-dryrun.json'), 'utf8'));
      assert.equal(report.unclassified_total, 0);
      for (const key of ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var']) {
        assert.equal(Object.hasOwn(report.summary_by_rule_type, key), true);
      }
    } finally {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  }
);
