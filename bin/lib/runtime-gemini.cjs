'use strict';

const path = require('node:path');

module.exports = {
  name: 'gemini',
  configDirEnvVar: 'GEMINI_CONFIG_DIR',
  defaultConfigDirSegment: '.gemini',
  instructionFilename: 'GEMINI.md',
  settingsFilename: 'settings.json',
  settingsFormat: 'json',
  sourceDirs: {
    commands: 'oto/commands',
    agents: 'oto/agents',
    skills: 'oto/skills',
    hooks: 'oto/hooks/dist',
    workflows: 'oto/workflows',
    references: 'oto/references',
    templates: 'oto/templates',
    contexts: 'oto/contexts',
  },
  targetSubdirs: {
    commands: 'commands',
    agents: 'agents',
    skills: 'skills',
    hooks: 'hooks',
    workflows: 'oto/workflows',
    references: 'oto/references',
    templates: 'oto/templates',
    contexts: 'oto/contexts',
  },

  renderInstructionBlock(ctx) {
    return `<!-- managed by oto v${ctx.otoVersion} — do not edit between markers -->\n` +
      `## oto (Gemini)\n\n` +
      `oto v${ctx.otoVersion} is installed for Gemini CLI. Run \`/oto-help\` for the command list.\n` +
      `Note: Gemini runtime support is best-effort until Phase 8.\n` +
      `Repo: https://github.com/OTOJulian/oto-hybrid-framework`;
  },
  // TODO Phase 8: Gemini command transform
  transformCommand: (content, meta) => content,
  // TODO Phase 8: Gemini tool-name remap parity (convertClaudeToGeminiTools equivalent)
  transformAgent: (content, meta) => content,
  transformSkill: (content, meta) => content,
  // TODO Phase 5: Gemini settings.json merge
  mergeSettings: (existingText, otoBlock) => existingText,
  onPreInstall(ctx) {
    const { findUpstreamMarkers } = require('./marker.cjs');
    const found = findUpstreamMarkers(path.join(ctx.configDir, 'GEMINI.md'));
    for (const upstream of found) {
      process.stderr.write(
        `oto: upstream ${upstream} configuration block detected in ${ctx.configDir}/GEMINI.md; ` +
          `oto installs alongside but does not migrate — remove manually if conflicts arise\n`
      );
    }
  },
  onPostInstall(ctx) {
    console.log(`installed: ${ctx.runtime} — ${ctx.filesCopied} files copied, marker injected, state at ${ctx.statePath}`);
  },
};
