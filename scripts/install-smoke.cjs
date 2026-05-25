#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

const { values } = parseArgs({
  options: { ref: { type: 'string' } },
  strict: true,
});

const ref = values.ref || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-smoke-'));
const expectedVersion = require(path.join(__dirname, '..', 'package.json')).version;
const NEW_AGENTS = ['oto-doc-classifier', 'oto-doc-synthesizer', 'oto-eval-auditor'];
const CODEX_AGENT_SANDBOX = {
  'oto-doc-classifier': 'read-only',
  'oto-doc-synthesizer': 'workspace-write',
  'oto-eval-auditor': 'read-only',
};

try {
  const spec = `https://github.com/OTOJulian/oto-hybrid-framework/archive/${ref}.tar.gz`;
  console.log(`Smoke: installing ${spec} into ${tmpdir}...`);
  const install = spawnSync('npm', ['install', '-g', spec, '--prefix', tmpdir], {
    stdio: 'inherit',
  });
  if (install.status !== 0) {
    process.exit(install.status || 1);
  }

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

  const sdkBin = path.join(path.dirname(binPath), 'oto-sdk');
  if (!fs.existsSync(sdkBin)) {
    console.error(`FAIL: oto-sdk bin not at ${sdkBin}`);
    process.exit(1);
  }
  const sdkMode = fs.statSync(sdkBin).mode;
  if ((sdkMode & 0o111) === 0) {
    console.error(`FAIL: oto-sdk bin not executable (mode ${sdkMode.toString(8)})`);
    process.exit(1);
  }

  const r1 = spawnSync(sdkBin, ['query', 'generate-slug', 'Phase Eleven'], { encoding: 'utf8' });
  const combinedR1 = `${r1.stdout || ''}\n${r1.stderr || ''}`;
  if (combinedR1.includes('ERR_MODULE_NOT_FOUND')) {
    console.error('FAIL: oto-sdk crashed with ERR_MODULE_NOT_FOUND — top-level deps did not resolve from sdk/dist/cli.js');
    process.exit(1);
  }
  if (r1.status !== 0) {
    console.error(
      `FAIL: oto-sdk query generate-slug failed: status=${r1.status}\n` +
        `stdout:\n${r1.stdout}\nstderr:\n${r1.stderr}`
    );
    process.exit(1);
  }
  let slugJson;
  try {
    slugJson = JSON.parse(r1.stdout);
  } catch (error) {
    console.error(`FAIL: oto-sdk query generate-slug stdout is not JSON: ${error.message}\nstdout:\n${r1.stdout}`);
    process.exit(1);
  }
  if (slugJson.slug !== 'phase-eleven') {
    console.error(`FAIL: oto-sdk query generate-slug expected slug phase-eleven, got ${slugJson.slug}`);
    process.exit(1);
  }
  console.log('PASS: oto-sdk query generate-slug -> structured JSON, deps resolve');

  const planningProject = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-planning-smoke-'));
  const planningDir = path.join(planningProject, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(
    path.join(planningDir, 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '## Phase Details',
      '',
      '### Phase 11: oto-sdk package port + PATH wiring',
      '**Goal**: smoke test',
      '**Plans**: 1 plan',
      '',
    ].join('\n')
  );
  const r2 = spawnSync(sdkBin, ['query', 'roadmap.analyze'], { encoding: 'utf8', cwd: planningProject });
  const combinedR2 = `${r2.stdout || ''}\n${r2.stderr || ''}`;
  if (combinedR2.includes('ERR_MODULE_NOT_FOUND')) {
    fs.rmSync(planningProject, { recursive: true, force: true });
    console.error('FAIL: oto-sdk roadmap.analyze crashed with ERR_MODULE_NOT_FOUND — top-level deps did not resolve from sdk/dist/cli.js');
    process.exit(1);
  }
  if (r2.status !== 0) {
    fs.rmSync(planningProject, { recursive: true, force: true });
    console.error(
      `FAIL: oto-sdk query roadmap.analyze failed: status=${r2.status}\n` +
        `stdout:\n${r2.stdout}\nstderr:\n${r2.stderr}`
    );
    process.exit(1);
  }
  try {
    JSON.parse(r2.stdout);
  } catch (error) {
    fs.rmSync(planningProject, { recursive: true, force: true });
    console.error(`FAIL: oto-sdk query roadmap.analyze stdout is not JSON: ${error.message}\nstdout:\n${r2.stdout}`);
    process.exit(1);
  }
  fs.rmSync(planningProject, { recursive: true, force: true });
  console.log('PASS: oto-sdk query roadmap.analyze -> parseable JSON');

  runOtoInstallSmoke(path.dirname(binPath));

  console.log(`PASS: install-smoke for ref ${ref} (oto v${expectedVersion})`);
} finally {
  fs.rmSync(tmpdir, { recursive: true, force: true });
}

function runOtoInstallSmoke(binDir) {
  for (const runtime of ['claude', 'codex', 'gemini']) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `oto-smoke-${runtime}-`));
    const env = {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
    };
    const r = spawnSync('oto', ['install', `--${runtime}`, '--config-dir', tmp], {
      encoding: 'utf8',
      timeout: 60000,
      env,
    });
    if (r.status !== 0) {
      console.error(
        `FAIL: oto install --${runtime} --config-dir failed: status=${r.status}\n` +
          `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`
      );
      process.exit(1);
    }

    const statePath = path.join(tmp, 'oto', '.install.json');
    if (!fs.existsSync(statePath)) {
      console.error(`FAIL: ${runtime} state file missing at ${statePath}`);
      process.exit(1);
    }
    for (const agent of NEW_AGENTS) {
      const agentPath = path.join(tmp, 'agents', `${agent}.md`);
      if (!fs.existsSync(agentPath)) {
        console.error(`FAIL: ${runtime} missing ${agent}.md at ${agentPath}`);
        process.exit(1);
      }
      if (runtime === 'codex') {
        const tomlPath = path.join(tmp, 'agents', `${agent}.toml`);
        if (!fs.existsSync(tomlPath)) {
          console.error(`FAIL: codex missing ${agent}.toml at ${tomlPath}`);
          process.exit(1);
        }
        const toml = fs.readFileSync(tomlPath, 'utf8');
        const match = toml.match(/sandbox_mode\s*=\s*"([^"]+)"/);
        const expected = CODEX_AGENT_SANDBOX[agent];
        if (!match || match[1] !== expected) {
          console.error(`FAIL: codex ${agent}.toml sandbox_mode expected ${expected}, got ${match?.[1] || 'missing'}`);
          process.exit(1);
        }
      }
    }

    if (runtime === 'claude') {
      const claudeMd = path.join(tmp, 'CLAUDE.md');
      const markerPresent = fs.existsSync(claudeMd) &&
        fs.readFileSync(claudeMd, 'utf8').includes('<!-- OTO Configuration -->');
      if (!markerPresent) {
        console.error('FAIL: CLAUDE.md marker missing after oto install --claude');
        process.exit(1);
      }
      if (!r.stdout.includes('OTO SDK ready')) {
        console.error('FAIL: installer did not print PATH-gated "OTO SDK ready" (oto-sdk should be callable with binDir on PATH)');
        process.exit(1);
      }
      console.log('PASS: installer reports OTO SDK ready (PATH-gated)');

      console.log(
        `PASS: Phase 3 smoke: oto install --claude --config-dir ${tmp} ` +
          '-> state + marker present'
      );
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('PASS: 3 new agents installed across claude/codex/gemini');
}
