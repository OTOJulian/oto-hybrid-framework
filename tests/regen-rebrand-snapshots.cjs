#!/usr/bin/env node
'use strict';
// D-10-07: Emits the LOCKED rebrand-snapshot projection shape.
// Cross-plan contract with tests/phase-10-rebrand-snapshot.test.cjs.
// Shape: { file, classifications: [{ rule, before, after, line }, ...] }
// Sort: file ASC, then line ASC. NO abs paths, NO temp-dir refs, NO SHAs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const engine = require('../scripts/rebrand/lib/engine.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(REPO_ROOT, 'tests/fixtures/rebrand');
const SNAPSHOTS = path.join(REPO_ROOT, 'tests/fixtures/phase-10/rebrand-snapshots');
const MAP_PATH = path.join(REPO_ROOT, 'rename-map.json');
const REPORT_PATHS = [
  path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'),
  path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.md'),
];

function snapshotName(fname) {
  return `${path.parse(fname).name}.json`;
}

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

async function captureFixture(fname) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-snap-'));
  try {
    const inputDir = path.join(tmp, 'in');
    const outDir = path.join(tmp, 'out');
    fs.mkdirSync(inputDir, { recursive: true });
    fs.copyFileSync(path.join(FIXTURES, fname), path.join(inputDir, fname));

    const reportBody = await preserveReports(async () => {
      const result = await engine.run({
        mode: 'dry-run',
        target: inputDir,
        out: outDir,
        owner: 'OTOJulian',
        mapPath: MAP_PATH,
      });
      assert.equal(result.exitCode, 0);
      return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'rebrand-dryrun.json'), 'utf8'));
    });

    const projection = buildProjection({ report: reportBody }, inputDir);
    const snapPath = path.join(SNAPSHOTS, snapshotName(fname));
    fs.writeFileSync(snapPath, `${JSON.stringify(projection, null, 2)}\n`);
    console.log(`captured ${path.relative(REPO_ROOT, snapPath)}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function assertNoLeaks() {
  for (const fname of fs.readdirSync(SNAPSHOTS)) {
    if (!fname.endsWith('.json')) continue;
    const body = fs.readFileSync(path.join(SNAPSHOTS, fname), 'utf8');
    if (/\/var\/folders\/|\/tmp\/|\/Users\/|[a-f0-9]{40}/.test(body)) {
      throw new Error(`LEAK in ${fname}: contains abs path, temp-dir ref, or SHA`);
    }
  }
}

(async () => {
  fs.mkdirSync(SNAPSHOTS, { recursive: true });
  for (const fname of fs.readdirSync(FIXTURES).sort()) {
    if (!/\.(md|txt|js|json)$/.test(fname)) continue;
    await captureFixture(fname);
  }
  assertNoLeaks();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
