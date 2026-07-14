'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const launcherPath = path.resolve(__dirname, '../oto/hooks/oto-exa-mcp.js');
const { resolveKey, buildSpawnCommand } = require('../oto/hooks/oto-exa-mcp.js');

function makeTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-exa-launcher-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeKey(dir, content) {
  fs.writeFileSync(path.join(dir, 'exa_api_key'), content);
}

test('buildSpawnCommand pins the server and exact three-tool surface', () => {
  assert.deepEqual(buildSpawnCommand().args, [
    '-y',
    'exa-mcp-server@3.2.1',
    'tools=web_search_exa,web_fetch_exa,web_search_advanced_exa',
  ]);
});

test('resolveKey gives a trimmed environment key precedence over the keyfile', (t) => {
  const dir = makeTempDir(t);
  writeKey(dir, 'keyfile-secret\n');

  assert.equal(resolveKey({ env: { EXA_API_KEY: '  env-secret  ' }, keyfileDir: dir }), 'env-secret');
});

test('resolveKey ignores whitespace-only environment values and honors OTO_KEYFILE_DIR', (t) => {
  const dir = makeTempDir(t);
  writeKey(dir, '  keyfile-secret  \n');

  assert.equal(resolveKey({ env: { EXA_API_KEY: '  ', OTO_KEYFILE_DIR: dir } }), 'keyfile-secret');
});

test('resolveKey returns null for empty and whitespace-only keyfiles', (t) => {
  const emptyDir = makeTempDir(t);
  const whitespaceDir = makeTempDir(t);
  writeKey(emptyDir, '');
  writeKey(whitespaceDir, ' \n\t ');

  assert.equal(resolveKey({ env: {}, keyfileDir: emptyDir }), null);
  assert.equal(resolveKey({ env: {}, keyfileDir: whitespaceDir }), null);
});

test('resolveKey follows a symlink to a regular non-empty file', (t) => {
  const dir = makeTempDir(t);
  const target = path.join(dir, 'managed-secret');
  fs.writeFileSync(target, '  symlink-secret\n');
  fs.symlinkSync(target, path.join(dir, 'exa_api_key'));

  assert.equal(resolveKey({ env: {}, keyfileDir: dir }), 'symlink-secret');
});

test('resolveKey rejects symlinks to directories and dangling targets', (t) => {
  const directoryLinkRoot = makeTempDir(t);
  const targetDir = path.join(directoryLinkRoot, 'target-dir');
  fs.mkdirSync(targetDir);
  fs.symlinkSync(targetDir, path.join(directoryLinkRoot, 'exa_api_key'));

  const danglingRoot = makeTempDir(t);
  fs.symlinkSync(path.join(danglingRoot, 'missing'), path.join(danglingRoot, 'exa_api_key'));

  assert.equal(resolveKey({ env: {}, keyfileDir: directoryLinkRoot }), null);
  assert.equal(resolveKey({ env: {}, keyfileDir: danglingRoot }), null);
});

test('spawn arguments never contain resolved key bytes', (t) => {
  const dir = makeTempDir(t);
  const key = 'unique-secret-never-in-argv';
  writeKey(dir, key);

  assert.equal(resolveKey({ env: {}, keyfileDir: dir }), key);
  assert.equal(JSON.stringify(buildSpawnCommand().args).includes(key), false);
});

test('launcher exits once with status 1 and does not spawn npx when no key is usable', (t) => {
  const emptyDir = makeTempDir(t);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [launcherPath], {
    env: { PATH: process.env.PATH, OTO_KEYFILE_DIR: emptyDir },
    encoding: 'utf8',
    timeout: 5000,
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'oto-exa-mcp: no Exa API key (EXA_API_KEY or ~/.oto/exa_api_key) — run /oto-settings-integrations\n');
  assert.ok(elapsedMs < 5000, `launcher took ${elapsedMs}ms`);
});
