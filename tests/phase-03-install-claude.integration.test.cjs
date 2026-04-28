'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { OPEN_MARKER, CLOSE_MARKER } = require('../bin/lib/marker.cjs');

const REPO_ROOT = path.join(__dirname, '..');
const adapter = require(path.join(REPO_ROOT, 'bin/lib/runtime-claude.cjs'));
const { installRuntime, uninstallRuntime } = require(path.join(REPO_ROOT, 'bin/lib/install.cjs'));

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-test-'));
  t.after(() => {
    fs.rmSync(d, { recursive: true, force: true });
  });
  return d;
}

function installOpts(configDir) {
  return { flags: { configDir, runtimes: ['claude'] }, repoRoot: REPO_ROOT };
}

async function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.lstatSync(root);
  if (stat.isFile()) return [root];
  if (!stat.isDirectory()) return [];

  const out = [];
  async function rec(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await rec(absPath);
      } else if (entry.isFile()) {
        out.push(absPath);
      }
    }
  }
  await rec(root);
  return out;
}

function countOpenMarkers(content) {
  return (content.match(new RegExp(OPEN_MARKER, 'g')) || []).length;
}

test('INS-04 / INS-05: install --claude into tmpdir creates <configDir>/oto/.install.json', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const statePath = path.join(configDir, 'oto', '.install.json');
  assert.ok(fs.existsSync(statePath));
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.equal(state.runtime, 'claude');
  assert.equal(state.config_dir, configDir);
  assert.ok(Array.isArray(state.files));
});

test('INS-04: install --claude injects <!-- OTO Configuration --> ... <!-- /OTO Configuration --> block into CLAUDE.md', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  const content = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  const openIdx = content.indexOf(OPEN_MARKER);
  const closeIdx = content.indexOf(CLOSE_MARKER);
  assert.notEqual(openIdx, -1);
  assert.notEqual(closeIdx, -1);
  assert.ok(openIdx < closeIdx);
});

test('INS-04: install preserves pre-existing user content in CLAUDE.md byte-for-byte outside marker block', async (t) => {
  const configDir = tmpDir(t);
  const userContent = '# My Notes\n\nMy own personal notes that must survive.\n';
  fs.writeFileSync(path.join(configDir, 'CLAUDE.md'), userContent);

  await installRuntime(adapter, installOpts(configDir));

  const content = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  assert.match(content, /My own personal notes/);
  assert.ok(content.includes(OPEN_MARKER));
  assert.ok(content.startsWith(userContent.trimEnd() + '\n\n'));
});

test('INS-04: re-install over existing install produces byte-identical state.files[] (modulo installed_at)', async (t) => {
  const configDir = tmpDir(t);
  const statePath = path.join(configDir, 'oto', '.install.json');

  await installRuntime(adapter, installOpts(configDir));
  const s1 = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  await installRuntime(adapter, installOpts(configDir));
  const s2 = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  assert.deepEqual(s1.files, s2.files);
});

test('INS-04: re-install does NOT duplicate marker block (exactly one open marker present)', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));
  await installRuntime(adapter, installOpts(configDir));

  const content = fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8');
  assert.equal(countOpenMarkers(content), 1);
});

test('INS-04: uninstall --claude removes <configDir>/oto/ subdir entirely', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));
  await uninstallRuntime(adapter, installOpts(configDir));

  assert.equal(fs.existsSync(path.join(configDir, 'oto')), false);
});

test('INS-04: uninstall restores CLAUDE.md to pre-install user content (block stripped, surrounding text intact)', async (t) => {
  const configDir = tmpDir(t);
  const userContent = '# My Notes\n\nMy own personal notes that must survive.\n';
  fs.writeFileSync(path.join(configDir, 'CLAUDE.md'), userContent);

  await installRuntime(adapter, installOpts(configDir));
  await uninstallRuntime(adapter, installOpts(configDir));

  assert.equal(fs.readFileSync(path.join(configDir, 'CLAUDE.md'), 'utf8').trim(), userContent.trim());
});

test('INS-04: uninstall rejects state instruction_file.path traversal before touching outside files', async (t) => {
  const configDir = tmpDir(t);
  const outsidePath = path.join(path.dirname(configDir), 'outside.md');
  const outsideContent = [
    'outside before',
    OPEN_MARKER,
    'must remain',
    CLOSE_MARKER,
    'outside after',
    '',
  ].join('\n');
  fs.writeFileSync(outsidePath, outsideContent);
  t.after(() => fs.rmSync(outsidePath, { force: true }));

  await installRuntime(adapter, installOpts(configDir));

  const statePath = path.join(configDir, 'oto', '.install.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.instruction_file.path = '../outside.md';
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

  await assert.rejects(
    () => uninstallRuntime(adapter, installOpts(configDir)),
    /state file invalid: state\.instruction_file\.path must be relative to configDir/,
  );
  assert.equal(fs.readFileSync(outsidePath, 'utf8'), outsideContent);
});

test('INS-04: copied files are regular files, not symlinks (lstat().isSymbolicLink() === false)', async (t) => {
  const configDir = tmpDir(t);

  await installRuntime(adapter, installOpts(configDir));

  // Phase 3 has no payload yet, so an empty file set is valid; future payload files must be regular files.
  for (const subdir of Object.values(adapter.targetSubdirs)) {
    const files = await walkFiles(path.join(configDir, subdir));
    for (const file of files) {
      assert.equal(fs.lstatSync(file).isSymbolicLink(), false, `${file} should be a regular file`);
    }
  }
});

test('INS-05: success message matches /^installed: claude — \\d+ files copied, marker injected, state at .+\\.install\\.json$/', async (t) => {
  const configDir = tmpDir(t);
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(String(msg));
  t.after(() => {
    console.log = originalLog;
  });

  await installRuntime(adapter, installOpts(configDir));

  assert.match(logs.join('\n'), /^installed: claude — \d+ files copied, marker injected, state at .+\.install\.json$/);
});
