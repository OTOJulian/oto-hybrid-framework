'use strict';

const BEGIN = '# === BEGIN OTO HOOKS ===';
const END = '# === END OTO HOOKS ===';

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
  return /^\s*\[hooks\.[^\]]+\]/m.test(text) && /^\s*\[\[hooks\]\]/m.test(text);
}

function stripBlock(text) {
  const source = String(text || '');
  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start === -1 || end === -1 || end < start) return source;
  const after = end + END.length;
  return (source.slice(0, start).trimEnd() + '\n\n' + source.slice(after).trimStart()).trim() + '\n';
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

function emitHookEntry(entry) {
  const lines = ['[[hooks]]'];
  lines.push(`type = ${JSON.stringify(entry.type)}`);
  if (entry.matcher) lines.push(`matcher = ${JSON.stringify(entry.matcher)}`);
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
  mergeHooksBlock,
  unmergeHooksBlock,
  parseTomlBracketHeader,
  getTomlLineRecords,
  stripCodexHooksFeatureAssignments,
};
