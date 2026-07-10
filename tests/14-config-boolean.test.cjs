'use strict';

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
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-config-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-config-home-'));
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

for (const [configKey, slug] of [
  ['exa_search', 'exa'],
  ['brave_search', 'brave'],
  ['firecrawl', 'firecrawl'],
]) {
  test(`config-set rejects a string for ${configKey} without writing it`, (t) => {
    const fixture = seedFixture(t);
    const before = fs.readFileSync(fixture.configPath, 'utf8');
    const plaintext = `sk-test-${slug}-123456789`;

    const result = runConfig(fixture, 'config-set', configKey, plaintext);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /booleans only/);
    assert.match(result.stderr, new RegExp(`secret-set ${slug}`));
    assert.equal(fs.readFileSync(fixture.configPath, 'utf8'), before);
    assert.equal(fs.existsSync(path.join(fixture.home, '.oto')), false);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(plaintext));
  });
}

test('config-set true warns without a detected Exa key but persists the boolean', (t) => {
  const fixture = seedFixture(t);

  const result = runConfig(fixture, 'config-set', 'exa_search', 'true');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).exa_search, true);
  assert.match(result.stderr, /no Exa API key detected/);
  assert.match(result.stderr, /EXA_API_KEY or ~\/\.oto\/exa_api_key/);
});

test('config-set true stays quiet when an Exa keyfile is present', (t) => {
  const fixture = seedFixture(t);
  const keyDir = path.join(fixture.home, '.oto');
  fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(keyDir, 'exa_api_key'), 'sk-present-1234\n', { mode: 0o600 });

  const result = runConfig(fixture, 'config-set', 'exa_search', 'true');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).exa_search, true);
  assert.doesNotMatch(result.stderr, /no Exa API key detected/);
  assert.equal(result.stderr, '');
});

test('config-set false persists silently without requiring an integration key', (t) => {
  const fixture = seedFixture(t, { exa_search: true });

  const result = runConfig(fixture, 'config-set', 'exa_search', 'false');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).exa_search, false);
  assert.equal(result.stderr, '');
});

test('config-get self-heals a legacy Exa string into a 0600 keyfile', (t) => {
  const plaintext = 'sk-legacy-abcdef1234';
  const fixture = seedFixture(t, { exa_search: plaintext });

  const result = runConfig(fixture, 'config-get', 'exa_search');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).exa_search, true);
  const keyfile = path.join(fixture.home, '.oto/exa_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), plaintext + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.match(result.stderr, /migrated exa_search API key/);
  assert.match(result.stderr, /rotating it at the provider/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(plaintext));
});

test('loadConfig independently self-heals a legacy Exa string', (t) => {
  const plaintext = 'sk-core-legacy-9876';
  const fixture = seedFixture(t, { exa_search: plaintext });
  const script = [
    `const { loadConfig } = require(${JSON.stringify(CORE)});`,
    'process.stdout.write(JSON.stringify(loadConfig(process.cwd()).exa_search));',
  ].join(' ');

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout), true);
  assert.equal(JSON.parse(fs.readFileSync(fixture.configPath, 'utf8')).exa_search, true);
  const keyfile = path.join(fixture.home, '.oto/exa_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), plaintext + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.match(result.stderr, /migrated exa_search API key/);
  assert.match(result.stderr, /rotating it at the provider/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(plaintext));
});
