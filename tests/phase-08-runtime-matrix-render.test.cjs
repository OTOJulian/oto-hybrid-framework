'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderMatrix, scanCommands } = require('../bin/lib/runtime-matrix.cjs');
const { claudeToGeminiTools } = require('../bin/lib/gemini-transform.cjs');
const claude = require('../bin/lib/runtime-claude.cjs');
const codex = require('../bin/lib/runtime-codex.cjs');
const gemini = require('../bin/lib/runtime-gemini.cjs');
const { version: OTO_VERSION } = require('../package.json');

const REPO_ROOT = path.resolve(__dirname, '..');

function renderForTest() {
  return renderMatrix({
    otoVersion: OTO_VERSION,
    adapters: { claude, codex, gemini },
    claudeToGeminiTools,
    agentSandboxes: codex.agentSandboxes,
    commands: scanCommands(REPO_ROOT),
  });
}

test('D-05 regen-diff: in-memory render byte-equals committed decisions/runtime-tool-matrix.md', () => {
  const rendered = renderForTest();
  const committed = fs.readFileSync(path.join(REPO_ROOT, 'decisions/runtime-tool-matrix.md'), 'utf8');
  assert.strictEqual(
    rendered,
    committed,
    'runtime-tool-matrix.md drift: run node scripts/render-runtime-matrix.cjs',
  );
});

test('D-08 matrix-vs-code: Claude to Gemini map column matches convertGeminiToolName table byte-for-byte', () => {
  const rendered = renderForTest();
  for (const [claudeName, geminiName] of Object.entries(claudeToGeminiTools).sort(([a], [b]) => a.localeCompare(b))) {
    assert.ok(
      rendered.includes(`| ${claudeName} | native | ${geminiName} |`),
      `expected exact tool map row for ${claudeName}`,
    );
  }
});

test('D-08 matrix-vs-code: Codex sandbox column matches runtime-codex.cjs::agentSandboxes byte-for-byte', () => {
  const rendered = renderForTest();
  for (const [agentName, mode] of Object.entries(codex.agentSandboxes).sort(([a], [b]) => a.localeCompare(b))) {
    assert.ok(
      rendered.includes(`| ${agentName} | ${mode} |`),
      `expected exact sandbox row for ${agentName}`,
    );
  }
});

test('D-09 per-command runtime support: Codex column 100% green', () => {
  const commands = scanCommands(REPO_ROOT);
  assert.ok(commands.length > 0, 'expected at least one command');
  assert.ok(commands.some((command) => command.name === '/oto-progress'), 'expected /oto-progress row');
  for (const command of commands) {
    assert.equal(command.runtimeSupport.codex, true, `Codex support missing for ${command.name}`);
  }
});

test('D-09 per-command runtime support: Gemini column 100% green', () => {
  const commands = scanCommands(REPO_ROOT);
  assert.ok(commands.length > 0, 'expected at least one command');
  for (const command of commands) {
    assert.equal(command.runtimeSupport.gemini, true, `Gemini support missing for ${command.name}`);
  }
});
