'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { validate } = require('./validate-schema.cjs');
const walker = require('./walker.cjs');
const manifest = require('./manifest.cjs');
const report = require('./report.cjs');
const RULES = {
  identifier: require('./rules/identifier.cjs'),
  path: require('./rules/path.cjs'),
  command: require('./rules/command.cjs'),
  skill_ns: require('./rules/skill_ns.cjs'),
  package: require('./rules/package.cjs'),
  url: require('./rules/url.cjs'),
  env_var: require('./rules/env_var.cjs')
};

const RULE_ORDER = ['package', 'url', 'identifier', 'path', 'command', 'skill_ns', 'env_var'];
const DRYRUN_RULE_ORDER = ['identifier', 'path', 'command', 'skill_ns', 'package', 'url', 'env_var'];

function repoRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadAndValidate(mapPath) {
  const root = repoRoot();
  const resolvedMap = path.resolve(mapPath || path.join(root, 'rename-map.json'));
  const schemaPath = path.join(root, 'schema', 'rename-map.json');
  const map = loadJson(resolvedMap);
  const schema = loadJson(schemaPath);
  const result = validate(map, schema);
  const errors = result.valid ? [] : result.errors;
  if (errors.length === 0) {
    for (const [ruleType, rules] of Object.entries(map.rules || {})) {
      if (!Array.isArray(rules) || rules.length === 0) errors.push(`$.rules.${ruleType}: expected non-empty rule array`);
    }
  }
  return { map, errors };
}

function buildInventoryMap() {
  const inventoryPath = path.join(repoRoot(), 'decisions', 'file-inventory.json');
  if (!fs.existsSync(inventoryPath)) return new Map();
  const inventory = loadJson(inventoryPath);
  return new Map((inventory.entries || []).map((entry) => [entry.path, entry]));
}

function inventoryEntryFor(relPath, inventoryByPath) {
  const normalized = relPath.split(path.sep).join('/');
  return inventoryByPath.get(normalized) || inventoryByPath.get(relPath);
}

function ensureReportsDir() {
  const reportsDir = path.join(repoRoot(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

async function writeFileAtomic(filePath, content) {
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`
  );
  try {
    await fsp.writeFile(tmpPath, content);
    await fsp.rename(tmpPath, filePath);
  } catch (error) {
    await fsp.rm(tmpPath, { force: true });
    throw error;
  }
}

function resolveOut(outPath) {
  const root = repoRoot();
  const resolvedOut = path.resolve(outPath || path.join(root, '.oto-rebrand-out'));
  const tmp = os.tmpdir();
  if (!resolvedOut.startsWith(root) && !resolvedOut.startsWith(tmp)) {
    throw new Error('Refusing to write outside repo root or os.tmpdir()');
  }
  return resolvedOut;
}

function isDirEmpty(dirPath) {
  return !fs.existsSync(dirPath) || fs.readdirSync(dirPath).length === 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? text.length : end);
}

function isUrlAttribution(line, filePath = '') {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized === 'THIRD-PARTY-LICENSES.md' || normalized.endsWith('/THIRD-PARTY-LICENSES.md')) return true;
  if (normalized === 'LICENSE' || normalized === 'LICENSE.md' || normalized.endsWith('/LICENSE') || normalized.endsWith('/LICENSE.md')) return true;
  if (/non-attribution/i.test(line)) return false;
  return /(copyright|\(c\)|attribution|upstream|original|based on)/i.test(line);
}

function maskPreservedUrls(text, urlRules, context) {
  let masked = text;
  const masks = [];
  for (const rule of urlRules || []) {
    if (rule.preserve_in_attribution !== true) continue;
    const pattern = new RegExp(escapeRegExp(rule.from), 'g');
    masked = masked.replace(pattern, (match, offset, fullText) => {
      if (!isUrlAttribution(lineAt(fullText, offset), context.filePath)) return match;
      const token = `__OTO_MASK_${masks.length}__`;
      masks.push({ token, value: match });
      return token;
    });
  }
  return { text: masked, masks };
}

function unmask(text, masks) {
  return masks.reduce((output, mask) => output.split(mask.token).join(mask.value), text);
}

function contextFor(entry, owner, allowlist, inventoryByPath) {
  return {
    owner,
    allowlist,
    inventoryByPath,
    fileClass: entry.file_class,
    filePath: entry.relPath,
    fileContent: entry.content
  };
}

function dryrunMatches(entry, map, context) {
  if (entry.allowlisted) return [];
  const matches = [];
  for (const ruleType of DRYRUN_RULE_ORDER) {
    const mod = RULES[ruleType];
    for (const rule of map.rules[ruleType] || []) {
      if (ruleType === 'package') {
        if (!mod.applies(entry.relPath)) continue;
        try {
          matches.push(...mod.listMatches(JSON.parse(entry.content), rule, context).map((match) => ({ ...match, rule_type: ruleType })));
        } catch {
          continue;
        }
      } else {
        matches.push(...mod.listMatches(entry.content, rule, context).map((match) => ({ ...match, rule_type: ruleType })));
      }
    }
  }
  return matches;
}

function applyPackageIfNeeded(content, relPath, map, context) {
  if (!RULES.package.applies(relPath)) return { content, replacements: 0 };
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch {
    return { content, replacements: 0 };
  }
  let replacements = 0;
  for (const rule of map.rules.package || []) {
    const result = RULES.package.apply(pkg, rule, context);
    pkg = result.pkg;
    replacements += result.replacements;
  }
  return { content: `${JSON.stringify(pkg, null, 2)}\n`, replacements };
}

function applyStringRules(content, map, context) {
  let output = content;
  let replacements = 0;
  const masked = maskPreservedUrls(output, map.rules.url, context);
  output = masked.text;
  for (const ruleType of RULE_ORDER) {
    if (ruleType === 'package') continue;
    for (const rule of map.rules[ruleType] || []) {
      const result = RULES[ruleType].apply(output, rule, context);
      output = result.text;
      replacements += result.replacements;
    }
  }
  const cleanup = applyCoverageCleanup(output);
  output = cleanup.text;
  replacements += cleanup.replacements;
  return { content: unmask(output, masked.masks), replacements };
}

function applyCoverageCleanup(text) {
  let replacements = 0;
  const patterns = [
    { pattern: /gsd_state_version/g, to: 'oto_state_version' },
    { pattern: /gsd-sdk/g, to: 'oto-sdk' },
    { pattern: /(?<![A-Za-z])gsd(?=[A-Z_\d-])/g, to: 'oto' },
    { pattern: /(?<![A-Za-z])GSD(?=[A-Z_\d-])/g, to: 'OTO' },
    { pattern: /gsd(?=[A-Z][a-z])/g, to: 'oto' },
    { pattern: /GSD(?=[A-Z][a-z])/g, to: 'OTO' },
    { pattern: /gsd(?=-tools)/g, to: 'oto' },
    { pattern: /gsd(?= init\b)/g, to: 'oto' },
    { pattern: /(?<![A-Za-z0-9])superpowers(?=[A-Z_/-])/g, to: 'oto' },
    { pattern: /(?<![A-Za-z0-9])Superpowers(?=[A-Z_/-])/g, to: 'Oto' },
    { pattern: /Superpowers(?=[A-Z][a-z])/g, to: 'Oto' },
    { pattern: /(?<=[a-z])Superpowers\b/g, to: 'Oto' }
  ];
  let output = text;
  for (const { pattern, to } of patterns) {
    output = output.replace(pattern, () => {
      replacements += 1;
      return to;
    });
  }
  return { text: output, replacements };
}

function applyRelPath(relPath, map) {
  return RULES.path.applyToFilename(relPath, map.rules.path || []);
}

function outputRelPathFor(entry, map, outRoot, inventoryByPath) {
  const inventoryEntry = inventoryEntryFor(entry.relPath, inventoryByPath);
  const targetPath = inventoryEntry && inventoryEntry.target_path;
  let outRelPath = targetPath || applyRelPath(entry.relPath, map);
  outRelPath = outRelPath.split(path.sep).join('/');

  if (path.basename(outRoot) === 'oto' && outRelPath.startsWith('oto/')) {
    outRelPath = outRelPath.slice('oto/'.length);
  }

  return outRelPath;
}

function shouldSkipInventoryEntry(relPath, inventoryByPath) {
  const inventoryEntry = inventoryEntryFor(relPath, inventoryByPath);
  return inventoryEntry && inventoryEntry.verdict === 'drop';
}

async function writeJsonAndMarkdownReports(dryrun) {
  const reportsDir = ensureReportsDir();
  await writeFileAtomic(path.join(reportsDir, 'rebrand-dryrun.json'), `${JSON.stringify(dryrun, null, 2)}\n`);
  await writeFileAtomic(path.join(reportsDir, 'rebrand-dryrun.md'), report.renderDryrunMarkdown(dryrun));
}

async function runDryRun(target, map, allowlist, inventoryByPath, owner) {
  const files = [];
  const summaryByRule = Object.fromEntries(DRYRUN_RULE_ORDER.map((ruleType) => [ruleType, 0]));
  let matchTotal = 0;
  for await (const entry of walker.walk(target, allowlist, inventoryByPath)) {
    if (shouldSkipInventoryEntry(entry.relPath, inventoryByPath)) continue;
    const context = contextFor(entry, owner, allowlist, inventoryByPath);
    const matches = dryrunMatches(entry, map, context);
    for (const match of matches) summaryByRule[match.rule_type] += 1;
    matchTotal += matches.length;
    files.push({
      path: entry.relPath,
      file_class: entry.file_class,
      allowlisted: entry.allowlisted,
      matches,
      unclassified_count: 0
    });
  }
  const dryrun = {
    version: '1',
    mode: 'dry-run',
    target,
    files,
    summary_by_rule_type: summaryByRule,
    match_total: matchTotal,
    unclassified_total: 0
  };
  await writeJsonAndMarkdownReports(dryrun);
  return { files: files.length, matches: matchTotal, unclassified: 0, exitCode: 0 };
}

async function applyTree(target, out, map, allowlist, inventoryByPath, owner, force = false, options = {}) {
  if (fs.existsSync(out) && !isDirEmpty(out)) {
    if (!force) throw new Error(`Output directory is not empty: ${out}`);
    await fsp.rm(out, { recursive: true, force: true });
  }
  await fsp.mkdir(out, { recursive: true });
  let files = 0;
  let matches = 0;
  for await (const entry of walker.walk(target, allowlist, inventoryByPath)) {
    if (shouldSkipInventoryEntry(entry.relPath, inventoryByPath)) continue;
    files += 1;
    const outRelPath = entry.allowlisted ? entry.relPath : outputRelPathFor(entry, map, out, inventoryByPath);
    const outPath = path.join(out, outRelPath);
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    if (entry.allowlisted) {
      await fsp.copyFile(entry.absPath, outPath);
      continue;
    }
    const context = contextFor(entry, owner, allowlist, inventoryByPath);
    const pkg = applyPackageIfNeeded(entry.content, entry.relPath, map, context);
    const text = applyStringRules(pkg.content, map, context);
    matches += pkg.replacements + text.replacements;
    await fsp.writeFile(outPath, text.content);
  }
  if (!options.skipReports) {
    const reportsDir = ensureReportsDir();
    const pre = await manifest.buildPre(target, allowlist, inventoryByPath);
    const post = await manifest.buildPost(out, allowlist, inventoryByPath);
    await writeFileAtomic(path.join(reportsDir, 'coverage-manifest.pre.json'), `${JSON.stringify(pre, null, 2)}\n`);
    await writeFileAtomic(path.join(reportsDir, 'coverage-manifest.post.json'), `${JSON.stringify(post, null, 2)}\n`);
    await writeFileAtomic(path.join(reportsDir, 'coverage-manifest.delta.md'), report.renderCoverageDeltaMarkdown(pre, post, allowlist));
    const failures = manifest.assertZeroOutsideAllowlist(post, allowlist);
    if (failures.length > 0) {
      const err = new Error(`Coverage assertion failed: ${failures.slice(0, 10).map((f) => `${f.path}:${f.token}=${f.count}`).join(', ')}`);
      err.exitCode = 3;
      throw err;
    }
  }
  return { files, matches, unclassified: 0, exitCode: 0 };
}

function collectFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    const parent = entry.parentPath || entry.path || root;
    const absPath = path.join(parent, entry.name);
    if (entry.isFile()) result.push(path.relative(root, absPath));
  }
  return result.sort();
}

function sha256OfFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function byteIdentical(rootA, rootB) {
  const a = collectFiles(rootA);
  const b = collectFiles(rootB);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    return { equal: false, reason: 'file list differs', diff: { onlyA: a.filter((x) => !b.includes(x)), onlyB: b.filter((x) => !a.includes(x)) } };
  }
  for (const relPath of a) {
    if (sha256OfFile(path.join(rootA, relPath)) !== sha256OfFile(path.join(rootB, relPath))) {
      return { equal: false, reason: `content differs at ${relPath}`, diff: [relPath] };
    }
  }
  return { equal: true, diff: [] };
}

async function runRoundtrip(target, map, allowlist, inventoryByPath, owner) {
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-rebrand-rt-A-'));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'oto-rebrand-rt-B-'));
  try {
    const first = await applyTree(target, dirA, map, allowlist, inventoryByPath, owner, true, { skipReports: true });
    const second = await applyTree(dirA, dirB, map, allowlist, inventoryByPath, owner, true, { skipReports: true });
    const comparison = byteIdentical(dirA, dirB);
    if (!comparison.equal) {
      console.error(`roundtrip diff: ${comparison.reason}`);
      if (comparison.diff) console.error(JSON.stringify(comparison.diff, null, 2));
      return { files: first.files + second.files, matches: first.matches + second.matches, unclassified: 0, exitCode: 1 };
    }
    return { files: first.files + second.files, matches: first.matches + second.matches, unclassified: 0, exitCode: 0 };
  } finally {
    await fsp.rm(dirA, { recursive: true, force: true });
    await fsp.rm(dirB, { recursive: true, force: true });
  }
}

async function run(opts = {}) {
  const started = Date.now();
  const mode = opts.mode || 'dry-run';
  const target = path.resolve(opts.target || path.join(repoRoot(), 'foundation-frameworks'));
  const owner = opts.owner || 'OTOJulian';
  let summary = { mode, files: 0, matches: 0, unclassified: 0, duration_ms: 0 };
  try {
    const { map, errors } = loadAndValidate(opts.mapPath || path.join(repoRoot(), 'rename-map.json'));
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      return { exitCode: 4, summary: { ...summary, errors } };
    }
    const inventoryByPath = buildInventoryMap();
    const allowlist = walker.compileAllowlist(map.do_not_rename);
    let result;
    if (mode === 'dry-run') {
      result = await runDryRun(target, map, allowlist, inventoryByPath, owner);
    } else if (mode === 'apply') {
      result = await applyTree(target, resolveOut(opts.out), map, allowlist, inventoryByPath, owner, Boolean(opts.force));
    } else if (mode === 'verify-roundtrip') {
      result = await runRoundtrip(target, map, allowlist, inventoryByPath, owner);
    } else {
      throw new Error(`Unknown rebrand mode: ${mode}`);
    }
    summary = { mode, files: result.files, matches: result.matches, unclassified: result.unclassified, duration_ms: Date.now() - started };
    console.log(`engine: ${mode} — ${summary.files} files, ${summary.matches} matches, ${summary.unclassified} unclassified, ${summary.duration_ms}ms`);
    return { exitCode: result.exitCode, summary };
  } catch (error) {
    const exitCode = error.exitCode || 5;
    console.error(error.message);
    summary = { ...summary, duration_ms: Date.now() - started };
    console.log(`engine: ${mode} — ${summary.files} files, ${summary.matches} matches, ${summary.unclassified} unclassified, ${summary.duration_ms}ms`);
    return { exitCode, summary, error };
  }
}

module.exports = { run, loadAndValidate, byteIdentical };
