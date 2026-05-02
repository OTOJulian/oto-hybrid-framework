'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderMatrix, scanCommands } = require('../bin/lib/runtime-matrix.cjs');
const { claudeToGeminiTools } = require('../bin/lib/gemini-transform.cjs');
const claude = require('../bin/lib/runtime-claude.cjs');
const codex = require('../bin/lib/runtime-codex.cjs');
const gemini = require('../bin/lib/runtime-gemini.cjs');
const { version: OTO_VERSION } = require('../package.json');

const repoRoot = path.resolve(__dirname, '..');
const out = renderMatrix({
  otoVersion: OTO_VERSION,
  adapters: { claude, codex, gemini },
  claudeToGeminiTools,
  agentSandboxes: codex.agentSandboxes,
  commands: scanCommands(repoRoot),
});

const target = path.join(repoRoot, 'decisions', 'runtime-tool-matrix.md');
fs.writeFileSync(target, out);
process.stdout.write(`wrote ${target} (${out.length} bytes)\n`);
