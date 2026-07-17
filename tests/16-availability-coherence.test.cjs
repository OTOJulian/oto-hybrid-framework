'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');

function seedFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-availability-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-availability-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return { project, home };
}

function cleanEnv(home, overrides = {}) {
  return {
    ...process.env,
    HOME: home,
    EXA_API_KEY: '',
    BRAVE_API_KEY: '',
    FIRECRAWL_API_KEY: '',
    ...overrides,
  };
}

function runInit(fixture, overrides = {}) {
  const result = spawnSync(process.execPath, [OTO_TOOLS, 'init', 'new-project'], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home, overrides),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function writeKeyfile(fixture, name, contents) {
  const otoHome = path.join(fixture.home, '.oto');
  fs.mkdirSync(otoHome, { recursive: true, mode: 0o700 });
  const keyfile = path.join(otoHome, name);
  fs.writeFileSync(keyfile, contents, { mode: 0o600 });
  return keyfile;
}

test('reports all integrations unavailable when no keys exist', (t) => {
  const output = runInit(seedFixture(t));
  assert.equal(output.exa_search_available, false);
  assert.equal(output.brave_search_available, false);
  assert.equal(output.firecrawl_available, false);
});

test('reports Exa unavailable for an empty keyfile', (t) => {
  const fixture = seedFixture(t);
  writeKeyfile(fixture, 'exa_api_key', '');
  assert.equal(runInit(fixture).exa_search_available, false);
});

test('reports Exa unavailable for a whitespace-only keyfile', (t) => {
  const fixture = seedFixture(t);
  writeKeyfile(fixture, 'exa_api_key', '  \n');
  assert.equal(runInit(fixture).exa_search_available, false);
});

test('reports Brave available for a valid keyfile', (t) => {
  const fixture = seedFixture(t);
  writeKeyfile(fixture, 'brave_api_key', 'test-key-0123456789\n');
  assert.equal(runInit(fixture).brave_search_available, true);
});

test('reports Exa available from a non-empty environment variable', (t) => {
  const fixture = seedFixture(t);
  assert.equal(runInit(fixture, { EXA_API_KEY: 'test-env-key' }).exa_search_available, true);
});
