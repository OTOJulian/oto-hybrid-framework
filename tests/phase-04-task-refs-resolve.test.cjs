'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 Task refs and D-09 retained-agent reference enforcement.
// Will: scan command/workflow subagent_type refs and assert each resolves to a retained agent or generic allowlist item.
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

test('phase-04 task-refs-resolve: every subagent_type points to retained agent or generic allowlist', () => {
  const retained = new Set(retainedAgents.agents);
  const allowlist = new Set(retainedAgents.generic_allowlist);
  const files = walk(path.join(REPO_ROOT, 'oto/commands')).concat(walk(path.join(REPO_ROOT, 'oto/workflows')));

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(SUBAGENT_RE)) {
      const agent = m[1];
      if (allowlist.has(agent)) continue;
      assert.ok(retained.has(agent), `${file}: subagent_type="${agent}" is not in retained set`);
      const agentFile = path.join(REPO_ROOT, 'oto/agents', `${agent}.md`);
      assert.ok(fs.existsSync(agentFile), `${file}: subagent_type="${agent}" but ${agentFile} does not exist`);
    }
  }
});
