'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const {
  convertClaudeAgentToCodexAgent,
  convertClaudeCommandToCodexSkill,
  convertClaudeToCodexMarkdown,
  generateCodexAgentToml,
} = require('./codex-transform.cjs');
const { mergeHooksBlock, unmergeHooksBlock } = require('./codex-toml.cjs');
const { loadDefaults, resolveAgentModel } = require('./codex-profile.cjs');

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildHookEntries(configDir) {
  const cd = String(configDir || '').replace(/\\/g, '/');
  const hookPath = (rel) => `${cd}/hooks/${rel}`;
  const node = (rel) => `node ${shellQuote(hookPath(rel))}`;
  const bash = (rel) => `bash ${shellQuote(hookPath(rel))}`;
  return [
    { type: 'SessionStart', command: bash('oto-session-start') },
    { type: 'PreToolUse', matcher: 'Write|Edit', command: node('oto-prompt-guard.js'), timeout: 5 },
    { type: 'PreToolUse', matcher: 'Bash', command: bash('oto-validate-commit.sh'), timeout: 5 },
    { type: 'PostToolUse', matcher: 'Read', command: node('oto-read-injection-scanner.js'), timeout: 5 },
    {
      type: 'PostToolUse',
      matcher: 'Bash|Edit|Write|MultiEdit|Agent|Task',
      command: node('oto-context-monitor.js'),
      timeout: 10,
    },
  ];
}

function readProjectConfig(projectRoot) {
  if (!projectRoot) return {};
  const configPath = path.join(projectRoot, '.oto', 'config.json');
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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
  transformCommand: (content, meta) => convertClaudeToCodexMarkdown(content),
  transformAgent: (content, meta) => convertClaudeAgentToCodexAgent(content),
  transformSkill: (content, meta) => convertClaudeToCodexMarkdown(content),
  mergeSettings(existingText, ctx = {}) {
    return mergeHooksBlock(existingText, buildHookEntries(ctx.configDir), ctx);
  },
  unmergeSettings(existingText) {
    return unmergeHooksBlock(existingText);
  },
  async emitDerivedFiles(ctx) {
    const configDir = ctx.configDir;
    const repoRoot = ctx.repoRoot || path.join(__dirname, '..', '..');
    const outDir = path.join(configDir, 'agents');
    await fsp.mkdir(outDir, { recursive: true });

    const globalDefaults = (() => {
      try {
        return loadDefaults();
      } catch (error) {
        process.stderr.write(`oto: warning — invalid ~/.oto/defaults.json: ${error.message}\n`);
        return null;
      }
    })();
    const projectConfig = readProjectConfig(ctx.projectRoot);
    const runtimeResolver = {
      resolve(agentName) {
        return resolveAgentModel(agentName, projectConfig, globalDefaults, 'codex');
      },
    };

    const entries = [];
    for (const agentName of Object.keys(this.agentSandboxes).sort()) {
      const src = path.join(repoRoot, 'oto', 'agents', `${agentName}.md`);
      if (!fs.existsSync(src)) continue;
      const agentContent = fs.readFileSync(src, 'utf8');
      const toml = generateCodexAgentToml(
        agentName,
        agentContent,
        this.agentSandboxes,
        {
          ...(globalDefaults?.model_overrides || {}),
          ...(projectConfig?.model_overrides || {}),
        },
        runtimeResolver,
        { otoVersion: ctx.otoVersion }
      );
      const target = path.join(outDir, `${agentName}.toml`);
      await fsp.writeFile(target, toml);
      entries.push({ path: path.relative(configDir, target), sha256: await sha256Text(toml) });
    }
    return entries;
  },
  // QUICK-260505-bxx-01: install commands as Codex skills under skills/oto-<name>/SKILL.md.
  // Codex 0.128.0 no longer reads commands/; it reads skills/. We wrap each command body
  // in a <codex_skill_adapter> header so $oto-<name> invocation works inside Codex.
  // Ports foundation-frameworks/get-shit-done-main/bin/install.js:4051 (copyCommandsAsCodexSkills).
  async installCommandsOverride(ctx) {
    const repoRoot = ctx.repoRoot;
    const configDir = ctx.configDir;
    // Hardcode the source dir at oto/commands/oto/ so the inner "oto" namespace IS the
    // skill prefix — `progress.md` → `oto-progress` (matches upstream gsd-progress shape).
    const srcDir = path.join(repoRoot, 'oto', 'commands', 'oto');
    const skillsDir = path.join(configDir, 'skills');
    const prefix = 'oto';

    if (!fs.existsSync(srcDir)) return [];
    await fsp.mkdir(skillsDir, { recursive: true });

    // Wipe prior oto-* skill dirs to avoid stale leftovers (mirrors upstream lines 4058-4064).
    const existing = fs.existsSync(skillsDir)
      ? await fsp.readdir(skillsDir, { withFileTypes: true })
      : [];
    for (const entry of existing) {
      if (entry.isDirectory() && entry.name.startsWith(`${prefix}-`)) {
        await fsp.rm(path.join(skillsDir, entry.name), { recursive: true, force: true });
      }
    }

    const entries = [];
    async function recurse(currentSrcDir, currentPrefix) {
      const dirEntries = await fsp.readdir(currentSrcDir, { withFileTypes: true });
      dirEntries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of dirEntries) {
        const srcPath = path.join(currentSrcDir, entry.name);
        if (entry.isDirectory()) {
          await recurse(srcPath, `${currentPrefix}-${entry.name}`);
          continue;
        }
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        const baseName = entry.name.slice(0, -3); // strip ".md"
        const skillName = `${currentPrefix}-${baseName}`;
        const skillDir = path.join(skillsDir, skillName);
        await fsp.mkdir(skillDir, { recursive: true });

        const content = await fsp.readFile(srcPath, 'utf8');
        const transformed = convertClaudeCommandToCodexSkill(content, skillName);
        const target = path.join(skillDir, 'SKILL.md');
        await fsp.writeFile(target, transformed);
        entries.push({
          path: path.relative(configDir, target),
          sha256: await sha256Text(transformed),
        });
      }
    }

    await recurse(srcDir, prefix);
    return entries;
  },
  // QUICK-260505-bxx-03: remove (a) pre-fix legacy commands/oto/ leftover that's not in
  // state.files, and (b) any oto-* skill DIRECTORIES under skills/ — state-driven removal
  // unlinks the SKILL.md files but leaves the now-empty parent dirs behind.
  async uninstallCommandsOverride(ctx) {
    const legacyPath = path.join(ctx.configDir, 'commands', 'oto');
    await fsp.rm(legacyPath, { recursive: true, force: true });

    const skillsDir = path.join(ctx.configDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('oto-')) {
          await fsp.rm(path.join(skillsDir, entry.name), { recursive: true, force: true });
        }
      }
    }
  },
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
