'use strict';
const { test } = require('node:test');

test.todo('D-17 codex spine: install → /oto-help → /oto-progress → /oto-new-project tmpdir flow → state file written under .oto/');
test.todo('D-17 codex per-agent .toml present at <configDir>/agents/oto-executor.toml with sandbox_mode = workspace-write (T-08-access-control-sandbox)');
test.todo('D-17 codex spine smoke skips with clear message if codex --version < 0.120 or codex not on PATH');
