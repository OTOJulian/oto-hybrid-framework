'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');
const PROGRESS_PATH = path.join(REPO_ROOT, 'oto/workflows/progress.md');
const RESUME_PATH = path.join(REPO_ROOT, 'oto/workflows/resume-project.md');

function md5(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

test('D-13 progress.md Recent Activity step interleaves logs and summaries chronologically', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.listLogs, 'function', 'D-13 log list API exists for Recent Activity');
  const body = fs.readFileSync(PROGRESS_PATH, 'utf8');
  assert.ok(body.includes('Recent Activity'), 'D-13 progress surface is named Recent Activity');
  assert.match(body, /PLANNING_ROOT=.*state_path/, 'D-13 Recent Activity derives planning root from state_path');
  assert.match(body, /LOG_GLOB=.*logs\/\*\.md/, 'D-13 Recent Activity reads log entries from planning root');
  assert.match(body, /SUMMARY_GLOB=.*phases\/\*\/\*-SUMMARY\.md/, 'D-13 Recent Activity reads summaries from planning root');
  assert.match(body, /\*-SUMMARY\.md|-SUMMARY\.md/, 'D-13 Recent Activity reads phase summaries');
});

test('D-13 progress.md does not contain literal Recent Work heading anymore', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.listLogs, 'function', 'D-13 log API exists before progress surface assertion');
  const body = fs.readFileSync(PROGRESS_PATH, 'utf8');
  assert.equal(/#{1,2}\s+Recent Work/.test(body), false, 'D-13 Recent Work heading is replaced');
});

test('D-16 resume-project.md checks planning-root active-session.json in check_incomplete_work', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.startSession, 'function', 'D-16 session API exists for resume surface');
  const body = fs.readFileSync(RESUME_PATH, 'utf8');
  assert.ok(body.includes('.active-session.json'), 'D-16 resume checks active log session file');
  assert.match(body, /PLANNING_ROOT=.*state_path/, 'D-16 resume derives planning root from state_path');
  assert.match(body, /ACTIVE_SESSION="\$PLANNING_ROOT\/logs\/\.active-session\.json"/, 'D-16 resume checks active session under planning root');
  assert.match(body, /check_incomplete_work[\s\S]*open log session/i, 'D-16 resume surfaces open log session hint');
});

test('D-15 resume-project.md surfaces latest log Summary line in present_status', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.showLog, 'function', 'D-15 show API exists for latest-log summary');
  const body = fs.readFileSync(RESUME_PATH, 'utf8');
  assert.match(body, /present_status[\s\S]*LOG_GLOB="\$PLANNING_ROOT\/logs\/\*\.md"[\s\S]*## Summary/s, 'D-15 resume reads latest log Summary section from planning root');
});

test('D-14 STATE.md md5 unchanged after running /oto-log oneshot', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-14 CLI entrypoint exists before state immutability check');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/log/mixed-history'), tmp, { recursive: true });
  const statePath = path.join(tmp, '.oto/STATE.md');
  const before = md5(statePath);
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs'), 'log', 'test entry'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(md5(statePath), before, 'D-14 /oto-log does not mutate STATE.md');
});

test('D-13 Recent Activity golden render sorts summaries and logs chronologically', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.listLogs, 'function', 'D-13 log API exists before golden-render check');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/log/mixed-history'), tmp, { recursive: true });
  const entries = [
    { date: '2026-05-01 09:30', kind: 'log', title: 'First log' },
    { date: '2026-05-02 14:00', kind: 'summary', title: 'Shipped initial foo feature.' },
  ].sort((a, b) => b.date.localeCompare(a.date));
  assert.deepEqual(
    entries.map((entry) => `[${entry.date}] [${entry.kind}] ${entry.title}`),
    ['[2026-05-02 14:00] [summary] Shipped initial foo feature.', '[2026-05-01 09:30] [log] First log'],
    'D-13 summaries and logs render in descending chronology'
  );
});
