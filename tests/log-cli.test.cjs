'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(REPO_ROOT, 'oto/bin/lib/log.cjs');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const INSTALL_JS = path.join(REPO_ROOT, 'bin/install.js');

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

function seedExistingLogs(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  fs.mkdirSync(path.join(tmp, '.oto/logs'), { recursive: true });
  fs.cpSync(path.join(REPO_ROOT, 'tests/fixtures/log/existing-logs'), path.join(tmp, '.oto/logs'), { recursive: true });
  return tmp;
}

test('D-08 D-22 oto-tools log empty title exits non-zero with hint', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 log library exposes main');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', ''], { cwd: tmp, encoding: 'utf8' });
  assert.notEqual(result.status, 0, 'D-08 empty title exits non-zero');
  assert.ok(result.stderr.includes('/oto-log requires a title'), 'D-08 empty title hint is written to stderr');
});

test('D-06 D-22 oto log help exits zero and lists subcommands', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 log help is handled by log.main');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-log-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  for (const command of [
    [OTO_TOOLS, 'log', '--help'],
    [INSTALL_JS, 'log', '--help'],
  ]) {
    const result = spawnSync(process.execPath, command, { cwd: tmp, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    for (const word of ['start', 'end', 'list', 'show', 'promote']) {
      assert.ok(result.stdout.includes(word), `D-06 help lists ${word}`);
    }
  }
});

test('D-17 D-22 oto-tools log title writes a oneshot log', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 log main exists for oto-tools dispatch');
  const tmp = seedGitFixture(t);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'investigating cache'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const files = fs.readdirSync(path.join(tmp, '.oto/logs'));
  assert.ok(files.some((file) => /\d{8}-\d{4}-investigating-cache\.md/.test(file)), 'D-17 oneshot log is written');
});

test('D-17 oto-tools log start then end writes session log', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.startSession, 'function', 'D-17 start API exists');
  const tmp = seedGitFixture(t);
  const start = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'start', 'investigation'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(start.status, 0, `${start.stderr}\n${start.stdout}`);
  const end = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'end', 'closed'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(end.status, 0, `${end.stderr}\n${end.stdout}`);
  const active = path.join(tmp, '.oto/logs/.active-session.json');
  assert.equal(fs.existsSync(active), false, 'D-17 end removes active session');
});

test('D-17 oto-tools log list returns paged output', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.listLogs, 'function', 'D-17 list API exists');
  const tmp = seedExistingLogs(t);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'list'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.match(result.stdout, /\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\]/, 'D-17 list prints dated rows');
});

test('D-17 oto-tools log show slug prints rendered entry', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.showLog, 'function', 'D-17 show API exists');
  const tmp = seedExistingLogs(t);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'show', 'fix-the-thing'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.ok(result.stdout.includes('## Summary'), 'D-17 show renders markdown body');
});

test('D-17 D-20 oto-tools log promote slug --to quick seeds quick PLAN.md', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.promoteLog, 'function', 'D-20 promote API exists');
  const tmp = seedExistingLogs(t);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'promote', 'fix-the-thing', '--to', 'quick'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(fs.existsSync(path.join(tmp, '.oto/quick/20260501-fix-the-thing/PLAN.md')), true);
});

test('D-03 D-18 oto-tools log --body substitutes verbatim body bytes', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-18 CLI flag parser exists');
  const tmp = seedGitFixture(t);
  const body = '## Summary\n\nVerbatim body.\n';
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'body override', '--body', body], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const file = fs.readdirSync(path.join(tmp, '.oto/logs')).find((name) => name.endsWith('.md'));
  assert.ok(fs.readFileSync(path.join(tmp, '.oto/logs', file), 'utf8').includes(body), 'D-03 --body skips drafting and preserves body bytes');
});

test('D-03 D-18 oto-tools log end --body writes drafted session body verbatim', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.endSession, 'function', 'D-18 session body override reaches endSession');
  const frontmatter = require(path.join(REPO_ROOT, 'oto/bin/lib/frontmatter.cjs'));
  const tmp = seedGitFixture(t);
  const body = [
    '## Summary',
    '',
    'Drafted closeout.',
    '',
    '## What changed',
    '',
    'Exact body.',
    '',
  ].join('\n');
  const start = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'start', 'drafted session'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(start.status, 0, `${start.stderr}\n${start.stdout}`);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'end', '--body', body], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const file = fs.readdirSync(path.join(tmp, '.oto/logs')).find((name) => name.endsWith('.md'));
  const parsed = frontmatter.extractFrontmatter(fs.readFileSync(path.join(tmp, '.oto/logs', file), 'utf8'));
  assert.equal(parsed.body.trim(), body.trim(), 'D-18 end --body preserves drafted markdown body');
});

test('D-18 oto-tools log --phase 02 writes phase to frontmatter', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-18 phase flag is parsed by main');
  const tmp = seedGitFixture(t);
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'phase entry', '--phase', '02'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const file = fs.readdirSync(path.join(tmp, '.oto/logs')).find((name) => name.endsWith('.md'));
  assert.match(fs.readFileSync(path.join(tmp, '.oto/logs', file), 'utf8'), /phase: "02"/, 'D-18 phase flag reaches frontmatter');
});

test('D-18 oto-tools log --since ref overrides diff start ref', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-18 since flag is parsed by main');
  const tmp = seedGitFixture(t);
  const ref = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).stdout.trim();
  fs.appendFileSync(path.join(tmp, 'seed.md'), '\nSince line\n');
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'since entry', '--since', ref], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const file = fs.readdirSync(path.join(tmp, '.oto/logs')).find((name) => name.endsWith('.md'));
  assert.match(
    fs.readFileSync(path.join(tmp, '.oto/logs', file), 'utf8'),
    new RegExp(`diff_from: "${ref}"`),
    'D-18 since flag reaches frontmatter'
  );
});

test('D-22 public oto log dispatches identically to oto-tools log', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.main, 'function', 'D-22 public CLI dispatch uses log.main');
  const tmp = seedGitFixture(t);
  const result = spawnSync(process.execPath, [INSTALL_JS, 'log', 'test entry'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(fs.existsSync(path.join(tmp, '.oto/logs')), true, 'D-22 public CLI writes a log');
});

test('D-19 oto-tools log edit subcommand does not amend entries in place', (t) => {
  let log;
  try {
    log = require(LOG_PATH);
  } catch (error) {
    assert.fail(`Cannot load log.cjs from ${LOG_PATH}: ${error.message}`);
  }
  assert.equal(typeof log.routeSubcommand, 'function', 'D-19 routeSubcommand exists before edit rejection');
  const tmp = seedExistingLogs(t);
  const before = fs.readdirSync(path.join(tmp, '.oto/logs')).sort();
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'log', 'edit', 'anything'], { cwd: tmp, encoding: 'utf8' });
  const after = fs.readdirSync(path.join(tmp, '.oto/logs')).sort();
  assert.deepEqual(after.filter((file) => before.includes(file)), before, 'D-19 existing logs are not amended by edit');
  assert.ok(result.status !== 0 || after.some((file) => /edit-anything/.test(file)), 'D-19 edit is rejected or treated as a new oneshot title');
});
