'use strict';
// Projection shape locked by D-10-07 in 10-RESEARCH.md. Cross-plan contract
// with tests/regen-rebrand-snapshots.cjs (Plan 02 Task 1b).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS_DIR = path.join(REPO_ROOT, 'tests/fixtures/phase-10/rebrand-snapshots');
const FIXTURES_DIR = path.join(REPO_ROOT, 'tests/fixtures/rebrand');
const REPORT_PATHS = [
  path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'),
  path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.md'),
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function sanitizeString(value) {
  return String(value)
    .replaceAll(toPosix(os.tmpdir()), '<tmp>')
    .replaceAll(os.tmpdir(), '<tmp>')
    .replace(/\/var\/folders\/[^\s"')]+/g, '<tmp>')
    .replace(/\/tmp\/[^\s"')]+/g, '<tmp>')
    .replace(/\b[0-9a-f]{40}\b/g, '<sha>');
}

function normalizeReportPath(filePath, inputDir) {
  const rel = path.isAbsolute(filePath) ? path.relative(inputDir, filePath) : filePath;
  return sanitizeString(toPosix(rel));
}

function buildProjection(engineResult, inputDir) {
  const files = engineResult.report?.files || engineResult.files || [];
  const projections = files
    .map((entry) => ({
      file: normalizeReportPath(entry.path, inputDir),
      classifications: (entry.matches || [])
        .map((match) => ({
          rule: sanitizeString(match.rule || match.rule_type || 'unknown'),
          before: sanitizeString(match.before ?? match.from ?? ''),
          after: sanitizeString(match.after ?? match.to ?? ''),
          line: Number(match.line || 0),
        }))
        .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule)),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

  assert.equal(projections.length, 1, 'single-fixture snapshot run should produce one projection');
  return projections[0];
}

async function preserveReports(fn) {
  const originals = REPORT_PATHS.map((filePath) => ({
    filePath,
    exists: fs.existsSync(filePath),
    content: fs.existsSync(filePath) ? fs.readFileSync(filePath) : null,
  }));
  try {
    return await fn();
  } finally {
    for (const original of originals) {
      if (original.exists) {
        fs.writeFileSync(original.filePath, original.content);
      } else {
        fs.rmSync(original.filePath, { force: true });
      }
    }
  }
}

const fixtures = fs.readdirSync(FIXTURES_DIR).filter((entry) => fs.statSync(path.join(FIXTURES_DIR, entry)).isFile()).sort();

for (const fixture of fixtures) {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${fixture}.json`);
  if (!fs.existsSync(snapshotPath)) {
    test.todo(`snapshot for ${fixture} not yet seeded - Plan 02 Task 1b will run regen-rebrand-snapshots.cjs`);
    continue;
  }

  test(`CI-04: rebrand projection snapshot matches ${fixture}`, { timeout: 30000 }, async (t) => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-rebrand-snapshot-'));
    t.after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));
    const inputDir = path.join(tmpRoot, 'input');
    fs.mkdirSync(inputDir, { recursive: true });
    fs.copyFileSync(path.join(FIXTURES_DIR, fixture), path.join(inputDir, fixture));

    const { result, report } = await preserveReports(async () => {
      const runResult = await engine.run({ mode: 'dry-run', target: inputDir, owner: 'OTOJulian' });
      const reportBody = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'), 'utf8'));
      return { result: runResult, report: reportBody };
    });

    assert.equal(result.exitCode, 0);
    const actual = buildProjection({ report }, inputDir);
    const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    assert.deepEqual(actual, expected);
  });
}
