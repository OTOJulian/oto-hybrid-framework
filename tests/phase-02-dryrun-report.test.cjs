'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');

function runDryrun() {
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-dryrun-report-'));
  const result = childProcess.spawnSync(process.execPath, [
    'scripts/rebrand.cjs',
    '--dry-run',
    '--target',
    'tests/fixtures/rebrand-corpus/',
    '--reports-dir',
    reportsDir
  ], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  return { result, reportsDir };
}

test('CLI dry-run writes JSON and markdown reports', { timeout: 30000 }, () => {
  const { result, reportsDir } = runDryrun();
  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const jsonPath = path.join(reportsDir, 'rebrand-dryrun.json');
    const mdPath = path.join(reportsDir, 'rebrand-dryrun.md');
    assert.equal(fs.existsSync(jsonPath), true);
    assert.equal(fs.existsSync(mdPath), true);
    assert.ok(fs.readFileSync(mdPath, 'utf8').length > 0);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.equal(json.unclassified_total, 0);
  } finally {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
});

test('CLI dry-run report includes real rule-type counts', { timeout: 30000 }, () => {
  const { result, reportsDir } = runDryrun();
  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const json = JSON.parse(fs.readFileSync(path.join(reportsDir, 'rebrand-dryrun.json'), 'utf8'));
    assert.ok(json.summary_by_rule_type.identifier > 0);
    assert.ok(json.summary_by_rule_type.path > 0);
    assert.ok(json.summary_by_rule_type.command > 0);
  } finally {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
});

test('CLI dry-run report file entries match the D-04 shape', { timeout: 30000 }, () => {
  const { result, reportsDir } = runDryrun();
  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const json = JSON.parse(fs.readFileSync(path.join(reportsDir, 'rebrand-dryrun.json'), 'utf8'));
    assert.ok(Array.isArray(json.files));
    assert.ok(json.files.length > 0);
    for (const entry of json.files.slice(0, 25)) {
      for (const key of ['path', 'target_path', 'file_class', 'matches', 'unclassified_count']) {
        assert.equal(Object.hasOwn(entry, key), true, `missing ${key}`);
      }
    }
  } finally {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
});

test('CLI dry-run report includes projected target paths for inventory-backed files', { timeout: 30000 }, () => {
  const reportsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-dryrun-report-'));
  try {
    const result = childProcess.spawnSync(process.execPath, [
      'scripts/rebrand.cjs',
      '--dry-run',
      '--target',
      'tests/fixtures/rebrand-corpus/get-shit-done-main',
      '--owner',
      'OTOJulian',
      '--reports-dir',
      reportsDir
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const json = JSON.parse(fs.readFileSync(path.join(reportsDir, 'rebrand-dryrun.json'), 'utf8'));
    const byPath = new Map(json.files.map((entry) => [entry.path, entry]));
    assert.equal(
      byPath.get('get-shit-done/workflows/ingest-docs.md')?.target_path,
      'oto/workflows/ingest-docs.md'
    );
    assert.equal(
      byPath.get('get-shit-done/workflows/eval-review.md')?.target_path,
      'oto/workflows/eval-review.md'
    );
  } finally {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
});
