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

test('D-17 showLog resolves slug via suffix match against .oto/logs/*-{slug}.md', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.showLog({ slug: 'fix-the-thing', cwd: tmp });
  assert.equal(result.frontmatter.title, 'Fix the thing', 'D-17 show resolves by slug suffix');
  assert.ok(result.body.includes('## Summary'), 'D-17 show returns rendered body');
});

test('D-17 showLog returns parsed sections object', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.showLog({ slug: 'add-feature', cwd: tmp });
  for (const key of ['summary', 'what_changed', 'what_was_discussed', 'outcome', 'files_touched', 'open_questions']) {
    assert.notEqual(result.sections[key], undefined, `D-17 section ${key} is parsed`);
  }
});

test('D-17 showLog with multi-match slug returns most recent entry', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  fs.copyFileSync(
    path.join(tmp, '.oto/logs/20260501-0930-fix-the-thing.md'),
    path.join(tmp, '.oto/logs/20260503-0900-fix-the-thing.md')
  );
  const result = await log.showLog({ slug: 'fix-the-thing', cwd: tmp });
  assert.equal(path.basename(result.path).startsWith('20260503'), true, 'D-17 newest matching slug wins');
});

