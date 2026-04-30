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
  // AGT-04: Codex sandbox mode per retained agent.
  // 11 entries pass through from upstream foundation-frameworks/get-shit-done-main/bin/install.js:26-38
  // (gsd-* renamed to oto-* per Phase 1 ADR-07). 12 additional entries inferred from
  // per-agent `tools:` field: agents with Write/Edit/Bash get workspace-write, pure-read agents
  // get read-only. Source-of-truth analysis: .oto/phases/04-core-workflows-agents-port/04-RESEARCH.md
  // § "Agent sandbox map".
  agentSandboxes: {
    'oto-advisor-researcher': 'read-only',
    'oto-assumptions-analyzer': 'read-only',
    'oto-code-fixer': 'workspace-write',
    'oto-code-reviewer': 'workspace-write',
    'oto-codebase-mapper': 'workspace-write',
    'oto-debugger': 'workspace-write',
    'oto-doc-verifier': 'workspace-write',
    'oto-doc-writer': 'workspace-write',
    'oto-domain-researcher': 'workspace-write',
    'oto-executor': 'workspace-write',
    'oto-integration-checker': 'read-only',
    'oto-nyquist-auditor': 'workspace-write',
    'oto-phase-researcher': 'workspace-write',
    'oto-plan-checker': 'read-only',
    'oto-planner': 'workspace-write',
    'oto-project-researcher': 'workspace-write',
    'oto-research-synthesizer': 'workspace-write',
    'oto-roadmapper': 'workspace-write',
    'oto-security-auditor': 'workspace-write',
    'oto-ui-auditor': 'workspace-write',
    'oto-ui-checker': 'read-only',
    'oto-ui-researcher': 'workspace-write',
    'oto-verifier': 'workspace-write',
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
