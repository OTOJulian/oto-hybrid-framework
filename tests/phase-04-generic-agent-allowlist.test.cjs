'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: D-10 generic-agent allowlist enforcement.
// Will: scan command/workflow generic subagent_type values and allow only explicit fixture entries.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const retainedAgents = require('./fixtures/phase-04/retained-agents.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUBAGENT_RE = /subagent_type\s*[:=]\s*["']([a-zA-Z0-9_-]+)["']/g;

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

test('phase-04 generic-agent-allowlist: every non-retained subagent_type is in the allowlist', () => {
  const allowlist = new Set(retainedAgents.generic_allowlist);
  const retained = new Set(retainedAgents.agents);
  const files = walk(path.join(REPO_ROOT, 'oto/commands'), '.md')
    .concat(walk(path.join(REPO_ROOT, 'oto/workflows'), '.md'));

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(SUBAGENT_RE)) {
      const agent = m[1];
      if (retained.has(agent)) continue;
      assert.ok(
        allowlist.has(agent),
        `${file}: subagent_type="${agent}" is neither retained nor in generic allowlist`,
      );
    }
  }
});
