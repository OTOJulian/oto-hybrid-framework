'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');

function seedLogs(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.mkdirSync(path.join(tmp, '.oto/logs'), { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/log/existing-logs'), path.join(tmp, '.oto/logs'), { recursive: true });
  return tmp;
}

test('D-17 listLogs returns array sorted newest-first', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.listLogs({ cwd: tmp });
  assert.equal(result.length, 3, 'D-17 list returns all fixture logs');
  assert.equal(result[0].frontmatter.date, '2026-05-02 09:00', 'D-17 newest entry appears first');
});

test('D-17 listLogs honors limit parameter', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.listLogs({ cwd: tmp, limit: 2 });
  assert.equal(result.length, 2, 'D-17 limit parameter trims results');
  assert.deepEqual(
    result.map((entry) => entry.frontmatter.title),
    ['Debug rendering', 'Add feature'],
    'D-17 limited results remain newest-first'
  );
});

