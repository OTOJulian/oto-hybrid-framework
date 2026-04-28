#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync, spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

const { values } = parseArgs({
  options: { ref: { type: 'string' } },
  strict: true,
});

const ref = values.ref || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-smoke-'));
const expectedVersion = require(path.join(__dirname, '..', 'package.json')).version;

try {
  const spec = `https://github.com/OTOJulian/oto-hybrid-framework/archive/${ref}.tar.gz`;
  console.log(`Smoke: installing ${spec} into ${tmpdir}...`);
  execSync(`npm install -g ${spec} --prefix ${tmpdir}`, {
    stdio: 'inherit',
  });

  const binPath = path.join(tmpdir, 'bin', 'oto');
  if (!fs.existsSync(binPath)) {
    console.error(`FAIL: bin not at ${binPath}`);
    process.exit(1);
  }
  const mode = fs.statSync(binPath).mode;
  if ((mode & 0o111) === 0) {
    console.error(`FAIL: bin not executable (mode ${mode.toString(8)})`);
    process.exit(1);
  }

  const out = spawnSync(binPath, [], { encoding: 'utf8' });
  if (out.status !== 0) {
    console.error(`FAIL: bin exit ${out.status}\nstderr:\n${out.stderr}`);
    process.exit(1);
  }
  if (!out.stdout.includes(`oto v${expectedVersion}`)) {
    console.error(`FAIL: stdout missing 'oto v${expectedVersion}'\nstdout:\n${out.stdout}`);
    process.exit(1);
  }

  runOtoInstallClaudeSmoke(path.dirname(binPath));

  console.log(`PASS: install-smoke for ref ${ref} (oto v${expectedVersion})`);
} finally {
  fs.rmSync(tmpdir, { recursive: true, force: true });
}

function runOtoInstallClaudeSmoke(binDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-smoke-'));
  try {
    const env = {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
    };
    const r = spawnSync('oto', ['install', '--claude', '--config-dir', tmp], {
      encoding: 'utf8',
      timeout: 60000,
      env,
    });
    if (r.status !== 0) {
      console.error(
        `FAIL: oto install --claude --config-dir failed: status=${r.status}\n` +
          `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`
      );
      process.exit(1);
    }

    const statePath = path.join(tmp, 'oto', '.install.json');
    if (!fs.existsSync(statePath)) {
      console.error(`FAIL: state file missing at ${statePath}`);
      process.exit(1);
    }

    const claudeMd = path.join(tmp, 'CLAUDE.md');
    const markerPresent = fs.existsSync(claudeMd) &&
      fs.readFileSync(claudeMd, 'utf8').includes('<!-- OTO Configuration -->');
    if (!markerPresent) {
      console.error('FAIL: CLAUDE.md marker missing after oto install --claude');
      process.exit(1);
    }

    console.log(
      `PASS: Phase 3 smoke: oto install --claude --config-dir ${tmp} ` +
        '-> state + marker present'
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
