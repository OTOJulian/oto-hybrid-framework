'use strict';
const { test } = require('node:test');

test.todo('D-11 oto-executor agent transformed via runtime-codex.transformAgent matches tests/fixtures/runtime-parity/codex/oto-executor.expected.md');
test.todo('D-11 oto-executor per-agent .toml emit matches tests/fixtures/runtime-parity/codex/oto-executor.expected.toml');
test.todo('D-11 transformed agent body contains zero literal `gsd-` or `superpowers-` strings (Pitfall 1 / Pitfall 15)');
test.todo('D-08 /oto-progress command transform output matches tests/fixtures/runtime-parity/codex/oto-progress.expected.md');
test.todo('D-08 oto:test-driven-development skill transform output matches tests/fixtures/runtime-parity/codex/test-driven-development.expected.md');
