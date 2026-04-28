'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');

test('engine dry-run classifies the real upstream tree with zero unclassified matches', { timeout: 30000 }, async () => {
  const result = await engine.run({ mode: 'dry-run', target: 'foundation-frameworks/', mapPath: 'rename-map.json' });
  assert.equal(result.exitCode, 0);
  const report = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'), 'utf8'));
  assert.equal(report.unclassified_total, 0);
  for (const key of ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var']) {
    assert.equal(Object.hasOwn(report.summary_by_rule_type, key), true);
  }
});

test('engine rejects rename maps with unknown rule classes', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-schema-test-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const map = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'rename-map.json'), 'utf8'));
  map.rules.weird_class = [{ from: 'x', to: 'y' }];
  const mapPath = path.join(tmp, 'rename-map.json');
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  const result = await engine.run({ mode: 'dry-run', target: 'foundation-frameworks/', mapPath });
  assert.equal(result.exitCode, 4);
});
