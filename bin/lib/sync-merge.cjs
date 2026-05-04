'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function looksBinary(buf) {
  if (!buf || buf.length === 0) return false;
  const slice = buf.subarray(0, Math.min(buf.length, 8192));
  return slice.indexOf(0) !== -1;
}

function escapeRegExp(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        source += '.*';
        i += 1;
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`);
}

function matchAllowlist(relPath, globs, rootDir = '') {
  const norm = relPath.replace(/\\/g, '/');
  if (globs.some((g) => globToRegex(g).test(norm))) return true;
  const normalizedRoot = rootDir.replace(/\\/g, '/');
  if (normalizedRoot.includes('/foundation-frameworks/')) {
    return globs.some((g) => globToRegex(g).test(`foundation-frameworks/${norm}`));
  }
  return false;
}

function readBuf(p) {
  try {
    return fs.readFileSync(p);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function mergeOneFile({ otoPath, basePath, otherPath, targetPath }) {
  const otoBuf = readBuf(otoPath);
  const baseBuf = readBuf(basePath);
  const otherBuf = readBuf(otherPath);

  if (otoBuf == null && baseBuf == null && otherBuf == null) {
    return { kind: 'missing', content: Buffer.alloc(0) };
  }
  if (otoBuf == null && baseBuf == null && otherBuf != null) {
    return { kind: 'added', content: otherBuf };
  }
  if (otoBuf != null && baseBuf != null && otherBuf == null) {
    return { kind: 'deleted', content: baseBuf };
  }
  if ([otoBuf, baseBuf, otherBuf].some((b) => b == null)) {
    throw new Error(`mergeOneFile: unexpected null trio for ${targetPath}`);
  }
  if (looksBinary(otoBuf) || looksBinary(baseBuf) || looksBinary(otherBuf)) {
    return { kind: 'binary', content: otherBuf };
  }

  const r = spawnSync('git', [
    'merge-file', '-p',
    '-L', 'oto-current',
    '-L', 'prior-rebranded',
    '-L', 'upstream-rebranded',
    otoPath, basePath, otherPath,
  ], { encoding: 'utf8' });

  if (r.status === null) throw new Error(`git merge-file did not run on ${targetPath}: ${r.error?.message}`);
  if (r.status === 255 || r.status < 0) {
    throw new Error(`git merge-file errored on ${targetPath} (exit ${r.status}): ${r.stderr.trim()}`);
  }
  if (r.status === 0) return { kind: 'clean', content: r.stdout };
  return { kind: 'conflict', content: r.stdout, hunks: r.status };
}

function emitYamlHeader(meta) {
  const required = ['kind', 'upstream', 'prior_tag', 'prior_sha', 'current_tag', 'current_sha', 'target_path', 'inventory_entry', 'timestamp', 'oto_version'];
  for (const key of required) {
    if (!(key in meta)) throw new Error(`emitYamlHeader: missing field ${key}`);
  }
  const inventoryEntry = meta.inventory_entry === null ? 'null' : JSON.stringify(meta.inventory_entry);
  return [
    '---',
    `kind: ${meta.kind}`,
    `upstream: ${meta.upstream}`,
    `prior_tag: ${meta.prior_tag}`,
    `prior_sha: ${meta.prior_sha}`,
    `current_tag: ${meta.current_tag}`,
    `current_sha: ${meta.current_sha}`,
    `target_path: ${meta.target_path}`,
    `inventory_entry: ${inventoryEntry}`,
    `timestamp: ${meta.timestamp}`,
    `oto_version: ${meta.oto_version}`,
    '---',
    '',
  ].join('\n');
}

function assertSafeOutputPath(outputDir, relTarget) {
  const resolved = path.resolve(outputDir, relTarget);
  const root = path.resolve(outputDir) + path.sep;
  if (!resolved.startsWith(root) && resolved !== path.resolve(outputDir)) {
    throw new Error(`refusing path traversal: ${relTarget} would resolve outside ${outputDir}`);
  }
  return resolved;
}

function stripOtoPrefixForOtoRoot(outputDir, targetPath) {
  const normalized = targetPath.replace(/\\/g, '/');
  if (path.basename(path.resolve(outputDir)) === 'oto' && normalized.startsWith('oto/')) {
    return normalized.slice('oto/'.length);
  }
  return normalized;
}

function otoPathFor(otoDir, targetPath) {
  return assertSafeOutputPath(otoDir, stripOtoPrefixForOtoRoot(otoDir, targetPath));
}

async function ensureParent(filePath) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeSidecar({ conflictsDir, targetPath, suffix, meta, content }) {
  const sidecar = assertSafeOutputPath(conflictsDir, `${targetPath}${suffix}`);
  await ensureParent(sidecar);
  const body = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  await fsp.writeFile(sidecar, emitYamlHeader(meta) + body);
  return sidecar;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    const parent = entry.parentPath || entry.path || root;
    const absPath = path.join(parent, entry.name);
    if (entry.isFile()) out.push(path.relative(root, absPath).replace(/\\/g, '/'));
  }
  return out.sort();
}

function makeMeta({ kind, entry, relPath, upstream, priorTag, priorSha, currentTag, currentSha, otoVersion, timestamp }) {
  return {
    kind,
    upstream,
    prior_tag: priorTag,
    prior_sha: priorSha,
    current_tag: currentTag,
    current_sha: currentSha,
    target_path: relPath,
    inventory_entry: entry || null,
    timestamp,
    oto_version: otoVersion,
  };
}

function reportBody(summary) {
  const counts = summary.counts || {};
  const lists = summary.lists || {};
  const lines = [
    `# Sync Report — ${summary.upstream} ${summary.priorTag} → ${summary.currentTag}`,
    `Pulled: ${summary.timestamp}`,
    `Auto-merged (no conflict): ${counts.clean || 0} files`,
    `Same-line conflicts: ${counts.conflict || 0} files`,
    `Binary files needing replacement: ${counts.binary || 0}`,
    `Added (need classification): ${(counts.added || 0) + (counts.unclassifiedAdds || 0)} files`,
    `Deleted upstream: ${counts.deleted || 0} files`,
    `Unknown-inventory paths: ${counts.unclassifiedAdds || 0}`,
    `Sync exit status: ${(counts.unclassifiedAdds || 0) > 0 ? 1 : 0}`,
    '',
    '## Same-line conflicts',
    ...(lists.conflict || ['None']),
    '',
    '## Added',
    ...(lists.added || ['None']),
    '',
    '## Deleted',
    ...(lists.deleted || ['None']),
    '',
    '## Unknown inventory paths',
    ...(lists.unclassifiedAdds || ['None']),
    '',
  ];
  return lines.join('\n');
}

async function mergeAll({
  inventoryPath,
  allowlistPath,
  otoDir,
  conflictsDir,
  priorRebrandedDir,
  currentRebrandedDir,
  upstream,
  priorTag = 'unknown',
  priorSha = 'unknown',
  currentTag = 'unknown',
  currentSha = 'unknown',
  otoVersion = 'unknown',
  apply = false,
}) {
  const inventory = loadJson(inventoryPath);
  const allowlist = loadJson(allowlistPath);
  const globs = allowlist.oto_owned_globs || [];
  const timestamp = new Date().toISOString();
  const counts = { clean: 0, conflict: 0, added: 0, deleted: 0, binary: 0, unclassifiedAdds: 0 };
  const lists = { clean: [], conflict: [], added: [], deleted: [], binary: [], unclassifiedAdds: [] };
  const entries = (inventory.entries || []).filter((entry) => entry.upstream === upstream && (entry.verdict === 'keep' || entry.verdict === 'merge'));
  const knownPaths = new Set();
  for (const entry of inventory.entries || []) {
    if (entry.path) knownPaths.add(entry.path.replace(/\\/g, '/'));
    if (entry.target_path) knownPaths.add(entry.target_path.replace(/\\/g, '/'));
  }

  await fsp.mkdir(conflictsDir, { recursive: true });

  for (const entry of entries) {
    const targetPath = entry.target_path.replace(/\\/g, '/');
    const result = mergeOneFile({
      otoPath: otoPathFor(otoDir, targetPath),
      basePath: path.join(priorRebrandedDir, targetPath),
      otherPath: path.join(currentRebrandedDir, targetPath),
      targetPath,
    });

    if (result.kind === 'missing') continue;
    const metaBase = { entry, relPath: targetPath, upstream, priorTag, priorSha, currentTag, currentSha, otoVersion, timestamp };

    if (result.kind === 'clean') {
      counts.clean += 1;
      lists.clean.push(targetPath);
      if (apply) {
        const outPath = otoPathFor(otoDir, targetPath);
        await ensureParent(outPath);
        await fsp.writeFile(outPath, result.content);
      }
    } else if (result.kind === 'conflict') {
      counts.conflict += 1;
      lists.conflict.push(targetPath);
      await writeSidecar({ conflictsDir, targetPath, suffix: '.md', meta: makeMeta({ ...metaBase, kind: 'modified' }), content: result.content });
    } else if (result.kind === 'added') {
      counts.added += 1;
      lists.added.push(targetPath);
      await writeSidecar({ conflictsDir, targetPath, suffix: '.added.md', meta: makeMeta({ ...metaBase, kind: 'added' }), content: result.content });
    } else if (result.kind === 'deleted') {
      counts.deleted += 1;
      lists.deleted.push(targetPath);
      await writeSidecar({ conflictsDir, targetPath, suffix: '.deleted.md', meta: makeMeta({ ...metaBase, kind: 'deleted' }), content: result.content });
    } else if (result.kind === 'binary') {
      counts.binary += 1;
      lists.binary.push(targetPath);
      await writeSidecar({ conflictsDir, targetPath, suffix: '.added.md', meta: makeMeta({ ...metaBase, kind: 'binary' }), content: result.content });
    }
  }

  for (const relPath of walkFiles(currentRebrandedDir)) {
    if (knownPaths.has(relPath)) continue;
    if (matchAllowlist(relPath, globs, currentRebrandedDir)) continue;
    counts.unclassifiedAdds += 1;
    lists.unclassifiedAdds.push(relPath);
    process.stderr.write(`oto sync: warning — unclassified upstream addition: ${relPath}\n`);
    const content = fs.readFileSync(path.join(currentRebrandedDir, relPath));
    await writeSidecar({
      conflictsDir,
      targetPath: relPath,
      suffix: '.added.md',
      meta: makeMeta({ kind: 'added', entry: null, relPath, upstream, priorTag, priorSha, currentTag, currentSha, otoVersion, timestamp }),
      content,
    });
  }

  return { exitCode: counts.unclassifiedAdds > 0 ? 1 : 0, counts, lists };
}

async function writeReport(conflictsDir, summary) {
  await fsp.mkdir(conflictsDir, { recursive: true });
  await fsp.writeFile(path.join(conflictsDir, 'REPORT.md'), reportBody(summary));
}

async function appendBreakingChanges(syncMetaDir, upstream, summary) {
  await fsp.mkdir(syncMetaDir, { recursive: true });
  const filePath = path.join(syncMetaDir, `BREAKING-CHANGES-${upstream}.md`);
  let existing = '';
  try {
    existing = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    existing = `# Breaking Changes — ${upstream} upstream\n\n<!-- New entries below this line -->\n`;
  }
  const body = reportBody(summary).split('\n').slice(1).join('\n');
  const section = `\n\n## ${summary.timestamp} — ${summary.priorTag} → ${summary.currentTag}\n\n${body}`;
  await fsp.writeFile(filePath, existing.replace(/\s*$/, '') + section + '\n');
}

module.exports = {
  mergeOneFile,
  looksBinary,
  matchAllowlist,
  globToRegex,
  emitYamlHeader,
  assertSafeOutputPath,
  mergeAll,
  writeReport,
  appendBreakingChanges,
};
