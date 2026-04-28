'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CLOSE_MARKER,
  OPEN_MARKER,
  findUpstreamMarkers,
  injectMarkerBlock,
  removeMarkerBlock,
} = require('../bin/lib/marker.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 (marker injection and upstream marker detection)
// Filled by: 03-03-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-marker-test-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

test('INS-04: injectMarkerBlock creates file when missing with single trailing newline', (t) => {
  const filePath = path.join(tmpDir(t), 'CLAUDE.md');

  injectMarkerBlock(filePath, OPEN_MARKER, CLOSE_MARKER, 'body');

  assert.equal(
    fs.readFileSync(filePath, 'utf8'),
    '<!-- OTO Configuration -->\nbody\n<!-- /OTO Configuration -->\n',
  );
});

test('INS-04: injectMarkerBlock replaces only content between markers when present', (t) => {
  const filePath = path.join(tmpDir(t), 'CLAUDE.md');
  fs.writeFileSync(
    filePath,
    '# User Notes\n\n<!-- OTO Configuration -->\nold body\n<!-- /OTO Configuration -->\n\nDo not touch this.\n',
  );

  injectMarkerBlock(filePath, OPEN_MARKER, CLOSE_MARKER, 'new body');

  assert.equal(
    fs.readFileSync(filePath, 'utf8'),
    '# User Notes\n\n<!-- OTO Configuration -->\nnew body\n<!-- /OTO Configuration -->\n\nDo not touch this.\n',
  );
});

test('INS-04: injectMarkerBlock appends block when markers absent', (t) => {
  const filePath = path.join(tmpDir(t), 'AGENTS.md');
  fs.writeFileSync(filePath, '# User Notes\n');

  injectMarkerBlock(filePath, OPEN_MARKER, CLOSE_MARKER, 'body');

  assert.equal(
    fs.readFileSync(filePath, 'utf8'),
    '# User Notes\n\n<!-- OTO Configuration -->\nbody\n<!-- /OTO Configuration -->\n',
  );
});

test('INS-04: injectMarkerBlock is idempotent — second call produces byte-identical file', (t) => {
  const filePath = path.join(tmpDir(t), 'GEMINI.md');

  injectMarkerBlock(filePath, OPEN_MARKER, CLOSE_MARKER, 'body');
  const first = fs.readFileSync(filePath, 'utf8');
  injectMarkerBlock(filePath, OPEN_MARKER, CLOSE_MARKER, 'body');

  assert.equal(fs.readFileSync(filePath, 'utf8'), first);
});

test('INS-04: removeMarkerBlock strips block + leaves rest of file intact', (t) => {
  const dir = tmpDir(t);
  const mixedPath = path.join(dir, 'CLAUDE.md');
  const onlyBlockPath = path.join(dir, 'AGENTS.md');
  fs.writeFileSync(
    mixedPath,
    '# User Notes\n\n<!-- OTO Configuration -->\nbody\n<!-- /OTO Configuration -->\n\nDo not touch this.\n',
  );
  fs.writeFileSync(
    onlyBlockPath,
    '<!-- OTO Configuration -->\nbody\n<!-- /OTO Configuration -->\n',
  );

  removeMarkerBlock(mixedPath, OPEN_MARKER, CLOSE_MARKER);
  removeMarkerBlock(onlyBlockPath, OPEN_MARKER, CLOSE_MARKER);

  assert.equal(fs.readFileSync(mixedPath, 'utf8'), '# User Notes\n\nDo not touch this.\n');
  assert.equal(fs.existsSync(onlyBlockPath), false);
});

test('INS-04: findUpstreamMarkers returns [] for clean file', (t) => {
  const filePath = path.join(tmpDir(t), 'CLAUDE.md');
  fs.writeFileSync(filePath, '# User Notes\n');

  assert.deepEqual(findUpstreamMarkers(filePath), []);
});

test('INS-04: findUpstreamMarkers detects "<!-- GSD Configuration" and Superpowers identity', (t) => {
  const filePath = path.join(tmpDir(t), 'AGENTS.md');
  fs.writeFileSync(
    filePath,
    '<!-- GSD Configuration -->\n<EXTREMELY_IMPORTANT>You have superpowers.\n',
  );

  assert.deepEqual(findUpstreamMarkers(filePath), ['GSD', 'Superpowers']);
});
