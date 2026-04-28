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
  console.log(`Smoke: installing github:julianisaac/oto-hybrid-framework#${ref} into ${tmpdir}...`);
  execSync(`npm install -g github:julianisaac/oto-hybrid-framework#${ref} --prefix ${tmpdir}`, {
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

  console.log(`PASS: install-smoke for ref ${ref} (oto v${expectedVersion})`);
} finally {
  fs.rmSync(tmpdir, { recursive: true, force: true });
}
