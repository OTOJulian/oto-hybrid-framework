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

test('D-01 D-02 captureEvidence returns diff bounded by start ref in session mode', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  const firstSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nSession line\n');
  spawnSync('git', ['add', 'seed.md'], { cwd: tmp, encoding: 'utf8' });
  spawnSync('git', ['-c', 'user.email=t@t.t', '-c', 'user.name=T', 'commit', '-m', 'change'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  const result = await log.captureEvidence({ since: firstSha, mode: 'session', cwd: tmp });
  assert.equal(result.diff_from, firstSha, 'D-01 session evidence is bounded by start ref');
  assert.ok(result.diff_to === 'HEAD' || /^[0-9a-f]{7,40}$/.test(result.diff_to), 'D-01 diff_to targets HEAD or a commit');
  assert.ok(result.files_touched.includes('seed.md'), 'D-02 files_touched includes changed file basename');
});

test('D-01 captureEvidence in oneshot mode defaults since to last commit when no prior log exists', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nUncommitted line\n');
  const result = await log.captureEvidence({ mode: 'oneshot', cwd: tmp });
  assert.equal(result.diff_from, head, 'D-01 oneshot capture defaults to HEAD when no prior log exists');
});

test('D-02 captureEvidence degrades gracefully when git is unavailable', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const result = await log.captureEvidence({ mode: 'oneshot', cwd: tmp });
  assert.equal(result.diff_from, null, 'D-02 missing git repo records null diff_from');
  assert.equal(Array.isArray(result.warnings) && result.warnings.length > 0, true, 'D-02 missing git repo returns warnings');
});

test('D-02 captureEvidence files_touched is extracted as relative clean paths', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nAnother line\n');
  const result = await log.captureEvidence({ mode: 'oneshot', cwd: tmp });
  assert.ok(result.files_touched.length > 0, 'D-02 files_touched is non-empty');
  for (const file of result.files_touched) {
    assert.equal(path.isAbsolute(file), false, 'D-02 files_touched uses relative paths');
    assert.equal(file.trim(), file, 'D-02 files_touched trims whitespace');
    assert.equal(file.includes('"'), false, 'D-02 files_touched is not quoted');
  }
});

