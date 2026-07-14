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
  const outsideOto = stripBlock(text, MCP_BEGIN, MCP_END);
  return getTomlLineRecords(outsideOto).some(
    (record) => record.tableHeader?.name === 'mcp_servers.exa'
  );
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
  if (hasExternalMcpServer(existing)) {
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
  mergeMcpBlock,
  unmergeMcpBlock,
  mergeHooksBlock,
  unmergeHooksBlock,
  parseTomlBracketHeader,
  getTomlLineRecords,
  stripCodexHooksFeatureAssignments,
};
