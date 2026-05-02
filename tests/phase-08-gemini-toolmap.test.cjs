'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  claudeToGeminiTools,
  convertGeminiHookEventName,
  convertGeminiMatcher,
  convertGeminiToolName,
} = require('../bin/lib/gemini-transform.cjs');

test('D-13 convertGeminiToolName: every entry in claudeToGeminiTools map', () => {
  for (const [claudeName, geminiName] of Object.entries(claudeToGeminiTools)) {
    assert.equal(convertGeminiToolName(claudeName), geminiName);
  }
});

test('D-13 convertGeminiToolName: mcp__* prefix returns null', () => {
  assert.equal(convertGeminiToolName('mcp__server__tool'), null);
  assert.equal(convertGeminiToolName('mcp__'), null);
});

test('D-13 convertGeminiToolName: Task returns null', () => {
  assert.equal(convertGeminiToolName('Task'), null);
});

test('D-13 convertGeminiToolName: unknown tool falls back to lowercase', () => {
  assert.equal(convertGeminiToolName('MultiEdit'), 'multiedit');
  assert.equal(convertGeminiToolName('Agent'), 'agent');
});

test('D-16 Gemini hook event and matcher conversion uses Gemini-native names', () => {
  assert.equal(convertGeminiHookEventName('PreToolUse'), 'BeforeTool');
  assert.equal(convertGeminiHookEventName('PostToolUse'), 'AfterTool');
  assert.equal(convertGeminiHookEventName('Stop'), 'SessionEnd');
  assert.equal(convertGeminiHookEventName('statusLine'), null);
  assert.equal(convertGeminiMatcher('Bash|Edit|Write|Task'), 'run_shell_command|replace|write_file');
});
