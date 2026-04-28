'use strict';

const path = require('node:path');

module.exports = {
  name: 'codex',
  configDirEnvVar: 'CODEX_HOME',
  defaultConfigDirSegment: '.codex',
  instructionFilename: 'AGENTS.md',
  settingsFilename: 'config.toml',
  settingsFormat: 'toml',
  sourceDirs: {
    commands: 'oto/commands',
    agents: 'oto/agents',
    skills: 'oto/skills',
    hooks: 'oto/hooks/dist',
  },
  targetSubdirs: {
    commands: 'commands',
    agents: 'agents',
    skills: 'skills',
    hooks: 'hooks',
  },

  renderInstructionBlock(ctx) {
    return `<!-- managed by oto v${ctx.otoVersion} — do not edit between markers -->\n` +
      `## oto (Codex)\n\n` +
      `oto v${ctx.otoVersion} is installed for Codex. Run \`/oto-help\` for the command list.\n` +
      `Note: Codex runtime support is best-effort until Phase 8.\n` +
      `Repo: https://github.com/OTOJulian/oto-hybrid-framework`;
  },
  transformCommand: (content, meta) => content,
  // TODO Phase 8: Codex frontmatter parity (convertClaudeAgentToCodexAgent equivalent)
  transformAgent: (content, meta) => content,
  transformSkill: (content, meta) => content,
  // TODO Phase 5: real TOML manipulation via bin/lib/codex-toml.cjs
  mergeSettings: (existingText, otoBlock) => existingText,
  onPreInstall(ctx) {
    const { findUpstreamMarkers } = require('./marker.cjs');
    const found = findUpstreamMarkers(path.join(ctx.configDir, 'AGENTS.md'));
    for (const upstream of found) {
      process.stderr.write(
        `oto: upstream ${upstream} configuration block detected in ${ctx.configDir}/AGENTS.md; ` +
          `oto installs alongside but does not migrate — remove manually if conflicts arise\n`
      );
    }
  },
  onPostInstall(ctx) {
    console.log(`installed: ${ctx.runtime} — ${ctx.filesCopied} files copied, marker injected, state at ${ctx.statePath}`);
  },
};
