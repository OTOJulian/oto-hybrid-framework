'use strict';
const { test } = require('node:test');

test.todo('D-16 mergeSettings: PreToolUse → BeforeTool, PostToolUse → AfterTool event-name renames');
test.todo('D-16 mergeSettings: matchers run through convertGeminiToolName (Bash → run_shell_command, etc., Pitfall 3)');
test.todo('D-16 experimental.enableAgents = true written when missing');
test.todo('D-16 T-08-tampering-enableAgents: existing experimental.enableAgents=false honored — installer warns + skips agent emit');
test.todo('D-16 statusLine field NOT written on Gemini (no statusLine equivalent)');
