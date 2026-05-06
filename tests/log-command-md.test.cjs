'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');
const COMMAND_RELATIVE_PATH = 'oto/commands/oto/log.md';
const COMMAND_PATH = path.join(REPO_ROOT, COMMAND_RELATIVE_PATH);

test('D-22 oto/commands/oto/log.md exists', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 log library exists before command markdown check');
  assert.equal(fs.existsSync(COMMAND_PATH), true, `${COMMAND_RELATIVE_PATH} should exist`);
});

test('D-22 oto/commands/oto/log.md frontmatter has name oto:log and required keys', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 log library exists before command frontmatter check');
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const content = fs.readFileSync(COMMAND_PATH, 'utf8');
  const parsed = frontmatter.extractFrontmatter(content).frontmatter;
  assert.equal(parsed.name, 'oto:log');
  assert.equal(typeof parsed.description, 'string');
  assert.ok(parsed.description.length > 0);
  assert.equal(typeof parsed['argument-hint'], 'string');
  for (const tool of ['Read', 'Write', 'Edit', 'Bash']) {
    assert.ok(parsed['allowed-tools'].includes(tool), `D-22 allowed-tools contains ${tool}`);
  }
});

test('D-05 oto/commands/oto/log.md body contains DATA_START and DATA_END markers', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.captureEvidence, 'function', 'D-05 evidence capture exists before command marker check');
  const content = fs.readFileSync(COMMAND_PATH, 'utf8');
  assert.ok(content.includes('<DATA_START>'), 'D-05 command body includes DATA_START marker');
  assert.ok(content.includes('<DATA_END>'), 'D-05 command body includes DATA_END marker');
});

test('D-04 oto/commands/oto/log.md body lists the six body sections', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.writeLogEntry, 'function', 'D-04 write API exists before command body section check');
  const content = fs.readFileSync(COMMAND_PATH, 'utf8').toLowerCase();
  for (const section of ['summary', 'what changed', 'what was discussed', 'outcome', 'files touched', 'open questions']) {
    assert.ok(content.includes(section), `D-04 command body references ${section}`);
  }
});

test('D-03 oto/commands/oto/log.md drafts from observable evidence and documents --body override', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.captureEvidence, 'function', 'D-03 evidence capture feeds drafting');
  const content = fs.readFileSync(COMMAND_PATH, 'utf8').toLowerCase();
  assert.match(content, /conversation|transcript/, 'D-03 command references conversation evidence');
  assert.match(content, /git diff|diff/, 'D-03 command references git diff evidence');
  assert.ok(content.includes('--body'), 'D-03 command documents verbatim body override');
});

test('D-17 oto/commands/oto/log.md argument-hint mentions all subcommands', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.routeSubcommand, 'function', 'D-17 routeSubcommand exists before command hint check');
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const parsed = frontmatter.extractFrontmatter(fs.readFileSync(COMMAND_PATH, 'utf8')).frontmatter;
  for (const sub of ['start', 'end', 'list', 'show', 'promote']) {
    assert.ok(parsed['argument-hint'].includes(sub), `D-17 argument-hint includes ${sub}`);
  }
});

test('D-19 oto/commands/oto/log.md does not mention an edit subcommand', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.routeSubcommand, 'function', 'D-19 routeSubcommand exists before no-edit docs check');
  const content = fs.readFileSync(COMMAND_PATH, 'utf8').toLowerCase();
  assert.equal(content.includes('edit <slug>'), false, 'D-19 edit subcommand is not documented');
  assert.equal(content.includes('log edit'), false, 'D-19 log edit is not documented');
});

test('D-20 oto/commands/oto/log.md does not mention --to plan as supported', () => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.promoteLog, 'function', 'D-20 promote API exists before no-plan docs check');
  const content = fs.readFileSync(COMMAND_PATH, 'utf8');
  assert.equal(content.includes('--to plan'), false, 'D-20 direct plan promotion is not supported in docs');
});

