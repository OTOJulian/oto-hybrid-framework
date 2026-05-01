'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_SRC = path.join(REPO_ROOT, 'oto/skills');

const { installRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-claude.cjs'));
const { readState } = require(path.join(REPO_ROOT, 'bin/lib/install-state.cjs'));

function sha256(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function makeTempDir(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

function walkFiles(root) {
  assert.ok(fs.existsSync(root), `missing skill source root: ${root}`);
  const out = [];
  function rec(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) rec(absPath);
      else if (entry.isFile()) out.push(absPath);
    }
  }
  rec(root);
  out.sort();
  return out;
}

async function installIntoTemp(t) {
  const configDir = await makeTempDir('oto-test-skills-');
  t.after(() => fs.rmSync(configDir, { recursive: true, force: true }));
  await installRuntime(adapter, {
    repoRoot: REPO_ROOT,
    flags: { configDir },
  });
  return configDir;
}

test('phase-06 D-08: installer copies all skill files byte-identically', async (t) => {
  const configDir = await installIntoTemp(t);
  const files = walkFiles(SKILLS_SRC);
  assert.ok(files.length > 0, 'expected at least one skill file');
  for (const srcAbs of files) {
    const relPath = path.relative(SKILLS_SRC, srcAbs);
    const dstAbs = path.join(configDir, 'skills', relPath);
    assert.equal(sha256(dstAbs), sha256(srcAbs), `sha256 mismatch for ${relPath}`);
  }
});

test('phase-06 D-08: find-polluter.sh exec bit preserved (Pitfall C)', async (t) => {
  const configDir = await installIntoTemp(t);
  const mode = fs.statSync(path.join(configDir, 'skills/systematic-debugging/find-polluter.sh')).mode;
  assert.notEqual(mode & 0o111, 0, 'find-polluter.sh lost executable bit (mode-644 trap)');
});

test('phase-06 D-08: install-state JSON records every skill file with sha256', async (t) => {
  const configDir = await installIntoTemp(t);
  const state = readState(path.join(configDir, 'oto/.install.json'));
  assert.notEqual(state, null);

  const skillEntries = state.files.filter((entry) => entry.path.startsWith('skills/'));
  const expected = walkFiles(SKILLS_SRC).map((absPath) => (
    'skills/' + path.relative(SKILLS_SRC, absPath).split(path.sep).join('/')
  ));
  assert.equal(skillEntries.length, expected.length);

  const byPath = new Map(skillEntries.map((entry) => [entry.path.split(path.sep).join('/'), entry]));
  for (const expectedPath of expected) {
    const entry = byPath.get(expectedPath);
    assert.ok(entry, `missing install-state skill entry: ${expectedPath}`);
    assert.equal(entry.sha256, sha256(path.join(SKILLS_SRC, expectedPath.slice('skills/'.length))));
  }
});
