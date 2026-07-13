'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OTO_TOOLS = path.join(REPO_ROOT, 'oto/bin/lib/oto-tools.cjs');
const GAP_MARKER = 'sk-gap1-marker-0123456789';
const DEFAULT_EXA = 'sk-default-exa-0123456789';

function seedFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-shape-project-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-shape-home-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return {
    project,
    home,
    planningDir: path.join(project, '.oto'),
    configPath: path.join(project, '.oto', 'config.json'),
  };
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

function runNewProject(fixture, jsonArg) {
  const args = [OTO_TOOLS, 'config-new-project'];
  if (jsonArg !== undefined) args.push(jsonArg);
  return spawnSync(process.execPath, args, {
    cwd: fixture.project,
    env: cleanEnv(fixture.home),
    encoding: 'utf8',
  });
}

function seedGlobalDefaults(fixture, defaults) {
  const homeOto = path.join(fixture.home, '.oto');
  fs.mkdirSync(homeOto, { recursive: true, mode: 0o700 });
  const defaultsPath = path.join(homeOto, 'defaults.json');
  const bytes = JSON.stringify(defaults, null, 2) + '\n';
  fs.writeFileSync(defaultsPath, bytes);
  return { homeOto, defaultsPath, bytes };
}

function treeContains(root, marker) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (treeContains(target, marker)) return true;
    } else if (entry.isFile() && fs.readFileSync(target).includes(marker)) {
      return true;
    }
  }
  return false;
}

function assertRejectedWithoutProjectSideEffects(fixture, result) {
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(fixture.planningDir), false);
}

test('rejects the verifier array reproduction without creating .oto or persisting its marker', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify([{ exa_search: GAP_MARKER }]));

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.equal(treeContains(fixture.project, GAP_MARKER), false);
  assert.match(result.stdout + result.stderr, /expected a JSON object/);
});

test('rejects primitive and null choices roots before creating .oto', (t) => {
  for (const jsonArg of ['"just-a-string"', '42', 'null', 'true']) {
    const fixture = seedFixture(t);
    const result = runNewProject(fixture, jsonArg);
    assertRejectedWithoutProjectSideEffects(fixture, result);
    assert.match(result.stdout + result.stderr, /expected a JSON object/);
  }
});

test('rejects unknown top-level keys by name without echoing their value', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify({ exa_searchh: GAP_MARKER }));
  const output = result.stdout + result.stderr;

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(output, /exa_searchh/);
  assert.doesNotMatch(output, /sk-gap1-marker/);
});

test('rejects a nested integration string in the git sub-merge by dot-path only', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify({ git: { exa_search: GAP_MARKER } }));
  const output = result.stdout + result.stderr;

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(output, /git\.exa_search/);
  assert.doesNotMatch(output, /sk-gap1-marker/);
});

test('rejects a deeply nested integration string by its full dot-path', (t) => {
  const fixture = seedFixture(t);
  const choices = { agent_skills: { deep: { brave_search: GAP_MARKER } } };

  const result = runNewProject(fixture, JSON.stringify(choices));

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(result.stdout + result.stderr, /agent_skills\.deep\.brave_search/);
});

test('rejects an empty nested integration string', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify({ git: { exa_search: '' } }));

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(result.stdout + result.stderr, /git\.exa_search/);
});

test('valid default plus invalid caller choice leaves defaults and keyfiles untouched', (t) => {
  const fixture = seedFixture(t);
  const { defaultsPath, bytes } = seedGlobalDefaults(fixture, { exa_search: DEFAULT_EXA });

  const result = runNewProject(
    fixture,
    JSON.stringify({ brave_search: 'sk-bad-brave-0123456789' }),
  );

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.equal(fs.existsSync(path.join(fixture.home, '.oto', 'exa_api_key')), false);
  assert.equal(fs.readFileSync(defaultsPath, 'utf8'), bytes);
});

test('caller boolean wins while a hidden legacy default still migrates and heals', (t) => {
  const fixture = seedFixture(t);
  const { homeOto, defaultsPath } = seedGlobalDefaults(fixture, { exa_search: DEFAULT_EXA });

  const result = runNewProject(fixture, JSON.stringify({ exa_search: false }));

  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
  assert.equal(config.exa_search, false);
  const keyfile = path.join(homeOto, 'exa_api_key');
  assert.equal(fs.readFileSync(keyfile, 'utf8'), DEFAULT_EXA + '\n');
  assert.equal(fs.statSync(keyfile).mode & 0o777, 0o600);
  assert.equal(JSON.parse(fs.readFileSync(defaultsPath, 'utf8')).exa_search, true);
  assert.equal(treeContains(fixture.project, DEFAULT_EXA), false);
});

test('accepts documented scalar and workflow-shaping choices', (t) => {
  const profileFixture = seedFixture(t);
  const profileResult = runNewProject(profileFixture, JSON.stringify({ model_profile: 'quality' }));
  assert.equal(profileResult.status, 0, profileResult.stderr);
  const profileConfig = JSON.parse(fs.readFileSync(profileFixture.configPath, 'utf8'));
  assert.equal(profileConfig.model_profile, 'quality');
  assert.equal(typeof profileConfig.exa_search, 'boolean');
  assert.equal(typeof profileConfig.brave_search, 'boolean');
  assert.equal(typeof profileConfig.firecrawl, 'boolean');

  const modeFixture = seedFixture(t);
  const modeResult = runNewProject(
    modeFixture,
    JSON.stringify({ mode: 'yolo', granularity: 'standard' }),
  );
  assert.equal(modeResult.status, 0, modeResult.stderr);
  const modeConfig = JSON.parse(fs.readFileSync(modeFixture.configPath, 'utf8'));
  assert.equal(modeConfig.mode, 'yolo');
  assert.equal(modeConfig.granularity, 'standard');
});

test('retains the top-level booleans-only rejection', (t) => {
  const fixture = seedFixture(t);

  const result = runNewProject(fixture, JSON.stringify({ exa_search: GAP_MARKER }));
  const output = result.stdout + result.stderr;

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(output, /booleans only/);
  assert.doesNotMatch(output, /sk-gap1-marker/);
});

test('malformed JSON uses a fixed parse message without echoing marker bytes', (t) => {
  const fixture = seedFixture(t);
  const malformed = '{bad json "exa_search":"sk-parse-marker-0123456789"';

  const result = runNewProject(fixture, malformed);
  const output = result.stdout + result.stderr;

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(output, /malformed JSON/);
  assert.doesNotMatch(output, /sk-parse-marker/);
});

test('a Phase B keyfile failure compensates every keyfile written earlier in the run', (t) => {
  const fixture = seedFixture(t);
  const { homeOto, defaultsPath, bytes } = seedGlobalDefaults(fixture, {
    exa_search: DEFAULT_EXA,
    brave_search: 'sk-default-brave-0123456789',
  });
  const blockedBraveTarget = path.join(homeOto, 'brave_api_key');
  fs.mkdirSync(blockedBraveTarget);

  const result = runNewProject(fixture);

  assertRejectedWithoutProjectSideEffects(fixture, result);
  assert.match(result.stdout + result.stderr, /keyfile write failed — nothing was written/);
  assert.equal(fs.existsSync(path.join(homeOto, 'exa_api_key')), false);
  assert.equal(fs.statSync(blockedBraveTarget).isDirectory(), true);
  assert.equal(fs.readFileSync(defaultsPath, 'utf8'), bytes);
});
