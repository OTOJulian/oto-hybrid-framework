'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: MR-01 automated Claude install smoke.
// Will: npm-pack the repo, install into a temp prefix, run oto install --claude, and inspect the install state.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

test('phase-04 mr01-install-smoke: tarball install populates oto/commands and oto/agents under configDir', { timeout: 120000 }, () => {
  let packDir;
  let tarball;
  let prefix;
  let configDir;
  let npmCache;

  try {
    packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-mr01-pack-'));
    prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-mr01-prefix-'));
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-mr01-claude-'));
    npmCache = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-mr01-npm-cache-'));
    const npmEnv = { ...process.env, npm_config_cache: npmCache, npm_config_loglevel: 'error' };

    const packResult = spawnSync(
      'npm',
      ['pack', '--json', '--pack-destination', packDir],
      { cwd: REPO_ROOT, encoding: 'utf8', env: npmEnv },
    );
    assert.equal(packResult.status, 0, `npm pack failed: ${packResult.stderr}\n${packResult.stdout}`);
    const packInfo = JSON.parse(packResult.stdout);
    tarball = path.join(packDir, packInfo[0].filename);
    assert.ok(fs.existsSync(tarball), `tarball missing: ${tarball}`);

    const installResult = spawnSync(
      'npm',
      ['install', '-g', tarball, '--prefix', prefix],
      { encoding: 'utf8', env: npmEnv },
    );
    assert.equal(installResult.status, 0, `npm install failed: ${installResult.stderr}\n${installResult.stdout}`);

    const otoBin = path.join(prefix, 'bin', 'oto');
    assert.ok(fs.existsSync(otoBin), `oto binary missing at ${otoBin}`);
    const otoResult = spawnSync(otoBin, ['install', '--claude', '--config-dir', configDir], { encoding: 'utf8' });
    assert.equal(otoResult.status, 0, `oto install failed: ${otoResult.stderr}\n${otoResult.stdout}`);

    const marker = path.join(configDir, 'oto', '.install.json');
    assert.ok(fs.existsSync(marker), `install marker missing at ${marker}`);

    assert.ok(
      fs.existsSync(path.join(configDir, 'commands', 'oto', 'plan-phase.md')),
      'commands/oto/plan-phase.md not installed',
    );
    assert.ok(
      fs.existsSync(path.join(configDir, 'agents', 'oto-planner.md')),
      'agents/oto-planner.md not installed',
    );

    const state = JSON.parse(fs.readFileSync(marker, 'utf8'));
    assert.equal(state.runtime, 'claude');
    assert.equal(state.config_dir, configDir);
    assert.ok(Array.isArray(state.files), 'install state files must be an array');
    assert.ok(state.files.length > 50, `install state has too few files: ${state.files.length}`);
  } finally {
    if (tarball) fs.rmSync(tarball, { force: true });
    if (packDir) fs.rmSync(packDir, { recursive: true, force: true });
    if (prefix) fs.rmSync(prefix, { recursive: true, force: true });
    if (configDir) fs.rmSync(configDir, { recursive: true, force: true });
    if (npmCache) fs.rmSync(npmCache, { recursive: true, force: true });
  }
});
