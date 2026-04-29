'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: D-13, D-14, D-15, and D-16 path-like .planning leak enforcement.
// Will: scan shipped payload roots only and reject path-like .planning references.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PLANNING_LEAK_RE = /(?<![A-Za-z0-9_])\.planning(?=\/|["'`)\s$]|$)/g;
const SHIPPED_DIRS = [
  'oto/commands',
  'oto/agents',
  'oto/workflows',
  'oto/contexts',
  'oto/templates',
  'oto/references',
  'oto/skills',
  'oto/hooks',
  'bin',
  'hooks',
];

function walk(dir, ext = '.md', extras = []) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const allowed = new Set([ext, ...extras]);
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
      } else if (entry.isFile() && allowed.has(path.extname(p))) {
        out.push(p);
      }
    }
  }
  return out.sort();
}

test('phase-04 planning-leak: zero path-like .planning references in shipped payload', () => {
  for (const subdir of SHIPPED_DIRS) {
    const dir = path.join(REPO_ROOT, subdir);
    for (const file of walk(dir, '.md', ['.cjs', '.js', '.json'])) {
      const text = fs.readFileSync(file, 'utf8');
      const matches = [...text.matchAll(PLANNING_LEAK_RE)];
      assert.equal(
        matches.length,
        0,
        `${file}: ${matches.length} path-like .planning leaks: ${matches.map((m) => m[0]).join(', ')}`,
      );
    }
  }
});
