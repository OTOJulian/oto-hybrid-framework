'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

void assert;

test('D-16: glob match - oto-owned path (e.g. bin/lib/codex-toml.cjs) is never compared against upstream', { todo: 'plan-03' }, () => {});
test('D-17 / Pitfall 7: allowlist completeness - sync against foundation-frameworks/get-shit-done-main/ produces 0 unclassified adds', { todo: 'plan-03' }, () => {});
test('D-16: glob ** suffix matches deeply nested paths (e.g. .oto/foo/bar)', { todo: 'plan-03' }, () => {});
test('Pitfall 8: allowlist is read by sync code (decisions/file-inventory.json, decisions/sync-allowlist.json themselves are oto-owned)', { todo: 'plan-03' }, () => {});
