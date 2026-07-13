'use strict';

/**
 * Phase 14 gap-closure (WR-05 / SECR-01) — effective loader scrub parity.
 *
 * Migration is forced to fail so these tests exercise the loader's final
 * in-memory safety boundary while proving the source config stays pristine.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CORE = path.join(REPO_ROOT, 'oto/bin/lib/core.cjs');
const MARKER = 'scrub-marker-0123456789';

function seedFixture(t, config) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-loader-scrub-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-loader-scrub-home-'));
  const otoDir = path.join(project, '.oto');
  const configPath = path.join(otoDir, 'config.json');
  fs.mkdirSync(otoDir, { recursive: true });
  const originalBytes = JSON.stringify(config, null, 2) + '\n';
  fs.writeFileSync(configPath, originalBytes);

  // Directory mode blocks the atomic temp/rename path. Read-only file mode
  // also blocks atomicWrite's direct-write fallback on POSIX.
  fs.chmodSync(configPath, 0o444);
  fs.chmodSync(otoDir, 0o555);

  t.after(() => {
    try { fs.chmodSync(otoDir, 0o755); } catch {}
    try { fs.chmodSync(configPath, 0o644); } catch {}
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  return { project, home, configPath, originalBytes };
}

function loadFixture(fixture) {
  const script = [
    `const { loadConfig } = require(${JSON.stringify(CORE)});`,
    'process.stdout.write(JSON.stringify(loadConfig(process.cwd())));',
  ].join(' ');
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: fixture.project,
    env: {
      ...process.env,
      HOME: fixture.home,
      EXA_API_KEY: '',
      BRAVE_API_KEY: '',
      FIRECRAWL_API_KEY: '',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function assertDiskPristine(fixture) {
  assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), fixture.originalBytes);
}

test('scrubs an object integration value after migration rewrite fails', (t) => {
  const fixture = seedFixture(t, { exa_search: { nested: MARKER } });
  const config = loadFixture(fixture);

  assert.equal(config.exa_search, true);
  assert.doesNotMatch(JSON.stringify(config), new RegExp(MARKER));
  assertDiskPristine(fixture);
});

test('scrubs a numeric integration value after migration rewrite fails', (t) => {
  const fixture = seedFixture(t, { brave_search: 42 });
  const config = loadFixture(fixture);

  assert.equal(config.brave_search, true);
  assertDiskPristine(fixture);
});

test('scrubs a null integration value after migration rewrite fails', (t) => {
  const fixture = seedFixture(t, { firecrawl: null });
  const config = loadFixture(fixture);

  assert.equal(config.firecrawl, false);
  assertDiskPristine(fixture);
});

test('scrubs an array integration value without returning its marker', (t) => {
  const fixture = seedFixture(t, { exa_search: [MARKER] });
  const config = loadFixture(fixture);

  assert.equal(config.exa_search, true);
  assert.doesNotMatch(JSON.stringify(config), new RegExp(MARKER));
  assertDiskPristine(fixture);
});

test('preserves legacy non-empty string scrubbing after migration rewrite fails', (t) => {
  const fixture = seedFixture(t, { exa_search: MARKER });
  const config = loadFixture(fixture);

  assert.equal(config.exa_search, true);
  assert.doesNotMatch(JSON.stringify(config), new RegExp(MARKER));
  assertDiskPristine(fixture);
});

test('maps an empty integration string to false after migration rewrite fails', (t) => {
  const fixture = seedFixture(t, { exa_search: '' });
  const config = loadFixture(fixture);

  assert.equal(config.exa_search, false);
  assertDiskPristine(fixture);
});

test('leaves an absent integration key absent on disk and uses its default', (t) => {
  const fixture = seedFixture(t, { model_profile: 'quality' });
  const config = loadFixture(fixture);

  assert.equal(config.firecrawl, false);
  const persisted = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'firecrawl'), false);
  assertDiskPristine(fixture);
});
