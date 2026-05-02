'use strict';
const { test } = require('node:test');

test.todo('D-10 resolveAgentModel: per-project model_overrides wins over global ~/.oto/defaults.json');
test.todo('D-10 resolveAgentModel: model_profile from .oto/config.json drives RUNTIME_PROFILE_MAP[codex] tier resolution');
test.todo('D-10 resolveAgentModel: returns { model, reasoning_effort } for codex');
test.todo('D-10 resolveAgentModel: omits reasoning_effort for non-codex runtimes');
test.todo('D-10 loadDefaults: hand-rolled validation rejects malformed ~/.oto/defaults.json');
