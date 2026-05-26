const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = join(__dirname, '..');
const representativeWorkflows = [
  'oto/workflows/execute-phase.md',
  'oto/workflows/autonomous.md',
];
const readOnlyKeys = ['config-get', 'resolve-model', 'agent-skills'];
const guardNeedle = 'command -v oto-sdk >/dev/null 2>&1';
const fallbackPattern = /2>\/dev\/null\s*(?:\|\|\s*echo|\|\s*jq|\|\|\s*true)/;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linesWithCommandSubstitution(file, key) {
  const content = readFileSync(join(repoRoot, file), 'utf8');
  return content
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.includes('$(') && line.includes(`oto-sdk query ${key}`));
}

describe('SDK fallback policy', () => {
  it('documents the structural hard-require guard and read-only fallback tier', () => {
    const docPath = join(repoRoot, 'oto/workflows/lib/sdk-require.md');
    assert.equal(existsSync(docPath), true);
    const doc = readFileSync(docPath, 'utf8');

    assert.match(doc, /command -v oto-sdk/);
    assert.match(doc, /2>\/dev\/null \|\| echo/);
    assert.match(doc, /config-get/);
    assert.match(doc, /resolve-model/);
    assert.match(doc, /agent-skills/);
  });

  it('guards representative structural workflows before stateful SDK use', () => {
    for (const file of representativeWorkflows) {
      const content = readFileSync(join(repoRoot, file), 'utf8');
      assert.match(content, new RegExp(escapeRegExp(guardNeedle)), file);
    }
  });

  it('keeps representative read-only command substitutions on the degradation idiom', () => {
    for (const file of representativeWorkflows) {
      for (const key of readOnlyKeys) {
        for (const { line, lineNumber } of linesWithCommandSubstitution(file, key)) {
          assert.match(line, fallbackPattern, `${file}:${lineNumber} ${key} lacks read-only fallback`);
        }
      }
    }
  });
});
