'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADR_PATH = path.join(__dirname, '..', 'decisions', 'ADR-16-exa-mcp-transport.md');
const content = fs.readFileSync(ADR_PATH, 'utf8');

test('ADR-16 Exa MCP transport decision exists', () => {
  assert.ok(fs.existsSync(ADR_PATH), `Expected ${ADR_PATH} to exist`);
});

test('ADR-16 pins launcher transport, server version, and three-tool surface', () => {
  assert.match(content, /launcher-stdio/);
  assert.match(content, /exa-mcp-server@3\.2\.1/);
  assert.match(content, /tools=web_search_exa,web_fetch_exa,web_search_advanced_exa/);
});

test('ADR-16 records the remote HTTP alternative and deferral', () => {
  assert.match(content, /https:\/\/mcp\.exa\.ai\/mcp/);
  assert.match(content, /EXA-F-01/);
});

test('ADR-16 implements the complete Phase 15 decision set', () => {
  assert.match(content, /Implements: D-01, D-02, D-03, D-04, D-15/);
});
