'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { parseCliArgs, resolveConfigDir, expandTilde, ArgError } = require('../bin/lib/args.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-03 + INS-06 (arg validation)
// Filled by: 03-02-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

const CLAUDE_ADAPTER = {
  configDirEnvVar: 'CLAUDE_CONFIG_DIR',
  defaultConfigDirSegment: '.claude',
};

test('INS-03: --config-dir flag wins over env var and default', () => {
  const parsed = parseCliArgs(['install', '--claude', '--config-dir', '/tmp/x']);
  assert.deepEqual(parsed, {
    action: 'install',
    runtimes: ['claude'],
    all: false,
    configDir: '/tmp/x',
    force: false,
    purge: false,
    verbose: false,
    help: false,
  });
  assert.equal(resolveConfigDir(CLAUDE_ADAPTER, parsed, { CLAUDE_CONFIG_DIR: '/tmp/env' }), '/tmp/x');
});

test('INS-03: env var wins over default when no flag', () => {
  const parsed = parseCliArgs(['install', '--claude']);
  assert.equal(resolveConfigDir(CLAUDE_ADAPTER, parsed, { CLAUDE_CONFIG_DIR: '/y' }), '/y');
});

test('INS-03: default = ~/.<runtime> when no flag and no env', () => {
  const parsed = parseCliArgs(['install']);
  assert.deepEqual(parsed.runtimes, ['claude']);
  assert.equal(resolveConfigDir(CLAUDE_ADAPTER, parsed, {}), path.join(os.homedir(), '.claude'));
});

test('INS-03: expandTilde resolves ~/foo against os.homedir()', () => {
  assert.equal(expandTilde('~/foo'), path.join(os.homedir(), 'foo'));
  assert.equal(expandTilde('/abs/path'), '/abs/path');
});

test('INS-06: --all + --config-dir rejected at parse time (exit 3)', () => {
  assert.throws(
    () => parseCliArgs(['install', '--all', '--config-dir', '/tmp/x']),
    {
      name: 'Error',
      message: '--config-dir cannot be used with --all (--config-dir targets a single runtime)',
      exitCode: 3,
    },
  );
});

test('INS-06: --all + --claude rejected (mutual exclusion)', () => {
  assert.throws(
    () => parseCliArgs(['install', '--all', '--claude']),
    {
      name: 'Error',
      message: '--all cannot be combined with --claude/--codex/--gemini',
      exitCode: 3,
    },
  );
});

test('INS-06: parseCliArgs returns runtimes array for --claude --codex combination', () => {
  const parsed = parseCliArgs(['install', '--claude', '--codex']);
  assert.deepEqual(parsed.runtimes, ['claude', 'codex']);

  const help = parseCliArgs(['install', '--help']);
  assert.equal(help.help, true);
  assert.deepEqual(help.runtimes, []);
});
