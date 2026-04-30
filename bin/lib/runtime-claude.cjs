'use strict';

const path = require('node:path');

module.exports = {
  name: 'claude',
  configDirEnvVar: 'CLAUDE_CONFIG_DIR',
  defaultConfigDirSegment: '.claude',
  instructionFilename: 'CLAUDE.md',
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
      `## oto\n\n` +
      `oto v${ctx.otoVersion} is installed for Claude Code. Run \`/oto-help\` for the command list.\n` +
      `Repo: https://github.com/OTOJulian/oto-hybrid-framework`;
  },
  transformCommand: (content, meta) => content,
  transformAgent: (content, meta) => content,
  transformSkill: (content, meta) => content,
  // Phase 3: identity (Phase 5 fills SessionStart hook registration in settings.json)
  mergeSettings: (existingText, otoBlock) => existingText,
  onPreInstall(ctx) {
    const { findUpstreamMarkers } = require('./marker.cjs');
    const found = findUpstreamMarkers(path.join(ctx.configDir, 'CLAUDE.md'));
    for (const upstream of found) {
      process.stderr.write(
        `oto: upstream ${upstream} configuration block detected in ${ctx.configDir}/CLAUDE.md; ` +
          `oto installs alongside but does not migrate — remove manually if conflicts arise\n`
      );
    }
  },
  onPostInstall(ctx) {
    console.log(`installed: ${ctx.runtime} — ${ctx.filesCopied} files copied, marker injected, state at ${ctx.statePath}`);
  },
};
