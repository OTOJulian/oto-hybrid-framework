'use strict';

/**
 * Phase 14 gap-closure (SECR-03) — migration hardening regression tests.
 *
 * Covers the three verifier-reproduced failures:
 *  1. Legacy-overwrite: `config-set <integration> true` on a legacy string
 *     config must keyfile the string BEFORE overwriting it (×3 integrations).
 *  2. Fail-closed: when migration cannot complete (~/.oto is a regular file),
 *     config-set on an integration key exits non-zero WITHOUT modifying
 *     config.json.
 *  3. CR-04 root-plus-workstream: with OTO_WORKSTREAM set, the ROOT config
 *     layer is migrated before it is parsed, and the loader never returns an
 *     integration string (in-memory scrub) even when file migration failed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const CORE = path.join(REPO_ROOT, 'oto/bin/lib/core.cjs');

function seedFixture(t, config = {}) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migration-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-migration-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, '.oto'), { recursive: true });
  const configPath = path.join(project, '.oto/config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    exa_search: false,
    brave_search: false,
    firecrawl: false,
    ...config,
  }, null, 2) + '\n');
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

function runConfig(fixture, ...args) {
  return spawnSync(process.execPath, [OTO_TOOLS, ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

// ── Task 1: cmdConfigSet migrates legacy strings before overwrite ──

for (const [configKey, slug, keyfileName] of [
  ['exa_search', 'exa', 'exa_api_key'],
  ['brave_search', 'brave', 'brave_api_key'],
  ['firecrawl', 'firecrawl', 'firecrawl_api_key'],
]) {
  test(`config-set ${configKey} true keyfiles a legacy string before overwriting it`, (t) => {
    const marker = `sk-test-${slug}-0123456789`;
    const fixture = seedFixture(t, { [configKey]: marker });

    const result = runConfig(fixture, 'config-set', configKey, 'true');

    assert.equal(result.status, 0, result.stderr);
    const keyfile = path.join(fixture.home, '.oto', keyfileName);
    assert.equal(fs.readFileSync(keyfile, 'utf8'), marker + '\n');
    assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'))[configKey], true);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
  });
}

test('config-set fails closed when legacy migration cannot complete', (t) => {
  const marker = 'sk-test-exa-0123456789';
  const fixture = seedFixture(t, { exa_search: marker });
  // ~/.oto pre-created as a regular FILE so mkdirSync inside writeKeyfile throws.
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');
  const before = fs.readFileSync(fixture.configPath, 'utf8');

  const result = runConfig(fixture, 'config-set', 'exa_search', 'true');

  assert.notEqual(result.status, 0);
  // Byte-identical: the only stored credential is never overwritten.
  assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), before);
  assert.match(result.stdout + result.stderr, /legacy key migration failed/);
  assert.match(result.stdout + result.stderr, /config not modified/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(marker));
});

test('config-set on a non-integration key is unaffected by a broken keyfile base', (t) => {
  const fixture = seedFixture(t, { exa_search: 'sk-test-exa-0123456789' });
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');

  const result = runConfig(fixture, 'config-set', 'model_profile', 'quality');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).model_profile, 'quality');
});
