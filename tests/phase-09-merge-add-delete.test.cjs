'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

void assert;

test('SYN-04 / D-10: added file (in current, not in inventory, not in allowlist) emits .oto-sync-conflicts/<path>.added.md', { todo: 'plan-03' }, () => {});
test('SYN-04 / D-10: deleted file (in prior, not in current, oto/ has it) emits .oto-sync-conflicts/<path>.deleted.md', { todo: 'plan-03' }, () => {});
test('SYN-04 / D-17: unclassified-add path causes non-zero exit even if all merges clean', { todo: 'plan-03' }, () => {});
test('SYN-04 / D-13: sidecar suffix convention .added.md / .deleted.md uses path under .oto-sync-conflicts/', { todo: 'plan-03' }, () => {});
