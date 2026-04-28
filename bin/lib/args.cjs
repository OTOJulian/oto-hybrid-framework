'use strict';
const { parseArgs } = require('node:util');
const os = require('node:os');
const path = require('node:path');

const FLAG_CONFIG = {
  options: {
    claude: { type: 'boolean', default: false },
    codex: { type: 'boolean', default: false },
    gemini: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    'config-dir': { type: 'string' },
    force: { type: 'boolean', default: false, short: 'f' },
    purge: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false, short: 'v' },
    help: { type: 'boolean', default: false, short: 'h' },
  },
  allowPositionals: true,
  strict: true,
};

class ArgError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function expandTilde(p) {
  if (p && p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function parseCliArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, ...FLAG_CONFIG });
  } catch (error) {
    throw new ArgError(error.message, 3);
  }

  const { values, positionals } = parsed;
  const action = positionals[0] || 'install';
  const runtimes = [];

  if (values.claude) runtimes.push('claude');
  if (values.codex) runtimes.push('codex');
  if (values.gemini) runtimes.push('gemini');

  if (values.all && runtimes.length > 0) {
    throw new ArgError('--all cannot be combined with --claude/--codex/--gemini', 3);
  }

  if (values.all && values['config-dir']) {
    throw new ArgError('--config-dir cannot be used with --all (--config-dir targets a single runtime)', 3);
  }

  if (!values.all && !values.help && runtimes.length === 0 && action === 'install') {
    runtimes.push('claude');
  }

  return {
    action,
    runtimes,
    all: values.all,
    configDir: values['config-dir'] ? path.resolve(expandTilde(values['config-dir'])) : null,
    force: values.force,
    purge: values.purge,
    verbose: values.verbose,
    help: values.help,
  };
}

function resolveConfigDir(adapter, parsed, env) {
  if (parsed.configDir) return parsed.configDir;
  if (env[adapter.configDirEnvVar]) return expandTilde(env[adapter.configDirEnvVar]);
  return path.join(os.homedir(), adapter.defaultConfigDirSegment);
}

module.exports = { parseCliArgs, resolveConfigDir, expandTilde, ArgError };
