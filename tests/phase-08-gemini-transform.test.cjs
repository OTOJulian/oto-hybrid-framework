'use strict';
const { test } = require('node:test');

test.todo('D-13 oto-executor agent transformed via convertClaudeToGeminiAgent matches tests/fixtures/runtime-parity/gemini/oto-executor.expected.md');
test.todo('D-13 ${VAR} → $VAR escape: oto-executor body retains zero unresolved ${WORD} patterns');
test.todo('D-13 frontmatter: color: and skills: stripped, tools: emitted as YAML array');
test.todo('D-14 Task() rewrite: bare Task(subagent_type=\'oto-foo\', prompt=\'...\') rewritten to Gemini agent-as-tool invocation');
test.todo('D-14 Task() rewrite: fenced-code Task() examples preserved verbatim (Open Question 2)');
test.todo('D-15 parallel Task() block: three adjacent Tasks rewritten as one parallel-tool-use instruction');
test.todo('D-13 oto:test-driven-development skill transform output matches tests/fixtures/runtime-parity/gemini/test-driven-development.expected.md');
test.todo('D-13 /oto-progress command rewritten as TOML at tests/fixtures/runtime-parity/gemini/oto-progress.expected.toml');
test.todo('Pitfall 1 / Pitfall 15: transformed agent body contains zero literal `gsd-` or `superpowers-` strings');
