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

test('D-20 promoteLog --to quick seeds .oto/quick/{YYYYMMDD}-{slug}/PLAN.md', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.promoteLog({ slug: 'fix-the-thing', target: 'quick', cwd: tmp });
  const planPath = path.join(tmp, '.oto/quick/20260501-fix-the-thing/PLAN.md');
  assert.equal(fs.existsSync(planPath), true, 'D-20 quick promotion creates PLAN.md');
  const body = fs.readFileSync(planPath, 'utf8');
  assert.match(body, /type: quick/, 'D-20 quick PLAN has quick frontmatter');
  assert.match(body, /slug: fix-the-thing/, 'D-20 quick PLAN carries source slug');
  assert.ok(body.includes('Fix the thing'), 'D-20 quick PLAN includes source title');
  assert.ok(result.created.includes(planPath), 'D-20 quick promotion reports created file');
});

test('D-20 promoteLog --to quick flips source promoted to true', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  await log.promoteLog({ slug: 'fix-the-thing', target: 'quick', cwd: tmp });
  const source = fs.readFileSync(path.join(tmp, '.oto/logs/20260501-0930-fix-the-thing.md'), 'utf8');
  assert.match(source, /promoted: true/, 'D-20 source log is marked promoted');
});

test('D-20 promoteLog --to quick rejects re-promotion and preserves edited PLAN.md', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  await log.promoteLog({ slug: 'fix-the-thing', target: 'quick', cwd: tmp });
  const planPath = path.join(tmp, '.oto/quick/20260501-fix-the-thing/PLAN.md');
  const editedPlan = [
    '---',
    'type: quick',
    'slug: fix-the-thing',
    '---',
    '',
    '## Goal',
    '',
    'Human-edited plan body.',
    '',
  ].join('\n');
  fs.writeFileSync(planPath, editedPlan);

  await assert.rejects(
    () => log.promoteLog({ slug: 'fix-the-thing', target: 'quick', cwd: tmp }),
    /log already promoted/,
    'D-20 repeated quick promotion is rejected'
  );
  assert.equal(fs.readFileSync(planPath, 'utf8'), editedPlan, 'D-20 edited quick PLAN.md is preserved');
});

test('D-20 promoteLog --to quick rejects an existing deterministic PLAN.md', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const quickDir = path.join(tmp, '.oto/quick/20260501-fix-the-thing');
  const planPath = path.join(quickDir, 'PLAN.md');
  fs.mkdirSync(quickDir, { recursive: true });
  fs.writeFileSync(planPath, 'existing plan\n');

  await assert.rejects(
    () => log.promoteLog({ slug: 'fix-the-thing', target: 'quick', cwd: tmp }),
    /quick plan already exists/,
    'D-20 pre-existing quick PLAN.md is rejected'
  );
  assert.equal(fs.readFileSync(planPath, 'utf8'), 'existing plan\n', 'D-20 existing quick PLAN.md is not overwritten');
});

test('D-20 promoteLog --to todo creates one todo per Open Question', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  await log.promoteLog({ slug: 'add-feature', target: 'todo', cwd: tmp });
  const pending = path.join(tmp, '.oto/todos/pending');
  const files = fs.readdirSync(pending).sort();
  assert.deepEqual(files, ['001-should-we-cache-the-result.md', '002-todo-add-error-handling.md']);
});

test('D-20 promoteLog --to todo numbers IDs by scanning pending and completed dirs', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  fs.mkdirSync(path.join(tmp, '.oto/todos/pending'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.oto/todos/completed'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.oto/todos/pending/003-existing.md'), 'existing\n');
  fs.writeFileSync(path.join(tmp, '.oto/todos/completed/005-done.md'), 'done\n');
  await log.promoteLog({ slug: 'add-feature', target: 'todo', cwd: tmp });
  const files = fs.readdirSync(path.join(tmp, '.oto/todos/pending')).sort();
  assert.ok(files.includes('006-should-we-cache-the-result.md'), 'D-20 todo IDs scan pending and completed');
  assert.ok(files.includes('007-todo-add-error-handling.md'), 'D-20 todo IDs keep incrementing');
});

test('D-20 promoteLog --to plan throws unsupported-target error', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  await assert.rejects(
    () => log.promoteLog({ slug: 'fix-the-thing', target: 'plan', cwd: tmp }),
    /not supported/,
    'D-20 direct plan promotion is rejected'
  );
});

test('D-20 promoteLog skips entries with no open questions when target=todo', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = seedLogs(t);
  const result = await log.promoteLog({ slug: 'fix-the-thing', target: 'todo', cwd: tmp });
  assert.deepEqual(result.created, [], 'D-20 no open questions creates no todos');
  assert.equal(fs.existsSync(path.join(tmp, '.oto/todos/pending')), false, 'D-20 empty todo promotion writes no files');
});
