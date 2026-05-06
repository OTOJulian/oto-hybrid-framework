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

test('D-12 startSession writes .oto/logs/.active-session.json with start_ref, start_time, and title', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  await log.startSession({ title: 'investigate', cwd: tmp, date: new Date('2026-05-06T14:30:00Z') });
  const activePath = path.join(tmp, '.oto/logs/.active-session.json');
  const active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
  assert.equal(typeof active.start_ref, 'string', 'D-12 active session records start_ref');
  assert.match(active.start_time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'D-12 active session records minute timestamp');
  assert.equal(active.title, 'investigate', 'D-12 active session records title');
});

test('D-01 D-12 endSession reads active-session.json, writes session log, and deletes active state', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const tmp = seedGitFixture(t);
  await log.startSession({ title: 'bounded session', cwd: tmp, date: new Date('2026-05-06T14:30:00Z') });
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nSession diff\n');
  const result = await log.endSession({ closingNotes: 'closed', body: '## Summary\n\nClosed.\n', cwd: tmp, date: new Date('2026-05-06T14:45:00Z') });
  const parsed = frontmatter.extractFrontmatter(fs.readFileSync(result.path, 'utf8')).frontmatter;
  assert.equal(parsed.mode, 'session', 'D-01 session mode frontmatter is written');
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs/.active-session.json')), false, 'D-12 active session is deleted on end');
});

test('D-12 startSession while one is open auto-ends prior session with a warning', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedGitFixture(t);
  await log.startSession({ title: 'first session', cwd: tmp, date: new Date('2026-05-06T14:30:00Z') });
  const result = await log.startSession({ title: 'second session', cwd: tmp, date: new Date('2026-05-06T14:45:00Z') });
  const logs = fs.readdirSync(path.join(tmp, '.oto/logs')).filter((file) => file.endsWith('.md'));
  const active = JSON.parse(fs.readFileSync(path.join(tmp, '.oto/logs/.active-session.json'), 'utf8'));
  assert.equal(logs.length, 1, 'D-12 starting a second session auto-ends the prior one');
  assert.equal(active.title, 'second session', 'D-12 active session now points at second session');
  assert.match((result.warnings || []).join('\n'), /auto-ended|prior session/i, 'D-12 warning mentions prior auto-ended session');
});

test('D-12 .gitignore contains .oto/logs/.active-session.json pattern', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.startSession, 'function', 'D-12 session API exists before checking gitignore');
  const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
  assert.match(gitignore, /\.oto\/logs\/\.active-session\.json|logs\/\.active-session\.json|\.active-session\.json/);
});

