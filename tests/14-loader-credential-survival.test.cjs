'use strict';

/**
 * Phase 14 gap-closure (SECR-01/SECR-03) — loader credential survival.
 *
 * A failed legacy-key migration must never let an unrelated loadConfig
 * write-back replace the only stored credential with a boolean.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CORE = path.join(REPO_ROOT, 'oto/bin/lib/core.cjs');

function seedFixture(t, config) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-loader-survival-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-loader-survival-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, '.oto'), { recursive: true });
  const configPath = path.join(project, '.oto/config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return { project, home, configPath };
}

function cleanEnv(home) {
  return {
    ...process.env,
    HOME: home,
    EXA_API_KEY: '',
    BRAVE_API_KEY: '',
    FIRECRAWL_API_KEY: '',
  };
}

const LOAD_CONFIG_SCRIPT = [
  `const { loadConfig } = require(${JSON.stringify(CORE)});`,
  'process.stdout.write(JSON.stringify(loadConfig(process.cwd()).exa_search));',
].join(' ');

function runLoadConfig(fixture) {
  return spawnSync(process.execPath, ['-e', LOAD_CONFIG_SCRIPT], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

test('failed migration + depth dirty-write leaves the legacy string on disk', (t) => {
  const marker = 'sk-test-survival-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, depth: 'standard' });
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');

  const result = runLoadConfig(fixture);

  assert.equal(result.status, 0, result.stderr);
  const persisted = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(persisted.exa_search, marker);
  assert.equal(persisted.granularity, 'standard');
  assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'depth'), false);
  assert.equal(fs.existsSync(path.join(fixture.home, '.oto', 'exa_api_key')), false);
  assert.equal(JSON.parse(result.stdout), true);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
});

test('happy path still heals the legacy string while migrating granularity', (t) => {
  const marker = 'sk-test-survival-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, depth: 'standard' });

  const result = runLoadConfig(fixture);

  assert.equal(result.status, 0, result.stderr);
  const persisted = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(persisted.exa_search, true);
  assert.equal(persisted.granularity, 'standard');
  assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'depth'), false);
  const keyfile = path.join(fixture.home, '.oto', 'exa_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), marker + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.equal(JSON.parse(result.stdout), true);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
});

test('failed migration + sub_repos dirty-write leaves the legacy string on disk', (t) => {
  const marker = 'sk-test-survival-0123456789';
  const fixture = seedFixture(t, { exa_search: marker, sub_repos: ['child'] });
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');

  const result = runLoadConfig(fixture);

  assert.equal(result.status, 0, result.stderr);
  const persisted = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(persisted.exa_search, marker);
  assert.deepEqual(persisted.planning.sub_repos, ['child']);
  assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'sub_repos'), false);
  assert.equal(JSON.parse(result.stdout), true);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
});
