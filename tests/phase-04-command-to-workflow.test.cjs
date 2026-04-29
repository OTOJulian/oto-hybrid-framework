'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: D-12 command-to-workflow resolution.
// Will: parse command @-includes and assert each referenced workflow file resolves under oto/.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INCLUDE_RE = /^\s*(?:-\s*)?@([^\s)]+\.md)(?:\s.*)?$/gm;

function walk(dir, ext = '.md') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
      } else if (entry.isFile() && p.endsWith(ext)) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

test('phase-04 command-to-workflow: every @-included workflow path resolves', () => {
  for (const file of walk(path.join(REPO_ROOT, 'oto/commands'), '.md')) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(INCLUDE_RE)) {
      const ref = m[1];
      const idx = ref.lastIndexOf('workflows/');
      if (idx === -1) continue;
      const rel = 'oto/' + ref.slice(idx);
      assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${file}: @-include ${ref} resolves to missing ${rel}`);
    }
  }
});
