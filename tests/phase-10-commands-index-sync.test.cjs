'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(REPO_ROOT, 'oto/commands/INDEX.md');
const SCRIPT = path.join(REPO_ROOT, 'scripts/gen-commands-index.cjs');

test('DOC-06: gen-commands-index.cjs --check exits 0', (t) => {
  if (!fs.existsSync(INDEX)) {
    t.todo('Wave 1 must commit oto/commands/INDEX.md');
    return;
  }

  const result = spawnSync(process.execPath, [SCRIPT, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
