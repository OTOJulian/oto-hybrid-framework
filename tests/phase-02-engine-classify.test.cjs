'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');

test('engine rejects rename maps with unknown rule classes', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-schema-test-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const map = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'rename-map.json'), 'utf8'));
  map.rules.weird_class = [{ from: 'x', to: 'y' }];
  const mapPath = path.join(tmp, 'rename-map.json');
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  const result = await engine.run({ mode: 'dry-run', target: 'tests/fixtures/rebrand-corpus/', mapPath });
  assert.equal(result.exitCode, 4);
});
