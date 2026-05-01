'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

const KEEP_HOOKS = [
  'oto-session-start',
  'oto-statusline.js',
  'oto-context-monitor.js',
  'oto-prompt-guard.js',
  'oto-read-injection-scanner.js',
  'oto-validate-commit.sh',
];

test('phase-05 build-hooks: emits 6 files into oto/hooks/dist with exec bits intact', () => {
  const distDir = path.join(REPO_ROOT, 'oto', 'hooks', 'dist');
  fs.rmSync(distDir, { recursive: true, force: true });

  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'build-hooks.js')], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, `build failed: ${r.stderr}\n${r.stdout}`);

  const dist = fs.readdirSync(distDir).sort();
  assert.deepEqual(dist, KEEP_HOOKS.slice().sort(), `expected exactly ${KEEP_HOOKS.length} files in dist/`);

  const sessionMode = fs.statSync(path.join(distDir, 'oto-session-start')).mode & 0o111;
  assert.notEqual(sessionMode, 0, 'oto-session-start must be executable');
  const commitMode = fs.statSync(path.join(distDir, 'oto-validate-commit.sh')).mode & 0o111;
  assert.notEqual(commitMode, 0, 'oto-validate-commit.sh must be executable');

  const srcSession = fs.readFileSync(path.join(REPO_ROOT, 'oto/hooks/oto-session-start'), 'utf8').split('\n');
  assert.match(srcSession[0], /^#!/);
  assert.match(srcSession[1], /^# oto-hook-version: \{\{OTO_VERSION\}\}/);

  const r2 = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'build-hooks.js')], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(r2.status, 0, `second build failed: ${r2.stderr}\n${r2.stdout}`);
});
