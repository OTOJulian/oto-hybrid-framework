'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fsp = require('node:fs/promises');
const os = require('node:os');
const { buildBareUpstream } = require('./fixtures/phase-09/build-bare-upstream.cjs');
const { pullUpstream, classifyRef, validateRef } = require('../bin/lib/sync-pull.cjs');
const { validate } = require('../scripts/rebrand/lib/validate-schema.cjs');
const lastSyncedSchema = require('../schema/last-synced-commit.json');

async function makeFixture(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-sync-test-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const fixture = await buildBareUpstream({ rootDir: root });
  return { root, fixture };
}

test('SYN-01: pullUpstream clones at tag into .oto-sync/upstream/gsd/current/', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  const record = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  assert.equal(record.upstream, 'gsd');
  assert.equal(record.ref, 'v1.0.0');
  assert.match(record.sha, /^[0-9a-f]{40}$/);
  assert.equal(fs.existsSync(path.join(destDir, 'current', 'README.md')), true);
});

test('SYN-01: snapshot rotation - current/ becomes prior/ on second pull', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');

  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });
  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.1.0', destDir });

  assert.equal(await fsp.readFile(path.join(destDir, 'prior', 'README.md'), 'utf8'), 'line1\nline2\nline3\n');
  assert.equal(await fsp.readFile(path.join(destDir, 'current', 'README.md'), 'utf8'), 'line1\nline2 EDIT\nline3\n');
});

test('SYN-01: snapshot rotation - first sync skips rotation when prior/ does not exist', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');

  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  assert.equal(fs.existsSync(path.join(destDir, 'prior')), false);
  assert.equal(fs.existsSync(path.join(destDir, 'current', 'README.md')), true);
});

test('SYN-01: tag-pin uses --depth 1 --branch <tag> against file:// URL', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  const record = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  assert.equal(record.ref_kind, 'tag-or-branch');
  assert.equal(fs.existsSync(path.join(destDir, 'current', '.git', 'shallow')), true);
});

test('SYN-01: SHA-pin falls back to full clone + git checkout <sha>', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const firstDest = path.join(root, 'sync', 'first');
  const shaDest = path.join(root, 'sync', 'sha');
  const first = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir: firstDest });
  const record = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: first.sha, destDir: shaDest });

  assert.equal(record.ref_kind, 'sha');
  assert.equal(record.sha, first.sha);
  assert.equal(fs.existsSync(path.join(shaDest, 'current', '.git', 'shallow')), false);
});

test('SYN-02: pullUpstream parameterized - gsd vs superpowers differ only in URL', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const gsd = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir: path.join(root, 'sync', 'gsd') });
  const superpowers = await pullUpstream({ name: 'superpowers', url: fixture.bareUrl, ref: 'v1.0.0', destDir: path.join(root, 'sync', 'superpowers') });

  assert.equal(gsd.upstream, 'gsd');
  assert.equal(superpowers.upstream, 'superpowers');
  assert.equal(gsd.sha, superpowers.sha);
});

test('SYN-05: writes last-synced-commit.json with both ref and 40-char SHA', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  const record = JSON.parse(await fsp.readFile(path.join(destDir, 'last-synced-commit.json'), 'utf8'));
  assert.deepEqual(Object.keys(record), ['upstream', 'ref_kind', 'ref', 'sha', 'timestamp']);
  assert.equal(record.ref, 'v1.0.0');
  assert.match(record.sha, /^[0-9a-f]{40}$/);
});

test('SYN-05: last-synced-commit.json validates against schema/last-synced-commit.json', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  const record = JSON.parse(await fsp.readFile(path.join(destDir, 'last-synced-commit.json'), 'utf8'));
  const result = validate(record, lastSyncedSchema);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('Pitfall 12: --main ref emits stderr warning before clone', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  t.after(() => {
    process.stderr.write = originalWrite;
  });

  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'main', destDir });

  assert.match(writes.join(''), /branch pin .* drifts/);
});

test('Pitfall 10: re-pull of identical SHA short-circuits via git ls-remote', async (t) => {
  const { root, fixture } = await makeFixture(t);
  const destDir = path.join(root, 'sync', 'gsd');
  await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });
  const sentinel = path.join(destDir, 'current', 'SENTINEL');
  await fsp.writeFile(sentinel, 'survives\n');

  const second = await pullUpstream({ name: 'gsd', url: fixture.bareUrl, ref: 'v1.0.0', destDir });

  assert.equal(second.shortCircuited, true);
  assert.equal(await fsp.readFile(sentinel, 'utf8'), 'survives\n');
});

test('classifyRef and validateRef protect git ref routing', () => {
  assert.equal(classifyRef('a'.repeat(40)), 'sha');
  assert.equal(classifyRef('main'), 'branch');
  assert.equal(classifyRef('v1.0.0'), 'tag-or-branch');
  assert.throws(() => validateRef('--upload-pack=evil'), /Invalid ref/);
});
