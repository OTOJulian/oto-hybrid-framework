'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 no-dropped enforcement and D-09.
// Will: scan shipped payload roots and assert dropped-agent substrings from the retained-agents fixture are absent.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHIPPED_DIRS = [
  'oto/commands',
  'oto/agents',
  'oto/workflows',
  'oto/contexts',
  'oto/templates',
  'oto/references',
  'bin',
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

test('phase-04 no-dropped-agents: zero substring matches in shipped payload', () => {
  for (const dropped of retainedAgents.dropped_agents_for_leak_test) {
    for (const subdir of SHIPPED_DIRS) {
      const dir = path.join(REPO_ROOT, subdir);
      for (const file of walk(dir, '.md', ['.cjs', '.js'])) {
        const text = fs.readFileSync(file, 'utf8');
        assert.ok(!text.includes(dropped), `${file} contains dropped agent substring "${dropped}"`);
      }
    }
  }
});
