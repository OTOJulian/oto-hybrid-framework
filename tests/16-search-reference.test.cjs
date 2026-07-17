'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const REFERENCE_PATH = path.join(REPO_ROOT, 'oto/references/search-tools.md');

test('shared search reference defines the runtime-neutral fallback contract', () => {
  assert.equal(fs.existsSync(REFERENCE_PATH), true, 'search-tools reference must exist');

  const content = fs.readFileSync(REFERENCE_PATH, 'utf8');
  for (const tool of ['web_search_exa', 'web_fetch_exa', 'web_search_advanced_exa']) {
    assert.match(content, new RegExp(`\\b${tool}\\b`), `${tool} must be documented`);
  }

  assert.match(content, /Never retry Exa after a rate-limit error/);
  assert.match(content, /429/);
  assert.match(content, /oto-sdk query websearch/);
  assert.match(content, /tool-not-found/);
  assert.equal(content.includes('mcp__'), false, 'reference must not contain runtime-specific MCP namespaces');

  const exaIndex = content.indexOf('Exa semantic search');
  const braveIndex = content.indexOf('Brave web search');
  const builtInIndex = content.indexOf('Built-in web search');
  assert.ok(exaIndex >= 0, 'Exa rung must exist');
  assert.ok(braveIndex > exaIndex, 'Brave rung must follow Exa');
  assert.ok(builtInIndex > braveIndex, 'built-in rung must follow Brave');
});

test('all Exa-enabled agents consume the shared search reference without drifted guidance', () => {
  for (const name of [
    'oto-phase-researcher',
    'oto-project-researcher',
    'oto-ui-researcher',
    'oto-debugger',
    'oto-advisor-researcher',
  ]) {
    const agentPath = path.join(REPO_ROOT, 'oto/agents', `${name}.md`);
    const content = fs.readFileSync(agentPath, 'utf8');

    assert.match(content, /@~\/\.claude\/oto\/references\/search-tools\.md/, `${name} must include the shared reference`);
    assert.equal(content.includes('Enhanced Web Search (Brave API)'), false, `${name} must not retain Brave guidance`);
    assert.equal(content.includes('Exa Semantic Search (MCP)'), false, `${name} must not retain Exa guidance`);
    assert.equal(content.includes('Firecrawl Deep Scraping (MCP)'), false, `${name} must not retain Firecrawl guidance`);
    assert.equal(content.includes('mcp__exa__web_search_exa'), false, `${name} must not retain the Exa namespace`);
    assert.equal(content.includes('Check `exa_search`'), false, `${name} must not retain the Exa availability gate`);
    assert.equal(content.includes('Check `brave_search`'), false, `${name} must not retain the Brave availability gate`);

    if (name === 'oto-debugger' || name === 'oto-advisor-researcher') {
      assert.match(content, /^tools:.*mcp__exa__\*/m, `${name} must grant the Exa server wildcard`);
    }
  }
});
