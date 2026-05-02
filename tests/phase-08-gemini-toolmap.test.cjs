'use strict';
const { test } = require('node:test');

test.todo('D-13 convertGeminiToolName: every entry in claudeToGeminiTools map (Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/TodoWrite/AskUserQuestion)');
test.todo('D-13 convertGeminiToolName: mcp__* prefix returns null (auto-discovered from mcpServers)');
test.todo('D-13 convertGeminiToolName: Task returns null (agents auto-registered as callable tools)');
test.todo('D-13 convertGeminiToolName: unknown tool falls back to lowercase');
