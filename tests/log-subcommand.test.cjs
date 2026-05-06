'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');

test('D-06 routeSubcommand empty args returns help', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.deepEqual(log.routeSubcommand([]), { sub: 'help', rest: [] }, 'D-06 empty input routes to help');
});

test('D-06 routeSubcommand treats reserved words inside a title as oneshot input', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.deepEqual(log.routeSubcommand(['list of changes']), {
    sub: 'oneshot',
    rest: ['list of changes'],
  });
});

test('D-08 main rejects empty oneshot title with one-line hint', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const exitCode = await log.main([''], tmp);
  assert.notEqual(exitCode, 0, 'D-08 empty title exits non-zero');
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs')), false, 'D-08 empty title writes no log');
});

