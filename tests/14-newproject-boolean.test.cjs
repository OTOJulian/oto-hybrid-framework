'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');

// Unlike tests/14-config-boolean.test.cjs, this fixture must NOT pre-create
// .oto/config.json — config-new-project is idempotent and skips when it exists.
function seedFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-newproject-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-newproject-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return { project, home, configPath: path.join(project, '.oto/config.json') };
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

function runNewProject(fixture, ...args) {
  return spawnSync(process.execPath, [OTO_TOOLS, 'config-new-project', ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

function seedGlobalDefaults(fixture, defaults) {
  const homeOto = path.join(fixture.home, '.oto');
  fs.mkdirSync(homeOto, { recursive: true, mode: 0o700 });
  const defaultsPath = path.join(homeOto, 'defaults.json');
  fs.writeFileSync(defaultsPath, JSON.stringify(defaults, null, 2) + '\n');
  return { homeOto, defaultsPath };
}

for (const [configKey, keyfileName] of [
  ['exa_search', 'exa_api_key'],
  ['brave_search', 'brave_api_key'],
  ['firecrawl', 'firecrawl_api_key'],
]) {
  test(`config-new-project rejects a caller-supplied string for ${configKey} without writing anything`, (t) => {
    const fixture = seedFixture(t);
    const plaintext = `sk-test-${configKey}-0123456789`;

    const result = runNewProject(fixture, JSON.stringify({ [configKey]: plaintext }));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /booleans only/);
    assert.equal(fs.existsSync(fixture.configPath), false);
    assert.equal(fs.existsSync(path.join(fixture.home, '.oto')), false);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(plaintext));
  });

  test(`config-new-project migrates a global-default string for ${configKey} to a 0600 keyfile`, (t) => {
    const fixture = seedFixture(t);
    const plaintext = `sk-test-${configKey}-9876543210`;
    const { homeOto, defaultsPath } = seedGlobalDefaults(fixture, { [configKey]: plaintext });

    const result = runNewProject(fixture);

    assert.equal(result.status, 0, result.stderr);
    const config = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
    assert.equal(config[configKey], true);
    const keyfile = path.join(homeOto, keyfileName);
    assert.equal(fs.readFileSync(keyfile, 'utf8'), plaintext + '\n');
    assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
    assert.match(
      result.stderr,
      new RegExp(`migrated ${configKey} API key from global defaults to ~/\\.oto/${keyfileName} \\(0600\\)`),
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(plaintext));
    // Best-effort heal: the oto-owned ~/.oto/defaults.json no longer carries the string.
    const healed = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    assert.equal(healed[configKey], true);
  });
}

test('config-new-project keeps an existing keyfile over a conflicting global-default string (D-02)', (t) => {
  const fixture = seedFixture(t);
  const keyfileSecret = 'sk-existing-keyfile-0000';
  const defaultsSecret = 'sk-defaults-different-1111';
  const { homeOto } = seedGlobalDefaults(fixture, { exa_search: defaultsSecret });
  const keyfile = path.join(homeOto, 'exa_api_key');
  fs.writeFileSync(keyfile, keyfileSecret + '\n', { mode: 0o600 });

  const result = runNewProject(fixture);

  assert.equal(result.status, 0, result.stderr);
  // Keyfile wins: content unchanged, config gets boolean true.
  assert.equal(fs.readFileSync(keyfile, 'utf8'), keyfileSecret + '\n');
  const config = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(config.exa_search, true);
  // Masked conflict notice only — never the full strings.
  assert.match(result.stderr, /exa_search: keyfile ~\/\.oto\/exa_api_key \(\*\*\*\*0000\) kept; config string \(\*\*\*\*1111\) dropped/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(keyfileSecret));
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(defaultsSecret));
});

test('config-new-project still accepts a boolean caller choice', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify({ exa_search: true }));

  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(config.exa_search, true);
  assert.equal(config.brave_search, false);
  assert.equal(config.firecrawl, false);
});
