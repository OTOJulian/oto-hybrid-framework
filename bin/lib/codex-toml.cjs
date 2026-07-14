'use strict';

const BEGIN = '# === BEGIN OTO HOOKS ===';
const END = '# === END OTO HOOKS ===';
const MCP_BEGIN = '# === BEGIN OTO MCP ===';
const MCP_END = '# === END OTO MCP ===';

function parseTomlBracketHeader(line) {
  const trimmed = String(line || '').trim();
  let match = trimmed.match(/^\[\[([A-Za-z0-9_.-]+)\]\]$/);
  if (match) return { type: 'array', name: match[1], path: match[1], array: true };
  match = trimmed.match(/^\[([A-Za-z0-9_.-]+)\]$/);
  if (match) return { type: 'table', name: match[1], path: match[1], array: false };
  return null;
}

function getTomlLineRecords(text) {
  return String(text || '').split(/\r?\n/).map((line, index) => ({
    line,
    lineIndex: index,
    tableHeader: parseTomlBracketHeader(line),
  }));
}

function stripTomlComment(line) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (quote === "'") {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '#') return { text: line.slice(0, index), confident: true };
  }
  return { text: line, confident: quote === null && !escaped };
}

function parseTomlKeyPath(raw) {
  const source = String(raw || '').trim();
  const segments = [];
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] || '')) index += 1;
    let value = '';
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      index += 1;
      let closed = false;
      while (index < source.length) {
        const char = source[index];
        if (char === quote) {
          closed = true;
          index += 1;
          break;
        }
        if (quote === '"' && char === '\\') return null;
        value += char;
        index += 1;
      }
      if (!closed) return null;
    } else {
      const match = source.slice(index).match(/^[A-Za-z0-9_-]+/);
      if (!match) return null;
      value = match[0];
      index += value.length;
    }
    segments.push(value);
    while (/\s/.test(source[index] || '')) index += 1;
    if (index === source.length) break;
    if (source[index] !== '.') return null;
    index += 1;
  }
  return segments.length ? segments : null;
}

function findAssignment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === quote && (quote === "'" || line[index - 1] !== '\\')) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '=') return index;
  }
  return -1;
}

function inspectExternalMcpServer(text) {
  const outsideOto = stripBlock(text, MCP_BEGIN, MCP_END);
  if (/'''|"""/.test(outsideOto)) return { external: false, confident: false };

  for (const rawLine of outsideOto.split(/\r?\n/)) {
    const comment = stripTomlComment(rawLine);
    if (!comment.confident) return { external: false, confident: false };
    const line = comment.text.trim();
    if (!line) continue;

    if (line.startsWith('[')) {
      const array = line.startsWith('[[');
      const close = array ? ']]' : ']';
      if (!line.endsWith(close)) return { external: false, confident: false };
      const inner = line.slice(array ? 2 : 1, array ? -2 : -1);
      const path = parseTomlKeyPath(inner);
      if (!path) return { external: false, confident: false };
      if (path[0] === 'mcp_servers' && path[1] === 'exa') {
        return { external: true, confident: true };
      }
      continue;
    }

    const equals = findAssignment(line);
    if (equals === -1) continue;
    const path = parseTomlKeyPath(line.slice(0, equals));
    if (!path) return { external: false, confident: false };
    if (path[0] !== 'mcp_servers') continue;
    if (path[1] === 'exa') return { external: true, confident: true };
    if (path.length === 1) {
      const rhs = line.slice(equals + 1).trim();
      if (!rhs.startsWith('{') || !rhs.endsWith('}')) {
        return { external: false, confident: false };
      }
      if (/(?:^|[{,])\s*(?:exa|"exa"|'exa')\s*=/.test(rhs)) {
        return { external: true, confident: true };
      }
    }
  }
  return { external: false, confident: true };
}

function hasMixedLegacyHooks(text) {
  // Detect coexistence of pre-Codex-0.125.0 formats outside the OTO-managed block:
  //   - flat `[[hooks]]` array-of-tables (rejected by Codex 0.125.0+)
  //   - very old `[hooks.X]` map (rejected since 0.124.0)
  // These cannot be auto-migrated safely, so refuse to merge and ask the user to clean up.
  const outsideOto = stripBlock(text);
  return /^\s*\[hooks\.[^\]]+\]\s*$/m.test(outsideOto) && /^\s*\[\[hooks\]\]\s*$/m.test(outsideOto);
}

function stripBlock(text, begin = BEGIN, end = END) {
  const source = String(text || '');
  const start = source.indexOf(begin);
  const finish = source.indexOf(end, start + begin.length);
  if (start === -1 || finish === -1 || finish < start) return source;

  let before = source.slice(0, start);
  let after = source.slice(finish + end.length);
  // Blocks emitted by oto own one separator newline on each side. Removing only
  // those bytes makes merge -> unmerge preserve the user's text exactly.
  if (before.endsWith('\n')) before = before.slice(0, -1);
  if (after.startsWith('\n')) after = after.slice(1);
  return before + after;
}

function hasExternalMcpServer(text) {
  return inspectExternalMcpServer(text).external;
}

function emitMcpBlock(ctx = {}) {
  return [
    MCP_BEGIN,
    `# managed by oto v${ctx.otoVersion || 'unknown'}`,
    '[mcp_servers.exa]',
    'command = "node"',
    `args = [${JSON.stringify(ctx.launcherPath)}]`,
    MCP_END,
  ].join('\n');
}

function getMcpBlockInner(text) {
  const source = String(text || '');
  const start = source.indexOf(MCP_BEGIN);
  const finish = source.indexOf(MCP_END, start + MCP_BEGIN.length);
  if (start === -1 || finish === -1 || finish < start) return null;

  let inner = source.slice(start + MCP_BEGIN.length, finish);
  if (inner.startsWith('\n')) inner = inner.slice(1);
  if (inner.endsWith('\n')) inner = inner.slice(0, -1);
  return inner;
}

function mergeMcpBlock(existingText, ctx = {}) {
  const existing = String(existingText || '');
  const inspection = inspectExternalMcpServer(existing);
  if (!inspection.confident) {
    return { text: existingText, refused: { reason: 'unparseable' }, entry: null };
  }
  if (inspection.external) {
    return { text: existingText, refused: { reason: 'user-owned' }, entry: null };
  }

  const base = stripBlock(existing, MCP_BEGIN, MCP_END);
  const block = emitMcpBlock(ctx);
  const text = base ? `${base}\n${block}\n` : `${block}\n`;
  return { text, refused: null, entry: getMcpBlockInner(text) };
}

function unmergeMcpBlock(existingText) {
  return stripBlock(existingText, MCP_BEGIN, MCP_END);
}

function stripCodexHooksFeatureAssignments(text) {
  const lines = String(text || '').split(/\r?\n/);
  let inFeatures = false;
  const out = [];

  for (const line of lines) {
    const header = parseTomlBracketHeader(line);
    if (header) {
      inFeatures = !header.array && header.path === 'features';
      out.push(line);
      continue;
    }

    if (/^\s*features\.codex_hooks\s*=/.test(line)) {
      continue;
    }
    if (inFeatures && /^\s*codex_hooks\s*=/.test(line)) {
      continue;
    }
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

// Codex 0.125.0+ schema:
//   [[hooks.<EventName>]]
//   matcher = "<regex>"           # omitted for events without matcher (e.g. SessionStart)
//   [[hooks.<EventName>.hooks]]
//   type = "command"
//   command = "..."
//   timeout = <seconds>
//
// Each (event, matcher) tuple becomes one outer block plus one nested handler block.
// `entry.type` from buildHookEntries is the EVENT NAME (e.g. "PreToolUse"), which here
// becomes the dotted table key. The handler-level `type` field is always `"command"`.
function emitHookEntry(entry) {
  const event = entry.type;
  const lines = [`[[hooks.${event}]]`];
  if (entry.matcher) lines.push(`matcher = ${JSON.stringify(entry.matcher)}`);
  lines.push(`[[hooks.${event}.hooks]]`);
  lines.push('type = "command"');
  lines.push(`command = ${JSON.stringify(entry.command)}`);
  if (entry.timeout !== undefined) lines.push(`timeout = ${Number(entry.timeout)}`);
  return lines.join('\n');
}

function mergeHooksBlock(existingText, hookEntries = [], ctx = {}) {
  const existing = String(existingText || '');
  if (hasMixedLegacyHooks(existing)) {
    process.stderr.write('oto: refusing to merge Codex hooks because legacy [hooks.X] and modern [[hooks]] formats coexist\n');
    return existingText;
  }

  const base = stripBlock(stripCodexHooksFeatureAssignments(existing)).trimEnd();
  const block = [
    BEGIN,
    `# managed by oto v${ctx.otoVersion || 'unknown'}`,
    ...hookEntries.map(emitHookEntry),
    END,
  ].join('\n');
  return (base ? `${base}\n\n${block}\n` : `${block}\n`);
}

function unmergeHooksBlock(existingText) {
  return stripBlock(existingText);
}

module.exports = {
  MCP_BEGIN,
  MCP_END,
  getMcpBlockInner,
  hasExternalMcpServer,
  inspectExternalMcpServer,
  mergeMcpBlock,
  unmergeMcpBlock,
  mergeHooksBlock,
  unmergeHooksBlock,
  parseTomlBracketHeader,
  getTomlLineRecords,
  stripCodexHooksFeatureAssignments,
};
