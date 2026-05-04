'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '.github', 'workflows');
const SHA_RE = /uses:\s+([^@\s]+)@([^\s#]+)/g;

test('CI-10: every non-local workflow action is pinned by 40-char SHA', () => {
  if (!fs.existsSync(WORKFLOWS_DIR)) return;

  for (const file of fs.readdirSync(WORKFLOWS_DIR).filter((entry) => /\.ya?ml$/.test(entry)).sort()) {
    const body = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
    for (const [, action, ref] of body.matchAll(SHA_RE)) {
      if (action.startsWith('./')) continue;
      assert.match(ref, /^[0-9a-f]{40}$/, `${file}: ${action}@${ref} is not pinned to a 40-char SHA`);
    }
  }
});
