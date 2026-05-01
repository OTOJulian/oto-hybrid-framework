'use strict';

const path = require('node:path');

// Hook-fleet contract. Keep in sync with 05-RESEARCH.md Pattern 2 / Code Example 1.
// validate-commit: PreToolUse / Bash because exit-2 blocking needs PreToolUse
// (foundation-frameworks/get-shit-done-main/bin/install.js:6798-6807).
// context-monitor: PostToolUse / broad matcher / timeout 10
// (foundation-frameworks/get-shit-done-main/bin/install.js:6643-6651).
function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildOtoEntries(configDir) {
  const cd = String(configDir || '').replace(/\\/g, '/');
  const hookPath = (rel) => `${cd}/hooks/${rel}`;
  const node = (rel) => `node ${shellQuote(hookPath(rel))}`;
  const bash = (rel) => `bash ${shellQuote(hookPath(rel))}`;
  return {
    statusLine: { type: 'command', command: node('oto-statusline.js') },
    hooksBlock: {
      SessionStart: { hooks: [{ type: 'command', command: bash('oto-session-start') }] },
      PreToolUse: [
        { matcher: 'Write|Edit', hooks: [{ type: 'command', command: node('oto-prompt-guard.js'), timeout: 5 }] },
        { matcher: 'Bash', hooks: [{ type: 'command', command: bash('oto-validate-commit.sh'), timeout: 5 }] },
      ],
      PostToolUse: [
        { matcher: 'Read', hooks: [{ type: 'command', command: node('oto-read-injection-scanner.js'), timeout: 5 }] },
        {
          matcher: 'Bash|Edit|Write|MultiEdit|Agent|Task',
          hooks: [{ type: 'command', command: node('oto-context-monitor.js'), timeout: 10 }],
        },
      ],
    },
    markerHooks: [
      { event: 'SessionStart', command_contains: 'oto-session-start' },
      { event: 'PreToolUse', matcher: 'Write|Edit', command_contains: 'oto-prompt-guard.js' },
      { event: 'PreToolUse', matcher: 'Bash', command_contains: 'oto-validate-commit.sh' },
      { event: 'PostToolUse', matcher: 'Read', command_contains: 'oto-read-injection-scanner.js' },
      {
        event: 'PostToolUse',
        matcher: 'Bash|Edit|Write|MultiEdit|Agent|Task',
        command_contains: 'oto-context-monitor.js',
      },
      { event: 'statusLine', command_contains: 'oto-statusline.js' },
    ],
  };
}

// JSONC tolerance: strict JSON first, then strip comment-only lines and block comments.
// Source: simplified port of foundation-frameworks/get-shit-done-main/bin/install.js:543-589.
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

function mergeSettings(existingText, ctx = {}) {
  const settings = parseSettings(existingText);
  const { statusLine, hooksBlock, markerHooks } = buildOtoEntries(ctx.configDir);

  // All injected entries follow Claude's command-hook shape; malformed hooks can
  // make Claude discard settings.json (GSD bin/install.js:4793-4865).
  if (!settings.statusLine || (
    typeof settings.statusLine?.command === 'string' &&
    settings.statusLine.command.includes('oto-statusline.js')
  )) {
    settings.statusLine = statusLine;
  }

  settings.hooks = settings.hooks || {};

  settings.hooks.SessionStart = settings.hooks.SessionStart || [];
  if (!settings.hooks.SessionStart.some((entry) =>
    entryHasOtoCommand(entry, { command_contains: 'oto-session-start' }))) {
    settings.hooks.SessionStart.push(hooksBlock.SessionStart);
  }

  settings.hooks.PreToolUse = settings.hooks.PreToolUse || [];
  for (const otoEntry of hooksBlock.PreToolUse) {
    const marker = markerHooks.find((m) => m.event === 'PreToolUse' && m.matcher === otoEntry.matcher);
    if (!settings.hooks.PreToolUse.some((entry) => entryHasOtoCommand(entry, marker))) {
      settings.hooks.PreToolUse.push(otoEntry);
    }
  }

  settings.hooks.PostToolUse = settings.hooks.PostToolUse || [];
  for (const otoEntry of hooksBlock.PostToolUse) {
    const marker = markerHooks.find((m) => m.event === 'PostToolUse' && m.matcher === otoEntry.matcher);
    if (!settings.hooks.PostToolUse.some((entry) => entryHasOtoCommand(entry, marker))) {
      settings.hooks.PostToolUse.push(otoEntry);
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

  if (
    settings.statusLine &&
    typeof settings.statusLine?.command === 'string' &&
    settings.statusLine.command.includes('oto-statusline.js')
  ) {
    delete settings.statusLine;
  }

  if (settings.hooks) {
    for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse']) {
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
  mergeSettings,
  unmergeSettings,
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
