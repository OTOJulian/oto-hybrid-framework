'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');

const SIX_SECTION_BODY = [
  '## Summary',
  '',
  'Logged a focused entry.',
  '',
  '## What changed',
  '',
  'The fixture changed one file.',
  '',
  '## What was discussed',
  '',
  'The session discussed the fixture behavior.',
  '',
  '## Outcome',
  '',
  'The work is captured.',
  '',
  '## Files touched',
  '',
  '- src/foo.js',
  '',
  '## Open questions',
  '',
  '- None.',
  '',
].join('\n');

test('D-10 writeLogEntry path matches .oto/logs/{YYYYMMDD-HHmm}-{slug}.md', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const result = await log.writeLogEntry({
    title: 'Investigating cache miss',
    body: SIX_SECTION_BODY,
    mode: 'oneshot',
    phase: null,
    diff_from: 'abc1234',
    diff_to: 'HEAD',
    files_touched: ['src/foo.js'],
    open_questions: [],
    cwd: tmp,
    date: new Date('2026-05-06T14:30:00Z'),
  });
  assert.match(result.path, /\.oto\/logs\/\d{8}-\d{4}-[a-z0-9-]+\.md$/, 'D-10 flat log path shape');
});

test('D-04 writeLogEntry body contains all six section headers', async (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const result = await log.writeLogEntry({
    title: 'Six section body',
    body: SIX_SECTION_BODY,
    mode: 'oneshot',
    phase: null,
    diff_from: null,
    diff_to: 'HEAD',
    files_touched: [],
    open_questions: [],
    cwd: tmp,
    date: new Date('2026-05-06T14:30:00Z'),
  });
  const written = fs.readFileSync(result.path, 'utf8');
  for (const heading of ['## Summary', '## What changed', '## What was discussed', '## Outcome', '## Files touched', '## Open questions']) {
    assert.ok(written.includes(heading), `D-04 body contains ${heading}`);
  }
});

test('D-21 writeLogEntry with --phase 02 writes phase to frontmatter while path stays in .oto/logs', async (t) => {
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
    title: 'Phase tagged log',
    body: SIX_SECTION_BODY,
    mode: 'oneshot',
    phase: '02',
    diff_from: 'abc1234',
    diff_to: 'HEAD',
    files_touched: [],
    open_questions: [],
    cwd: tmp,
    date: new Date('2026-05-06T14:30:00Z'),
  });
  assert.ok(result.path.includes('.oto/logs/'), 'D-21 phase association does not move logs out of .oto/logs');
  assert.equal(result.path.includes('.oto/phases/'), false, 'D-21 logs are never written under phase dirs');
  const parsed = frontmatter.extractFrontmatter(fs.readFileSync(result.path, 'utf8')).frontmatter;
  assert.equal(parsed.phase, '02', 'D-21 phase is informational frontmatter');
});

