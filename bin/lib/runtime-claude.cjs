'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { expandTilde } = require('./args.cjs');

// Hook-fleet contract. Keep in sync with 05-RESEARCH.md Pattern 2 / Code Example 1.
// validate-commit: PreToolUse / Bash because exit-2 blocking needs PreToolUse
// (get-shit-done@v1.38.5 bin/install.js:6798-6807).
// context-monitor: PostToolUse / broad matcher / timeout 10
// (get-shit-done@v1.38.5 bin/install.js:6643-6651).
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
// Source: simplified port of get-shit-done@v1.38.5 bin/install.js:543-589.
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

// OTO Phase 15 (MCP-03): MCP hooks target .claude.json (NOT settingsFilename)
// — resolution is env-based, see decisions/ADR-16 + claude-code#14313.
function claudeJsonPath(env = {}, homeDir = os.homedir()) {
  const configuredDir = env.CLAUDE_CONFIG_DIR;
  return path.join(configuredDir ? expandTilde(configuredDir) : homeDir, '.claude.json');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
}

function entriesEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function buildExaEntry(launcherPath) {
  return { type: 'stdio', command: 'node', args: [launcherPath] };
}

function readClaudeJson(target) {
  try {
    return fs.readFileSync(target, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '{}';
    throw error;
  }
}

function writeClaudeJson(target, value) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2));
}

async function mergeMcp(ctx = {}) {
  const target = claudeJsonPath(ctx.env || process.env);
  const existingText = readClaudeJson(target);
  let claudeState;
  try {
    claudeState = JSON.parse(existingText);
  } catch {
    return {
      registered: false,
      refused: { reason: 'unparseable' },
      entry: null,
      target,
    };
  }

  const desired = buildExaEntry(ctx.launcherPath);
  const existing = claudeState.mcpServers?.exa;
  if (
    existing !== undefined &&
    !entriesEqual(existing, desired) &&
    !entriesEqual(existing, ctx.priorEntry)
  ) {
    return {
      registered: false,
      refused: { reason: 'user-owned', existing },
      entry: null,
      target,
    };
  }

  if (!claudeState.mcpServers || typeof claudeState.mcpServers !== 'object' || Array.isArray(claudeState.mcpServers)) {
    claudeState.mcpServers = {};
  }
  claudeState.mcpServers.exa = desired;
  writeClaudeJson(target, claudeState);
  return { registered: true, refused: null, entry: desired, target };
}

async function unmergeMcp(ctx = {}) {
  const target = claudeJsonPath(ctx.env || process.env);
  let claudeState;
  try {
    claudeState = JSON.parse(readClaudeJson(target));
  } catch {
    return { removed: false, skipped: { reason: 'absent' }, target };
  }

  const existing = claudeState.mcpServers?.exa;
  if (existing === undefined) {
    return { removed: false, skipped: { reason: 'absent' }, target };
  }
  if (ctx.priorEntry && entriesEqual(existing, ctx.priorEntry)) {
    delete claudeState.mcpServers.exa;
    writeClaudeJson(target, claudeState);
    return { removed: true, skipped: null, target };
  }

  const reason = ctx.priorEntry ? 'drifted' : 'user-owned';
  process.stderr.write('oto: exa entry was modified since oto registered it — left in place.\n');
  return { removed: false, skipped: { reason }, target };
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
  mergeMcp,
  unmergeMcp,
  claudeJsonPath,
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
