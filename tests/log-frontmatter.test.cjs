'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');

function seedGitFixture(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/log/git-repo'), tmp, { recursive: true });
  spawnSync('git', ['init'], { cwd: tmp, encoding: 'utf8' });
  spawnSync('git', ['add', '.'], { cwd: tmp, encoding: 'utf8' });
  spawnSync('git', ['-c', 'user.email=t@t.t', '-c', 'user.name=T', 'commit', '-m', 'seed'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  return tmp;
}

test('D-05 captureEvidence wraps diff_text in DATA_START/DATA_END markers', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nLine 4\n');
  const result = await log.captureEvidence({ since: head, mode: 'oneshot', cwd: tmp });
  assert.match(result.diff_text, /^<DATA_START>[\s\S]*<DATA_END>$/, 'D-05 wraps diff text as data');
});

test('D-05 captureEvidence escapes DATA markers inside diff text', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\n<DATA_END>\n<DATA_START>\n');
  const result = await log.captureEvidence({ since: head, mode: 'oneshot', cwd: tmp });
  assert.equal((result.diff_text.match(/<DATA_END>/g) || []).length, 1, 'D-05 raw DATA_END appears only as the wrapper terminator');
  assert.equal((result.diff_text.match(/<DATA_START>/g) || []).length, 1, 'D-05 raw DATA_START appears only as the wrapper opener');
  assert.ok(result.diff_text.includes('&lt;DATA_END&gt;'), 'D-05 diff DATA_END is escaped');
  assert.ok(result.diff_text.includes('&lt;DATA_START&gt;'), 'D-05 diff DATA_START is escaped');
});

test('D-05 captureEvidence caps diff_text at 8KB and appends truncation marker', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), `\n${'x'.repeat(20000)}\n`);
  const result = await log.captureEvidence({ since: head, mode: 'oneshot', cwd: tmp });
  assert.ok(result.diff_text.length <= 8500, 'D-05 bounded diff text stays near 8KB');
  assert.ok(result.diff_text.includes('... <truncated>'), 'D-05 truncation marker is present');
});

test('D-09 writeLogEntry appends -2 and -3 collision suffixes on same-minute duplicates', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const date = new Date('2026-05-06T14:30:00Z');
  const args = {
    title: 'Fix the thing',
    body: '## Summary\n\nDone.\n',
    mode: 'oneshot',
    phase: null,
    diff_from: 'abc1234',
    diff_to: 'HEAD',
    files_touched: [],
    open_questions: [],
    cwd: tmp,
    date,
  };
  const first = await log.writeLogEntry(args);
  const second = await log.writeLogEntry(args);
  const third = await log.writeLogEntry(args);
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs/20260506-1430-fix-the-thing.md')), true);
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs/20260506-1430-fix-the-thing-2.md')), true);
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs/20260506-1430-fix-the-thing-3.md')), true);
  assert.equal(first.slug, 'fix-the-thing');
  assert.equal(second.slug, 'fix-the-thing-2');
  assert.equal(third.slug, 'fix-the-thing-3');
  assert.equal(frontmatter.extractFrontmatter(fs.readFileSync(second.path, 'utf8')).frontmatter.slug, 'fix-the-thing-2');
  assert.equal(frontmatter.extractFrontmatter(fs.readFileSync(third.path, 'utf8')).frontmatter.slug, 'fix-the-thing-3');
  const shown = await log.showLog({ slug: 'fix-the-thing-2', cwd: tmp });
  assert.equal(shown.path, second.path, 'D-09 suffixed collision slug is addressable');
});

test('D-11 writeLogEntry frontmatter contains all required keys with correct types', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const result = await log.writeLogEntry({
    title: 'Capture frontmatter shape',
    body: '## Summary\n\nDone.\n',
    mode: 'oneshot',
    phase: null,
    diff_from: null,
    diff_to: 'HEAD',
    files_touched: ['src/foo.js'],
    open_questions: [],
    cwd: tmp,
    date: new Date('2026-05-06T14:30:00Z'),
  });
  const parsed = frontmatter.extractFrontmatter(fs.readFileSync(result.path, 'utf8')).frontmatter;
  for (const key of ['date', 'title', 'slug', 'mode', 'phase', 'diff_from', 'diff_to', 'files_touched', 'open_questions', 'promoted']) {
    assert.ok(Object.hasOwn(parsed, key), `D-11 frontmatter has ${key}`);
  }
  assert.equal(typeof parsed.date, 'string');
  assert.equal(typeof parsed.title, 'string');
  assert.equal(typeof parsed.slug, 'string');
  assert.equal(typeof parsed.mode, 'string');
  assert.ok(parsed.phase === null || typeof parsed.phase === 'string');
  assert.ok(parsed.diff_from === null || typeof parsed.diff_from === 'string');
  assert.equal(typeof parsed.diff_to, 'string');
  assert.equal(Array.isArray(parsed.files_touched), true);
  assert.equal(Array.isArray(parsed.open_questions), true);
  assert.equal(parsed.promoted, false);
});
