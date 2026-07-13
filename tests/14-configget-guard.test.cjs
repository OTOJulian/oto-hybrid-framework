'use strict';

/**
 * Phase 14 gap-closure (SECR-02/SECR-03/SECR-04) — guarded CJS config reads.
 *
 * Pins the verifier's exact degraded-~/.oto reproduction plus the boolean and
 * migration-warning behavior expected from the CJS config CLI.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const MARKER = 'sk-test-guard-0123456789';
const PARSE_MARKER_FRAGMENT = 'SYNTH_MARK';
const PARSE_MARKER_PREFIX = 'SYNTH_MARKER';
const PARSE_MARKER = 'SYNTH_MARKER_do_not_echo_123456789';

function seedFixture(t, config = {}) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-configget-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-configget-home-'));
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

function runConfig(fixture, ...args) {
  return spawnSync(process.execPath, [OTO_TOOLS, ...args], {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

function combinedOutput(result) {
  return result.stdout + result.stderr;
}

test('config-get fails open for an unrelated key when legacy migration fails', (t) => {
  const fixture = seedFixture(t, { exa_search: MARKER, model_profile: 'quality' });
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');

  const result = runConfig(fixture, 'config-get', 'model_profile');
  const output = combinedOutput(result);

  assert.equal(result.status, 0, output);
  assert.match(result.stdout, /quality/);
  assert.doesNotMatch(output, /EEXIST/);
  assert.doesNotMatch(output, / at .*core\.cjs|config\.cjs:\d+/);
  assert.doesNotMatch(output, new RegExp(MARKER));
});

test('config-get fails closed cleanly for an integration key when migration fails', (t) => {
  const fixture = seedFixture(t, { exa_search: MARKER, model_profile: 'quality' });
  fs.writeFileSync(path.join(fixture.home, '.oto'), 'not-a-dir');

  const result = runConfig(fixture, 'config-get', 'exa_search');
  const output = combinedOutput(result);

  assert.notEqual(result.status, 0);
  assert.match(output, /legacy key migration failed — value withheld/);
  assert.doesNotMatch(output, /EEXIST/);
  assert.doesNotMatch(output, / at .*core\.cjs|config\.cjs:\d+/);
  assert.doesNotMatch(output, new RegExp(MARKER));
});

test('config-get does not disclose malformed-config secret fragments', (t) => {
  const fixture = seedFixture(t);
  fs.writeFileSync(fixture.configPath, `{"exa_search": ${PARSE_MARKER}}`);

  const result = runConfig(fixture, 'config-get', 'exa_search');
  const output = combinedOutput(result);

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, new RegExp(PARSE_MARKER_FRAGMENT));
  assert.doesNotMatch(result.stderr, new RegExp(PARSE_MARKER_FRAGMENT));
  assert.doesNotMatch(result.stdout, new RegExp(PARSE_MARKER_PREFIX));
  assert.doesNotMatch(result.stderr, new RegExp(PARSE_MARKER_PREFIX));
  assert.doesNotMatch(result.stdout, new RegExp(PARSE_MARKER));
  assert.doesNotMatch(result.stderr, new RegExp(PARSE_MARKER));
  assert.match(output, /malformed JSON/i);
  assert.equal(output.includes(fixture.configPath), true);
});

test('config-get prints boolean integration flags without masking', (t) => {
  const trueFixture = seedFixture(t, { exa_search: true });
  const trueResult = runConfig(trueFixture, 'config-get', 'exa_search');
  assert.equal(trueResult.status, 0, combinedOutput(trueResult));
  assert.match(trueResult.stdout, /true/);
  assert.doesNotMatch(trueResult.stdout, /\*\*\*\*/);

  const falseFixture = seedFixture(t, { exa_search: false });
  const falseResult = runConfig(falseFixture, 'config-get', 'exa_search');
  assert.equal(falseResult.status, 0, combinedOutput(falseResult));
  assert.match(falseResult.stdout, /false/);
  assert.doesNotMatch(falseResult.stdout, /\*\*\*\*/);
});

test('config-set echoes a boolean integration flag without masking', (t) => {
  const fixture = seedFixture(t, { exa_search: true });

  const result = runConfig(fixture, 'config-set', 'exa_search', 'false', '--raw');

  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(result.stdout, /exa_search=false/);
  assert.doesNotMatch(result.stdout, /\*\*\*\*/);
});

test('config-set migrates a legacy key before checking whether a key exists', (t) => {
  const fixture = seedFixture(t, { exa_search: MARKER });

  const result = runConfig(fixture, 'config-set', 'exa_search', 'true');
  const output = combinedOutput(result);

  assert.equal(result.status, 0, output);
  assert.match(result.stderr, /migrated exa_search API key/);
  assert.doesNotMatch(result.stderr, /no Exa API key detected/);
  const keyfile = path.join(fixture.home, '.oto/exa_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), MARKER + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.doesNotMatch(output, new RegExp(MARKER));
});
