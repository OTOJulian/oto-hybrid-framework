'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  convertClaudeAgentToCodexAgent,
  generateCodexAgentToml,
} = require('../bin/lib/codex-transform.cjs');
const { convertClaudeToGeminiAgent } = require('../bin/lib/gemini-transform.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const REFERENCES_ROOT = path.join(REPO_ROOT, 'oto/references');

// VERIFIED against the exa-mcp-server@3.2.1 bundle (15-RESEARCH.md)
const DEPRECATED = [
  'crawling_exa',
  'get_code_context_exa',
  'deep_researcher_start',
  'deep_researcher_check',
  'company_research_exa',
  'linkedin_search_exa',
  'deep_search_exa',
  'people_search_exa',
];

const AGENTS = [
  'oto-phase-researcher',
  'oto-project-researcher',
  'oto-ui-researcher',
  'oto-debugger',
  'oto-advisor-researcher',
];

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: '', body: content };
  return {
    frontmatter: match[1],
    body: content.slice(match[0].length),
  };
}

function markdownFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}

const outputsByAgent = new Map();

for (const name of AGENTS) {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'oto/agents', `${name}.md`), 'utf8');
  const outputs = {
    source: src,
    'codex-md': convertClaudeAgentToCodexAgent(src),
    'codex-toml': generateCodexAgentToml(name, src),
    'gemini-md': convertClaudeToGeminiAgent(src),
  };
  outputsByAgent.set(name, outputs);

  for (const [label, output] of Object.entries(outputs)) {
    test(`GUID-04 ${name} ${label}: no deprecated Exa tool names`, () => {
      for (const deprecated of DEPRECATED) {
        assert.equal(output.includes(deprecated), false, `${deprecated} found in ${name} ${label}`);
      }
    });
  }

  test(`GUID-05 ${name} gemini frontmatter: no Claude MCP namespace`, () => {
    const { frontmatter } = splitFrontmatter(outputs['gemini-md']);
    assert.equal(frontmatter.includes('mcp__'), false);
  });

  test(`GUID-05 ${name} gemini body: no Claude Exa namespace`, () => {
    const { body } = splitFrontmatter(outputs['gemini-md']);
    assert.equal(body.includes('mcp__exa__'), false);
  });
}

for (const name of ['oto-debugger', 'oto-advisor-researcher']) {
  test(`GUID-05 ${name} codex markdown preserves Exa tool access`, () => {
    assert.match(outputsByAgent.get(name)['codex-md'], /^tools:.*mcp__exa__\*/m);
  });
}

test('GUID-04 shipped references contain no deprecated Exa tool names', () => {
  for (const filePath of markdownFiles(REFERENCES_ROOT)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const deprecated of DEPRECATED) {
      assert.equal(content.includes(deprecated), false, `${deprecated} found in ${path.relative(REPO_ROOT, filePath)}`);
    }
  }
});

test('GUID-05 shared search reference contains no runtime-specific MCP namespace', () => {
  const content = fs.readFileSync(path.join(REFERENCES_ROOT, 'search-tools.md'), 'utf8');
  assert.equal(content.includes('mcp__'), false);
});
