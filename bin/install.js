#!/usr/bin/env node
'use strict';

const major = parseInt(process.versions.node.split('.')[0], 10);
if (major < 22) {
  process.stderr.write(`oto requires Node.js >= 22.0.0 (found ${process.versions.node})\n`);
  process.exit(1);
}

const path = require('node:path');
const { parseCliArgs, ArgError } = require('./lib/args.cjs');
const { installRuntime, uninstallRuntime, installAll, uninstallAll } = require('./lib/install.cjs');
const { version: OTO_VERSION } = require('../package.json');

const ADAPTERS = {
  claude: require('./lib/runtime-claude.cjs'),
  codex: require('./lib/runtime-codex.cjs'),
  gemini: require('./lib/runtime-gemini.cjs'),
};

const HELP_TEXT = `oto v${OTO_VERSION} - install / uninstall the oto AI-CLI framework

USAGE
  oto install --claude [--config-dir <dir>]  Claude Code (v0.1.0 happy path)
  oto install --codex  [--config-dir <dir>]  Codex (best-effort until Phase 8)
  oto install --gemini [--config-dir <dir>]
      install for Gemini CLI (best-effort until Phase 8)
  oto install --all                           install to all detected runtimes
  oto uninstall --claude|--codex|--gemini     uninstall a runtime
  oto uninstall --all [--purge]               remove all; purge stale files
  oto sync --upstream <name|all> --to <ref>   dry-run upstream sync
  oto sync --upstream <name|all> --to <ref> --apply
      apply auto-merged upstream changes
  oto sync --accept <path>                    accept resolved conflict
  oto sync --accept-deletion <path>           accept upstream deletion
  oto sync --keep-deleted <path>              keep local copy after delete
  oto sync --status                           show sync pins and conflicts

FLAGS
  --config-dir <dir>   target a config dir (single-runtime only)
  --force,  -f         overwrite without prompts
  --purge              uninstall: also remove stale oto-* files
  --verbose, -v        print intermediate progress lines
  --help, -h           show this help

RESOLUTION ORDER
  1. --config-dir <dir>          (highest precedence; not allowed with --all)
  2. <RUNTIME>_CONFIG_DIR env
     CLAUDE_CONFIG_DIR / CODEX_HOME / GEMINI_CONFIG_DIR
  3. ~/.<runtime>/               (default)

EXIT CODES
  0  success           1  install error      2  uninstall error
  3  invalid args      4  --all: no runtimes detected

REPO  https://github.com/OTOJulian/oto-hybrid-framework
`;

async function main(argv) {
  if (argv[0] === 'sync') {
    const { runSync } = require('./lib/sync-cli.cjs');
    const code = await runSync(argv.slice(1));
    process.exit(code);
  }

  let parsed;
  try {
    parsed = parseCliArgs(argv);
  } catch (error) {
    if (error instanceof ArgError) {
      process.stderr.write(`oto: ${error.message}\n`);
      process.exit(error.exitCode);
    }
    throw error;
  }

  if (
    argv.length === 0 ||
    parsed.help ||
    (parsed.action !== 'install' && parsed.action !== 'uninstall')
  ) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  const opts = {
    repoRoot: path.join(__dirname, '..'),
    flags: parsed,
    purge: parsed.purge,
  };

  try {
    if (parsed.action === 'install') {
      if (parsed.all) {
        await installAll(Object.values(ADAPTERS), opts);
      } else {
        for (const rt of parsed.runtimes) {
          await installRuntime(ADAPTERS[rt], opts);
        }
      }
    } else if (parsed.all) {
      await uninstallAll(Object.values(ADAPTERS), opts);
    } else {
      for (const rt of parsed.runtimes) {
        await uninstallRuntime(ADAPTERS[rt], opts);
      }
    }
    process.exit(0);
  } catch (error) {
    process.stderr.write(`oto: ${error.message}\n`);
    if (typeof error.exitCode === 'number') {
      process.exit(error.exitCode);
    }
    process.exit(parsed.action === 'install' ? 1 : 2);
  }
}

main(process.argv.slice(2));
