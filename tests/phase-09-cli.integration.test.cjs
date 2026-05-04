'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildBareUpstream } = require('./fixtures/phase-09/build-bare-upstream.cjs');

void assert;
void buildBareUpstream;

test('D-19: oto sync flag parser parses --upstream, --to, --apply, --dry-run, --accept, --status', { todo: 'plan-06' }, () => {});
test("D-19: bin/install.js dispatches 'oto sync ...' to bin/lib/sync-cli.cjs", { todo: 'plan-06' }, () => {});
test('SYN-07 (override): oto sync --upstream gsd --to <fixture-tag> end-to-end against bare-repo fixture (default --dry-run, no writes)', { todo: 'plan-06' }, () => {});
test('SYN-07 (override): oto sync --upstream gsd --to <fixture-tag> --apply writes to oto/', { todo: 'plan-06' }, () => {});
test('D-19: oto sync --status shows pending conflicts and last-synced refs', { todo: 'plan-06' }, () => {});
test('Pitfall 9: git --version parsing - lenient regex; fail-loud on unparseable output', { todo: 'plan-06' }, () => {});
test("Ref injection guard (T-09-03): --to '$(rm -rf /)' rejected by ref validator before passing to git", { todo: 'plan-06' }, () => {});
