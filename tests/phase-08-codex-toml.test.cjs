'use strict';
const { test } = require('node:test');

test.todo('D-10 mergeHooksBlock injects [[hooks]] array between BEGIN OTO HOOKS / END OTO HOOKS markers');
test.todo('D-10 idempotent rewrite: re-merging strips prior block first, then injects fresh content (no duplication)');
test.todo('D-10 user-content preservation: user-authored entries above and below oto marker block survive merge → unmerge round-trip');
test.todo('D-10 unmerge removes ONLY oto-marked entries; non-oto [[hooks]] entries untouched');
test.todo('Pitfall 2 guard: refuses to merge when both legacy [hooks.X] and modern [[hooks]] formats coexist');
