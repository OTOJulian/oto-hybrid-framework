'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { mergeOneFile, looksBinary, emitYamlHeader } = require('../bin/lib/sync-merge.cjs');

const TRIO = path.join(__dirname, 'fixtures/phase-09/three-version-trio');

test('SYN-04: 3-way merge - non-overlapping edits return exit 0 + clean content', () => {
  const result = mergeOneFile({
    otoPath: path.join(TRIO, 'current.txt'),
    basePath: path.join(TRIO, 'base.txt'),
    otherPath: path.join(TRIO, 'other.txt'),
    targetPath: 'clean.txt',
  });

  assert.equal(result.kind, 'clean');
  assert.equal(result.content, 'alpha-EDITED\nbeta\ngamma-EDITED\n');
});

test('SYN-04: 3-way merge - same-line clash returns exit > 0 + content with <<<<<<< markers', () => {
  const result = mergeOneFile({
    otoPath: path.join(TRIO, 'conflict-current.txt'),
    basePath: path.join(TRIO, 'conflict-base.txt'),
    otherPath: path.join(TRIO, 'conflict-other.txt'),
    targetPath: 'conflict.txt',
  });

  assert.equal(result.kind, 'conflict');
  assert.ok(result.hunks >= 1);
  assert.match(result.content, /<<<<<<<|=======|>>>>>>>/);
});

test('SYN-04 / Pitfall 1: missing input file -> exit 255 -> mergeOneFile throws diagnostic error', () => {
  assert.throws(() => {
    mergeOneFile({
      otoPath: path.join(TRIO, 'conflict-current.txt'),
      basePath: path.join(TRIO, 'missing.txt'),
      otherPath: path.join(TRIO, 'conflict-other.txt'),
      targetPath: 'missing.txt',
    });
  }, /unexpected null trio/);

  const raw = spawnSync('git', [
    'merge-file', '-p',
    path.join(TRIO, 'conflict-current.txt'),
    path.join(TRIO, 'missing.txt'),
    path.join(TRIO, 'conflict-other.txt'),
  ], { encoding: 'utf8' });
  assert.equal(raw.status, 255);
});

test('SYN-04 / Pitfall 4: binary input (NUL byte in first 8KB) routed to sidecar - git merge-file NOT invoked', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-binary-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const oto = path.join(root, 'oto.bin');
  const base = path.join(root, 'base.bin');
  const other = path.join(root, 'other.bin');
  await fsp.writeFile(oto, Buffer.from([1, 2, 0, 3]));
  await fsp.writeFile(base, Buffer.from('base\n'));
  await fsp.writeFile(other, Buffer.from('other\n'));

  const result = mergeOneFile({ otoPath: oto, basePath: base, otherPath: other, targetPath: 'binary.bin' });

  assert.equal(looksBinary(Buffer.from([1, 2, 0])), true);
  assert.equal(result.kind, 'binary');
  assert.equal(Buffer.isBuffer(result.content), true);
});

test('SYN-04 / Pitfall 6: -L label order - first label = current (oto), third label = other (upstream)', () => {
  const result = mergeOneFile({
    otoPath: path.join(TRIO, 'conflict-current.txt'),
    basePath: path.join(TRIO, 'conflict-base.txt'),
    otherPath: path.join(TRIO, 'conflict-other.txt'),
    targetPath: 'conflict.txt',
  });

  assert.match(result.content, /<<<<<<< oto-current/);
  assert.match(result.content, />>>>>>> upstream-rebranded/);
  assert.doesNotMatch(result.content, /<<<<<<< prior-rebranded/);
});

test('SYN-04 / D-12: conflict-file YAML header contains kind, upstream, prior_tag, prior_sha, current_tag, current_sha, target_path, inventory_entry, timestamp, oto_version (10 fields)', () => {
  const header = emitYamlHeader({
    kind: 'modified',
    upstream: 'gsd',
    prior_tag: 'v1',
    prior_sha: 'a'.repeat(40),
    current_tag: 'v2',
    current_sha: 'b'.repeat(40),
    target_path: 'oto/workflows/x.md',
    inventory_entry: { verdict: 'keep' },
    timestamp: '2026-05-04T00:00:00.000Z',
    oto_version: '0.1.0',
  });
  const lines = header.split('\n');
  const keys = ['kind', 'upstream', 'prior_tag', 'prior_sha', 'current_tag', 'current_sha', 'target_path', 'inventory_entry', 'timestamp', 'oto_version'];

  assert.equal(lines[0], '---');
  assert.equal(lines[11], '---');
  for (const key of keys) {
    assert.ok(lines.some((line) => line.startsWith(`${key}:`)), `${key} missing`);
  }
  assert.equal(keys.length, 10);
  assert.match(header, /inventory_entry: {"verdict":"keep"}/);
  assert.match(header, /oto_version: 0.1.0/);
});
