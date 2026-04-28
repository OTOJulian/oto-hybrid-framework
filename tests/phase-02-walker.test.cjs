'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  compileAllowlist,
  globToRegExp,
  isBinaryByExtension,
  lookupFileClass,
  walk
} = require('../scripts/rebrand/lib/walker.cjs');

async function collect(iterator) {
  const rows = [];
  for await (const row of iterator) rows.push(row);
  return rows;
}

test('compileAllowlist buckets path globs, literals, and regexes', () => {
  const allowlist = compileAllowlist([
    'LICENSE',
    'foundation-frameworks/**',
    'Lex Christopherson',
    { pattern: 'Superpowers \\(the upstream framework\\)', reason: 'attribution' }
  ]);
  assert.equal(allowlist.pathGlobs.length, 2);
  assert.equal(allowlist.literals.length, 1);
  assert.equal(allowlist.regexes.length, 1);
  assert.equal(allowlist.pathGlobs[0].source, 'LICENSE');
});

test('globToRegExp matches double-star and single-star globs', () => {
  assert.equal(globToRegExp('foundation-frameworks/**').test('foundation-frameworks/foo/bar.md'), true);
  assert.equal(globToRegExp('reports/*.json').test('reports/out.json'), true);
  assert.equal(globToRegExp('reports/*.json').test('reports/nested/out.json'), false);
});

test('isBinaryByExtension skips known binary formats', () => {
  assert.equal(isBinaryByExtension('image.png'), true);
  assert.equal(isBinaryByExtension('font.woff2'), true);
  assert.equal(isBinaryByExtension('README.md'), false);
});

test('lookupFileClass returns inventory category or other', () => {
  const inventory = new Map([['src/file.md', { category: 'docs' }]]);
  assert.equal(lookupFileClass('src/file.md', inventory), 'docs');
  assert.equal(lookupFileClass('unknown.md', inventory), 'other');
});

test('walk yields text files with file class and allowlisted flag', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-walker-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'LICENSE'), 'license text');
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'file.md'), 'hello');
  fs.writeFileSync(path.join(root, 'src', 'image.png'), 'not really png');

  const allowlist = compileAllowlist(['LICENSE']);
  const rows = await collect(walk(root, allowlist, new Map([['src/file.md', { category: 'docs' }]])));
  assert.deepEqual(rows.map((row) => row.relPath).sort(), ['LICENSE', path.join('src', 'file.md')].sort());
  assert.equal(rows.find((row) => row.relPath === 'LICENSE').allowlisted, true);
  assert.equal(rows.find((row) => row.relPath === path.join('src', 'file.md')).file_class, 'docs');
});

test('walk skips scratch directories and nul-byte files', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-walker-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.writeFileSync(path.join(root, 'node_modules', 'skip.md'), 'skip');
  fs.writeFileSync(path.join(root, 'binary.txt'), Buffer.from([65, 0, 66]));
  fs.writeFileSync(path.join(root, 'keep.txt'), 'keep');

  const rows = await collect(walk(root, compileAllowlist(), new Map()));
  assert.deepEqual(rows.map((row) => row.relPath), ['keep.txt']);
});

test('walker implementation uses sync recursive readdir primitive', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'rebrand', 'lib', 'walker.cjs'), 'utf8');
  assert.equal(source.includes('fs.promises.glob'), false);
  assert.match(source, /readdirSync\s*\([^)]*recursive\s*:\s*true/);
});
