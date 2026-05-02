'use strict';

const claudeToGeminiTools = {
  Read: 'read_file',
  Write: 'write_file',
  Edit: 'replace',
  Bash: 'run_shell_command',
  Glob: 'glob',
  Grep: 'search_file_content',
  WebSearch: 'google_web_search',
  WebFetch: 'web_fetch',
  TodoWrite: 'write_todos',
  AskUserQuestion: 'ask_user',
};

function convertGeminiToolName(claudeTool) {
  if (!claudeTool) return null;
  if (claudeTool.startsWith('mcp__')) return null;
  if (claudeTool === 'Task') return null;
  if (claudeToGeminiTools[claudeTool]) return claudeToGeminiTools[claudeTool];
  return claudeTool.toLowerCase();
}

function convertClaudeToGeminiMarkdown(content) {
  let converted = String(content || '');
  converted = converted.replace(/~\/\.claude\//g, '~/.gemini/');
  converted = converted.replace(/\$HOME\/\.claude\//g, '$HOME/.gemini/');
  converted = converted.replace(/\.\/\.claude\//g, './.gemini/');
  converted = converted.replace(/(?<![A-Za-z0-9_\-./~$])\.claude\//g, '.gemini/');
  converted = converted.replace(/\.claudeignore\b/g, '.geminiignore');
  converted = converted.replace(/CLAUDE\.md/g, 'GEMINI.md');
  return converted;
}

function stripSubTags(content) {
  return String(content || '').replace(/<sub>(.*?)<\/sub>/g, '*($1)*');
}

function neutralizeAgentReferences(content, instructionFile) {
  let converted = convertClaudeToGeminiMarkdown(content);
  converted = converted.replace(/\bClaude(?! Code| Opus| Sonnet| Haiku| native| based|-)\b(?!\.md)/g, 'the agent');
  converted = converted.replace(/Do NOT load full `AGENTS\.md` files[^\n]*/g, '');
  if (instructionFile) {
    converted = converted.replace(/CLAUDE\.md/g, instructionFile);
  }
  return converted;
}

function convertClaudeToGeminiAgent(content) {
  if (!content.startsWith('---')) return neutralizeAgentReferences(content, 'GEMINI.md');

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return neutralizeAgentReferences(content, 'GEMINI.md');

  const frontmatter = content.substring(3, endIndex).trim();
  const body = content.substring(endIndex + 3);

  const lines = frontmatter.split('\n');
  const newLines = [];
  let inAllowedTools = false;
  let inSkippedArrayField = false;
  const tools = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (inSkippedArrayField) {
      if (!trimmed || trimmed.startsWith('- ')) {
        continue;
      }
      inSkippedArrayField = false;
    }

    if (trimmed.startsWith('allowed-tools:')) {
      inAllowedTools = true;
      continue;
    }

    if (trimmed.startsWith('tools:')) {
      const toolsValue = trimmed.substring(6).trim();
      if (toolsValue) {
        const parsed = toolsValue.split(',').map((t) => t.trim()).filter(Boolean);
        for (const tool of parsed) {
          const mapped = convertGeminiToolName(tool);
          if (mapped) tools.push(mapped);
        }
      } else {
        inAllowedTools = true;
      }
      continue;
    }

    if (trimmed.startsWith('color:')) continue;

    if (trimmed.startsWith('skills:')) {
      inSkippedArrayField = true;
      continue;
    }

    if (inAllowedTools) {
      if (trimmed.startsWith('- ')) {
        const mapped = convertGeminiToolName(trimmed.substring(2).trim());
        if (mapped) tools.push(mapped);
        continue;
      }
      if (trimmed && !trimmed.startsWith('-')) {
        inAllowedTools = false;
      }
    }

    if (!inAllowedTools) {
      newLines.push(convertClaudeToGeminiMarkdown(line));
    }
  }

  if (tools.length > 0) {
    newLines.push('tools:');
    for (const tool of tools) {
      newLines.push(`  - ${tool}`);
    }
  }

  const newFrontmatter = newLines.join('\n').trim();
  const escapedBody = body.replace(/\$\{(\w+)\}/g, '$$$1');
  const neutralBody = neutralizeAgentReferences(escapedBody, 'GEMINI.md');
  return `---\n${newFrontmatter}\n---${stripSubTags(neutralBody)}`;
}

function extractDescription(frontmatter) {
  for (const line of String(frontmatter || '').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('description:')) {
      return trimmed.substring(12).trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return '';
}

function tomlMultiline(value) {
  return `"""\n${String(value || '').replace(/"""/g, '\\"\\"\\"')}\n"""`;
}

function convertClaudeToGeminiToml(content) {
  if (!content.startsWith('---')) {
    return `prompt = ${tomlMultiline(convertClaudeToGeminiMarkdown(content).trim())}\n`;
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return `prompt = ${tomlMultiline(convertClaudeToGeminiMarkdown(content).trim())}\n`;
  }

  const frontmatter = content.substring(3, endIndex).trim();
  const body = convertClaudeToGeminiMarkdown(content.substring(endIndex + 3).trim());
  const description = extractDescription(frontmatter);
  let toml = '';
  if (description) {
    toml += `description = ${JSON.stringify(description)}\n`;
  }
  toml += `prompt = ${tomlMultiline(body)}\n`;
  return toml;
}

function splitByFences(body) {
  const segments = [];
  const fenceRe = /```[\s\S]*?```/g;
  let offset = 0;
  let match;
  while ((match = fenceRe.exec(body)) !== null) {
    if (match.index > offset) {
      segments.push({ fenced: false, text: body.slice(offset, match.index) });
    }
    segments.push({ fenced: true, text: match[0] });
    offset = match.index + match[0].length;
  }
  if (offset < body.length) {
    segments.push({ fenced: false, text: body.slice(offset) });
  }
  return segments;
}

function scanTaskCallAt(text, start) {
  if (!text.startsWith('Task(', start)) return null;
  let i = start + 'Task('.length;
  let depth = 1;
  let quote = null;
  let escaped = false;

  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      i += 1;
      continue;
    }

    if (ch === '\'' || ch === '"') {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        const raw = text.slice(start, i + 1);
        return { start, end: i + 1, raw, task: parseTaskArgs(raw) };
      }
    }
    i += 1;
  }
  return null;
}

function parseQuotedArg(raw, name) {
  const match = raw.match(new RegExp(`${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`));
  return match ? match[2] : null;
}

function parseTaskArgs(raw) {
  const subagentType = parseQuotedArg(raw, 'subagent_type');
  const prompt = parseQuotedArg(raw, 'prompt');
  if (!subagentType || prompt === null) return null;
  return { subagentType, prompt };
}

function findTaskCalls(text) {
  const calls = [];
  let i = 0;
  while (i < text.length) {
    const index = text.indexOf('Task(', i);
    if (index === -1) break;
    const call = scanTaskCallAt(text, index);
    if (call && call.task) {
      calls.push(call);
      i = call.end;
    } else {
      i = index + 5;
    }
  }
  return calls;
}

function renderTaskCluster(calls) {
  if (calls.length === 1) {
    const task = calls[0].task;
    return [
      `Invoke the \`${task.subagentType}\` subagent with:`,
      '',
      `    prompt: ${task.prompt}`,
      '',
      `(Exposed as a tool named \`${task.subagentType}\`; Gemini's main agent will call it.)`,
    ].join('\n');
  }

  const lines = [
    'In a single tool-use block, invoke:',
    '',
  ];
  for (const call of calls) {
    lines.push(`- \`${call.task.subagentType}\` with prompt: ${call.task.prompt}`);
  }
  return lines.join('\n');
}

function rewriteNonFencedTaskCalls(text) {
  const calls = findTaskCalls(text);
  if (calls.length === 0) return text;

  let out = '';
  let offset = 0;
  let i = 0;
  while (i < calls.length) {
    const group = [calls[i]];
    let j = i + 1;
    while (j < calls.length && /^\s*$/.test(text.slice(group[group.length - 1].end, calls[j].start))) {
      group.push(calls[j]);
      j += 1;
    }

    out += text.slice(offset, group[0].start);
    out += renderTaskCluster(group);
    offset = group[group.length - 1].end;
    i = j;
  }
  out += text.slice(offset);
  return out;
}

function rewriteTaskCalls(body) {
  return splitByFences(String(body || ''))
    .map((segment) => segment.fenced ? segment.text : rewriteNonFencedTaskCalls(segment.text))
    .join('');
}

const geminiHookEventMap = {
  SessionStart: 'SessionStart',
  PreToolUse: 'BeforeTool',
  PostToolUse: 'AfterTool',
  Stop: 'SessionEnd',
  statusLine: null,
};

function convertGeminiHookEventName(name) {
  return Object.prototype.hasOwnProperty.call(geminiHookEventMap, name) ? geminiHookEventMap[name] : name;
}

function convertGeminiMatcher(matcher) {
  if (!matcher) return matcher;
  return String(matcher)
    .split('|')
    .map((part) => convertGeminiToolName(part.trim()))
    .filter(Boolean)
    .join('|');
}

module.exports = {
  claudeToGeminiTools,
  convertGeminiToolName,
  convertClaudeToGeminiAgent,
  convertClaudeToGeminiToml,
  rewriteTaskCalls,
  convertGeminiHookEventName,
  convertGeminiMatcher,
  convertClaudeToGeminiMarkdown,
};
