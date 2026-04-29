'use strict';
// Phase 4 Wave 0 scaffold - implemented in Wave 3 (plan 04-07).
// Covers: AGT-03 frontmatter validation.
// Will: walk oto/agents/oto-*.md, parse frontmatter, and assert name/description keys are valid.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const body = text.slice(4, end);
  const out = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

test('phase-04 frontmatter-schema: every retained agent has required keys and matching name', () => {
  const dir = path.join(REPO_ROOT, 'oto/agents');
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('oto-') && f.endsWith('.md')).sort();
  assert.equal(files.length, 23, `expected 23 retained agents, got ${files.length}`);
  for (const f of files) {
    const full = path.join(dir, f);
    const fm = parseFrontmatter(fs.readFileSync(full, 'utf8'));
    assert.ok(fm, `${f}: frontmatter missing or malformed`);
    assert.ok('name' in fm, `${f}: missing 'name' key`);
    assert.ok('description' in fm, `${f}: missing 'description' key`);
    assert.ok('tools' in fm, `${f}: missing 'tools' key (empty value is OK per Pitfall 8)`);
    const expectedName = f.replace(/\.md$/, '');
    assert.equal(fm.name, expectedName, `${f}: name="${fm.name}" should be "${expectedName}"`);
  }
});
