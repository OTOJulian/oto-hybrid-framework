'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CURRENT_SCHEMA_VERSION,
  readState,
  validateState,
  writeState,
} = require('../bin/lib/install-state.cjs');

// Phase 3 Wave 0 scaffold.
// Covers: INS-04 (install state schema validation)
// Filled by: 03-03-PLAN.md (Wave 1)
// Sources: 03-VALIDATION.md per-task verification map

function tmpDir(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-install-state-test-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

function validState(overrides = {}) {
  return {
    version: CURRENT_SCHEMA_VERSION,
    oto_version: '0.1.0',
    installed_at: '2026-04-28T00:00:00.000Z',
    runtime: 'claude',
    config_dir: '/tmp/claude',
    files: [{ path: 'commands/oto-help.md', sha256: 'a'.repeat(64) }],
    instruction_file: {
      path: 'CLAUDE.md',
      open_marker: '<!-- OTO Configuration -->',
      close_marker: '<!-- /OTO Configuration -->',
    },
    ...overrides,
  };
}

test('INS-04: writeState round-trips through readState (deep equal)', (t) => {
  const dir = tmpDir(t);
  const statePath = path.join(dir, 'oto', '.install.json');
  const state = validState();

  writeState(statePath, state);

  assert.equal(fs.readFileSync(statePath, 'utf8'), JSON.stringify(state, null, 2) + '\n');
  assert.deepEqual(readState(statePath), state);
  assert.equal(readState(path.join(dir, 'missing.json')), null);

  fs.writeFileSync(statePath, '{not json');
  assert.throws(() => readState(statePath), /^Error: state file corrupt:/);

  fs.writeFileSync(statePath, JSON.stringify({ version: CURRENT_SCHEMA_VERSION }) + '\n');
  assert.throws(() => readState(statePath), /^Error: state file invalid:/);

  assert.throws(
    () => writeState(statePath, validState({ runtime: 'opencode' })),
    /^Error: refusing to write invalid state:/,
  );
});

test('INS-04: validateState rejects unsupported version', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 1);
  assert.deepEqual(validateState(validState({ version: 2 })), ['unsupported state.version: 2']);
});

test('INS-04: validateState rejects absolute paths in files[].path', () => {
  const errors = validateState(validState({
    files: [{ path: '/abs/path', sha256: 'a'.repeat(64) }],
  }));

  assert.ok(
    errors.some((error) => error.includes('must be relative to configDir')),
    errors.join('\n'),
  );
});

test('INS-04: validateState rejects traversal in instruction_file.path', () => {
  const errors = validateState(validState({
    instruction_file: {
      path: '../outside.md',
      open_marker: '<!-- OTO Configuration -->',
      close_marker: '<!-- /OTO Configuration -->',
    },
  }));

  assert.ok(
    errors.some((error) => error.includes('state.instruction_file.path must be relative to configDir')),
    errors.join('\n'),
  );
});

test('INS-04: validateState rejects non-64-hex sha256', () => {
  const errors = validateState(validState({
    files: [{ path: 'commands/oto-help.md', sha256: 'short' }],
  }));

  assert.ok(
    errors.some((error) => error.includes('64-hex string')),
    errors.join('\n'),
  );
});

test('INS-04: validateState rejects unknown runtime name', () => {
  assert.deepEqual(validateState(validState({ runtime: 'opencode' })), ['unknown runtime: opencode']);
});
