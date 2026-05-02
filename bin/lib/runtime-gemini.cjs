'use strict';

const path = require('node:path');
const {
  convertClaudeToGeminiAgent,
  convertClaudeToGeminiToml,
  convertGeminiMatcher,
  rewriteTaskCalls,
} = require('./gemini-transform.cjs');

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function parseSettings(text) {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    try {
      return JSON.parse(stripped);
    } catch (error) {
      throw new Error(`mergeSettings: cannot parse settings.json: ${error.message}`);
    }
  }
}

function entryHasOtoCommand(entry, marker) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  for (const hook of entry.hooks) {
    if (typeof hook?.command !== 'string' || !hook.command.includes(marker.command_contains)) {
      continue;
    }
    if (marker.matcher !== undefined && entry.matcher !== marker.matcher) {
      continue;
    }
    return true;
  }
  return false;
}

function buildOtoEntries(configDir) {
  const cd = String(configDir || '').replace(/\\/g, '/');
  const hookPath = (rel) => `${cd}/hooks/${rel}`;
  const node = (rel) => `node ${shellQuote(hookPath(rel))}`;
  const bash = (rel) => `bash ${shellQuote(hookPath(rel))}`;
  return {
    hooksBlock: {
      SessionStart: { hooks: [{ type: 'command', command: bash('oto-session-start') }] },
      BeforeTool: [
        {
          matcher: convertGeminiMatcher('Write|Edit'),
          hooks: [{ type: 'command', command: node('oto-prompt-guard.js'), timeout: 5 }],
        },
        {
          matcher: convertGeminiMatcher('Bash'),
          hooks: [{ type: 'command', command: bash('oto-validate-commit.sh'), timeout: 5 }],
        },
      ],
      AfterTool: [
        {
          matcher: convertGeminiMatcher('Read'),
          hooks: [{ type: 'command', command: node('oto-read-injection-scanner.js'), timeout: 5 }],
        },
        {
          matcher: convertGeminiMatcher('Bash|Edit|Write|MultiEdit|Agent|Task'),
          hooks: [{ type: 'command', command: node('oto-context-monitor.js'), timeout: 10 }],
        },
      ],
    },
    markerHooks: [
      { event: 'SessionStart', command_contains: 'oto-session-start' },
      { event: 'BeforeTool', matcher: convertGeminiMatcher('Write|Edit'), command_contains: 'oto-prompt-guard.js' },
      { event: 'BeforeTool', matcher: convertGeminiMatcher('Bash'), command_contains: 'oto-validate-commit.sh' },
      { event: 'AfterTool', matcher: convertGeminiMatcher('Read'), command_contains: 'oto-read-injection-scanner.js' },
      {
        event: 'AfterTool',
        matcher: convertGeminiMatcher('Bash|Edit|Write|MultiEdit|Agent|Task'),
        command_contains: 'oto-context-monitor.js',
      },
    ],
  };
}

function mergeSettings(existingText, ctx = {}) {
  const settings = parseSettings(existingText);
  const { hooksBlock, markerHooks } = buildOtoEntries(ctx.configDir);

  if (settings.experimental?.enableAgents === false) {
    process.stderr.write(
      'oto: experimental.enableAgents is explicitly false in user Gemini settings — skipping oto agent-dependent hook registration\n'
    );
    settings._oto = {
      version: ctx.otoVersion,
      installed_at: ctx.installedAt || new Date().toISOString(),
      hooks: [],
      skipped_due_to_disabled_agents: true,
    };
    return JSON.stringify(settings, null, 2) + '\n';
  }

  settings.experimental = settings.experimental || {};
  if (settings.experimental.enableAgents === undefined) {
    settings.experimental.enableAgents = true;
  }

  settings.hooks = settings.hooks || {};
  settings.hooks.SessionStart = settings.hooks.SessionStart || [];
  if (!settings.hooks.SessionStart.some((entry) =>
    entryHasOtoCommand(entry, { command_contains: 'oto-session-start' }))) {
    settings.hooks.SessionStart.push(hooksBlock.SessionStart);
  }

  settings.hooks.BeforeTool = settings.hooks.BeforeTool || [];
  for (const otoEntry of hooksBlock.BeforeTool) {
    const marker = markerHooks.find((m) => m.event === 'BeforeTool' && m.matcher === otoEntry.matcher);
    if (!settings.hooks.BeforeTool.some((entry) => entryHasOtoCommand(entry, marker))) {
      settings.hooks.BeforeTool.push(otoEntry);
    }
  }

  settings.hooks.AfterTool = settings.hooks.AfterTool || [];
  for (const otoEntry of hooksBlock.AfterTool) {
    const marker = markerHooks.find((m) => m.event === 'AfterTool' && m.matcher === otoEntry.matcher);
    if (!settings.hooks.AfterTool.some((entry) => entryHasOtoCommand(entry, marker))) {
      settings.hooks.AfterTool.push(otoEntry);
    }
  }

  settings._oto = {
    version: ctx.otoVersion,
    installed_at: ctx.installedAt || new Date().toISOString(),
    hooks: markerHooks,
  };
  return JSON.stringify(settings, null, 2) + '\n';
}

function unmergeSettings(existingText, ctx = {}) {
  void ctx;
  const settings = parseSettings(existingText);
  const markerHooks = (settings._oto && Array.isArray(settings._oto.hooks)) ? settings._oto.hooks : null;
  const useMarkers = markerHooks || buildOtoEntries('/').markerHooks;

  if (settings.hooks) {
    for (const event of ['SessionStart', 'BeforeTool', 'AfterTool', 'SessionEnd']) {
      if (!Array.isArray(settings.hooks[event])) continue;
      settings.hooks[event] = settings.hooks[event].filter((entry) => {
        for (const marker of useMarkers) {
          if (marker.event !== event) continue;
          if (entryHasOtoCommand(entry, marker)) return false;
        }
        return true;
      });
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  delete settings._oto;
  return JSON.stringify(settings, null, 2) + '\n';
}

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
  transformCommand: (content, meta = {}) => {
    const rewritten = rewriteTaskCalls(content);
    if (meta && (meta.srcKey === 'commands' || /\.md$/.test(meta.relPath || meta.path || ''))) {
      return convertClaudeToGeminiToml(rewritten);
    }
    return rewritten;
  },
  transformAgent: (content, meta) => convertClaudeToGeminiAgent(content),
  transformSkill: (content, meta) => content,
  mergeSettings,
  unmergeSettings,
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
