'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const REPO_REPORTS = path.join(REPO_ROOT, 'reports');
const COVERAGE_REPORTS = [
  'coverage-manifest.pre.json',
  'coverage-manifest.post.json',
  'coverage-manifest.delta.md'
];
const DRYRUN_REPORTS = [
  'rebrand-dryrun.json',
  'rebrand-dryrun.md'
];

function tempTree(t, prefix) {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-src-`));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-out-`));
  fs.writeFileSync(path.join(src, 'README.md'), 'run /gsd-execute-phase with Get Shit Done\n');
  t.after(() => {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
  });
  return { src, out };
}

function snapshotReports(names) {
  return Object.fromEntries(names.map((name) => {
    const filePath = path.join(REPO_REPORTS, name);
    if (!fs.existsSync(filePath)) return [name, null];
    return [name, crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')];
  }));
}

test('apply honors skipReports by leaving coverage-manifest reports untouched', { timeout: 30000 }, async (t) => {
  const { src, out } = tempTree(t, 'oto-engine-skipReports');
  const before = snapshotReports(COVERAGE_REPORTS);

  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian', skipReports: true });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(snapshotReports(COVERAGE_REPORTS), before);
});

test('apply honors reportsDir for coverage-manifest output', { timeout: 30000 }, async (t) => {
  const { src, out } = tempTree(t, 'oto-engine-reportsDir');
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-engine-reports-'));
  t.after(() => fs.rmSync(reportsDir, { recursive: true, force: true }));
  const before = snapshotReports(COVERAGE_REPORTS);

  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian', reportsDir });

  assert.equal(result.exitCode, 0);
  for (const name of COVERAGE_REPORTS) {
    assert.equal(fs.existsSync(path.join(reportsDir, name)), true, `${name} missing from custom reportsDir`);
  }
  assert.deepEqual(snapshotReports(COVERAGE_REPORTS), before);
});

test('default apply still writes coverage-manifest reports under repo reports', { timeout: 30000 }, async (t) => {
  const { src, out } = tempTree(t, 'oto-engine-defaultReports');

  const result = await engine.run({ mode: 'apply', target: src, out, owner: 'OTOJulian' });

  assert.equal(result.exitCode, 0);
  for (const name of COVERAGE_REPORTS) {
    assert.equal(fs.existsSync(path.join(REPO_REPORTS, name)), true, `${name} missing from repo reports`);
  }
});

test('dry-run honors options.reportsDir', { timeout: 30000 }, async (t) => {
  const { src } = tempTree(t, 'oto-engine-dryrunReports');
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-engine-dryrun-reports-'));
  t.after(() => fs.rmSync(reportsDir, { recursive: true, force: true }));
  const before = snapshotReports(DRYRUN_REPORTS);

  const result = await engine.run({ mode: 'dry-run', target: src, owner: 'OTOJulian', reportsDir });

  assert.equal(result.exitCode, 0);
  for (const name of DRYRUN_REPORTS) {
    assert.equal(fs.existsSync(path.join(reportsDir, name)), true, `${name} missing from custom reportsDir`);
  }
  assert.deepEqual(snapshotReports(DRYRUN_REPORTS), before);
});

test('default dry-run still writes reports under repo reports', { timeout: 30000 }, async (t) => {
  const { src } = tempTree(t, 'oto-engine-defaultDryrunReports');

  const result = await engine.run({ mode: 'dry-run', target: src, owner: 'OTOJulian' });

  assert.equal(result.exitCode, 0);
  for (const name of DRYRUN_REPORTS) {
    assert.equal(fs.existsSync(path.join(REPO_REPORTS, name)), true, `${name} missing from repo reports`);
  }
});
