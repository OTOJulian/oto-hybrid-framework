'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const walker = require('../scripts/rebrand/lib/walker.cjs');
const manifest = require('../scripts/rebrand/lib/manifest.cjs');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');

function loadAllowlist() {
  const map = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'rename-map.json'), 'utf8'));
  return walker.compileAllowlist(map.do_not_rename);
}

test('coverage manifest pre-run counts upstream gsd tokens', { timeout: 30000 }, async () => {
  const pre = await manifest.buildPre(path.join(REPO_ROOT, 'tests', 'fixtures', 'rebrand-corpus'), loadAllowlist(), new Map());
  const hasGsd = Object.values(pre.files).some((entry) => entry.counts.gsd > 0);
  assert.equal(hasGsd, true);
});

test('coverage manifest post-run asserts zero outside allowlist on applied tree', { timeout: 30000 }, async (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-coverage-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = await engine.run({ mode: 'apply', target: path.join(REPO_ROOT, 'tests', 'fixtures', 'rebrand-corpus'), out, owner: 'OTOJulian' });
  assert.equal(result.exitCode, 0);
  const post = await manifest.buildPost(out, loadAllowlist(), new Map());
  assert.deepEqual(manifest.assertZeroOutsideAllowlist(post, loadAllowlist()), []);
});

test('coverage manifest reports non-allowlisted post failures', () => {
  const failures = manifest.assertZeroOutsideAllowlist({
    version: '1',
    files: {
      'foo.md': { allowlisted: false, counts: { gsd: 5, GSD: 0, 'Get Shit Done': 0, superpowers: 0, Superpowers: 0 } }
    }
  }, { pathGlobs: [], literals: [], regexes: [] });
  assert.deepEqual(failures, [{ path: 'foo.md', token: 'gsd', count: 5 }]);
});

test('current upstream-only regression tests are explicitly coverage-allowlisted', () => {
  const allowlist = loadAllowlist();
  const sources = new Set(allowlist.pathGlobs.map((entry) => entry.source));
  for (const relPath of [
    'tests/bug-2808-skill-hyphen-name.test.cjs',
    'tests/bug-3677-agent-colon-namespace-leak.test.cjs',
    'tests/enh-2792-namespace-skills.test.cjs',
  ]) {
    assert.ok(sources.has(relPath), `missing explicit upstream-only coverage classification: ${relPath}`);
  }
});

test('coverage cleanup rebrands a gsd-hyphen regex in retained install-profiles', { timeout: 30000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-coverage-install-profiles-'));
  const out = path.join(root, 'out');
  const reportsDir = path.join(root, 'reports');
  const source = path.join(root, 'get-shit-done', 'bin', 'lib', 'install-profiles.cjs');
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.writeFileSync(source, "const matches = content.match(/\\bgsd-[a-z][a-z-]*/g);\n");
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const result = await engine.run({ mode: 'apply', target: root, out, reportsDir, owner: 'OTOJulian' });

  assert.equal(result.exitCode, 0);
  assert.equal(
    fs.readFileSync(path.join(out, 'oto', 'bin', 'lib', 'install-profiles.cjs'), 'utf8'),
    "const matches = content.match(/\\boto-[a-z][a-z-]*/g);\n",
  );
});
