'use strict';

/**
 * /oto-migrate handler: converts a GSD-era user project to oto's planning surface.
 *
 * The migrate command reuses the rebrand engine for string rewrites, then adds
 * project detection, migrate-scoped rename-map filtering, marker/frontmatter
 * cleanup, backup, idempotency, and CLI dispatch.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const engine = require('../../../scripts/rebrand/lib/engine.cjs');

const RENAME_MAP_CANDIDATES = [
  path.resolve(__dirname, '..', '..', '..', 'rename-map.json'),
  path.resolve(__dirname, '..', '..', 'rename-map.json')
];
const INSTRUCTION_FILES = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'];
const RUNTIME_CONFIG_DIRS = ['.claude', '.codex', '.gemini'];
const LEGACY_RUNTIME_SUPPORT_DIR = 'get-shit-done';
const OTO_RUNTIME_SUPPORT_DIR = 'oto';
const LEGACY_RUNTIME_COMMAND_DIR = 'gsd';
const OTO_RUNTIME_COMMAND_DIR = 'oto';
const LEGACY_RUNTIME_PREFIX = 'gsd-';
const OTO_RUNTIME_PREFIX = 'oto-';
const RUNTIME_PREFIXED_SURFACE_DIRS = ['agents', 'commands', 'skills'];

function resolveRenameMapPath() {
  for (const candidate of RENAME_MAP_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('rename-map.json not found at any of: ' + RENAME_MAP_CANDIDATES.join(', '));
}

const RENAME_MAP_PATH = resolveRenameMapPath();
const RUNTIME_WORKTREE_DIRS = RUNTIME_CONFIG_DIRS.map((dir) => path.join(dir, 'worktrees'));
const MIGRATE_SKIP_PATTERNS = ['.oto-migrate-backup', '.git', 'node_modules', ...RUNTIME_WORKTREE_DIRS];

function assertNotRuntimeConfigDir(projectDir) {
  const abs = path.resolve(projectDir);
  const home = os.homedir();
  for (const name of RUNTIME_CONFIG_DIRS) {
    const runtimeDir = path.join(home, name);
    if (abs === runtimeDir || abs.startsWith(runtimeDir + path.sep)) {
      throw new Error('refusing to migrate runtime config dir: ' + abs);
    }
  }
}

function safeJoin(projectDir, relPath) {
  const root = fs.realpathSync(projectDir);
  const candidate = path.resolve(root, relPath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('refusing path traversal: ' + relPath);
  }
  return candidate;
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readFirstNLines(filePath, count) {
  return readIfExists(filePath).split(/\r?\n/).slice(0, count).join('\n');
}

function hasGsdMarker(text) {
  return text.includes('<!-- GSD:');
}

function hasOtoMarker(text) {
  return text.includes('<!-- OTO:');
}

function markdownFilesUnder(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const parent = entry.parentPath || entry.path || root;
      return path.join(parent, entry.name);
    });
}

function listDirectEntries(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true });
}

function listLegacyRuntimeSurfacePaths(projectDir) {
  const rels = new Set();
  for (const runtimeDir of RUNTIME_CONFIG_DIRS) {
    const supportRoot = path.join(runtimeDir, LEGACY_RUNTIME_SUPPORT_DIR);
    if (fs.existsSync(safeJoin(projectDir, supportRoot))) rels.add(supportRoot);

    const commandRoot = path.join(runtimeDir, 'commands', LEGACY_RUNTIME_COMMAND_DIR);
    if (fs.existsSync(safeJoin(projectDir, commandRoot))) rels.add(commandRoot);

    for (const surfaceDir of RUNTIME_PREFIXED_SURFACE_DIRS) {
      const surfaceRootRel = path.join(runtimeDir, surfaceDir);
      const surfaceRoot = safeJoin(projectDir, surfaceRootRel);
      for (const entry of listDirectEntries(surfaceRoot)) {
        if (entry.name.startsWith(LEGACY_RUNTIME_PREFIX)) {
          rels.add(path.join(surfaceRootRel, entry.name));
        }
      }
    }
  }
  return Array.from(rels).filter((relPath) => !shouldSkipRelPath(relPath, MIGRATE_SKIP_PATTERNS)).sort();
}

function listLegacyRuntimeSurfaceFiles(projectDir) {
  const rels = new Set();
  for (const relPath of listLegacyRuntimeSurfacePaths(projectDir)) {
    const abs = safeJoin(projectDir, relPath);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      rels.add(relPath);
    } else if (stat.isDirectory()) {
      for (const nested of listFiles(abs, MIGRATE_SKIP_PATTERNS)) {
        rels.add(path.join(relPath, nested));
      }
    }
  }
  return Array.from(rels).filter((relPath) => !shouldSkipRelPath(relPath, MIGRATE_SKIP_PATTERNS)).sort();
}

function denormalizeRelPath(relPath) {
  return relPath.split('/').join(path.sep);
}

function targetForLegacyRuntimeSurfacePath(relPath) {
  const normalized = normalizeRelPath(relPath);
  for (const runtimeDir of RUNTIME_CONFIG_DIRS.map((dir) => normalizeRelPath(dir))) {
    const supportRoot = `${runtimeDir}/${LEGACY_RUNTIME_SUPPORT_DIR}`;
    if (normalized === supportRoot || normalized.startsWith(`${supportRoot}/`)) {
      return denormalizeRelPath(`${runtimeDir}/${OTO_RUNTIME_SUPPORT_DIR}${normalized.slice(supportRoot.length)}`);
    }

    const commandRoot = `${runtimeDir}/commands/${LEGACY_RUNTIME_COMMAND_DIR}`;
    if (normalized === commandRoot || normalized.startsWith(`${commandRoot}/`)) {
      return denormalizeRelPath(`${runtimeDir}/commands/${OTO_RUNTIME_COMMAND_DIR}${normalized.slice(commandRoot.length)}`);
    }

    for (const surfaceDir of RUNTIME_PREFIXED_SURFACE_DIRS) {
      const prefixedRoot = `${runtimeDir}/${surfaceDir}/${LEGACY_RUNTIME_PREFIX}`;
      if (normalized.startsWith(prefixedRoot)) {
        return denormalizeRelPath(`${runtimeDir}/${surfaceDir}/${OTO_RUNTIME_PREFIX}${normalized.slice(prefixedRoot.length)}`);
      }
    }
  }
  return null;
}

function buildMigrateMapPath() {
  const map = JSON.parse(fs.readFileSync(RENAME_MAP_PATH, 'utf8'));
  const rules = { ...(map.rules || {}) };
  // B-01: .planning -> .oto is opt-in for migrate and not an engine path rule.
  rules.path = (rules.path || []).filter((rule) => rule.from !== '.planning');
  rules.path.push({ from: LEGACY_RUNTIME_SUPPORT_DIR, to: OTO_RUNTIME_SUPPORT_DIR, match: 'segment' });
  const derived = { ...map, rules };
  const mapPath = path.join(os.tmpdir(), `oto-migrate-map-${process.pid}-${Date.now()}-${crypto.randomUUID()}.json`);
  fs.writeFileSync(mapPath, `${JSON.stringify(derived, null, 2)}\n`);
  return {
    mapPath,
    cleanup: () => fs.rmSync(mapPath, { force: true })
  };
}

function listIgnoredUntrackedPaths(projectDir) {
  const result = spawnSync('git', [
    '-C',
    projectDir,
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '--directory'
  ], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\/+$/g, ''))
    .filter(Boolean)
    .filter((relPath) => !relPath.startsWith('../') && !path.isAbsolute(relPath));
}

function listEngineSkipRelPaths(projectDir) {
  return Array.from(new Set([...MIGRATE_SKIP_PATTERNS, ...listIgnoredUntrackedPaths(projectDir)])).sort();
}

function detectGsdProject(projectDir) {
  const abs = path.resolve(projectDir);
  assertNotRuntimeConfigDir(abs);

  const signals = [];
  const conflicts = [];

  for (const stateRel of ['.planning/STATE.md', '.oto/STATE.md']) {
    const stateHead = readFirstNLines(safeJoin(abs, stateRel), 30);
    if (stateHead.includes('gsd_state_version')) {
      signals.push('gsd-state-frontmatter');
      break;
    }
  }

  let hasGsdInstructionMarkers = false;
  let hasOtoInstructionMarkers = false;
  for (const name of INSTRUCTION_FILES) {
    const text = readIfExists(safeJoin(abs, name));
    if (hasGsdMarker(text)) hasGsdInstructionMarkers = true;
    if (hasOtoMarker(text)) hasOtoInstructionMarkers = true;
  }
  if (hasGsdInstructionMarkers) signals.push('gsd-instruction-markers');

  const planningDir = safeJoin(abs, '.planning');
  if (markdownFilesUnder(planningDir).some((filePath) => /\/gsd-\w/.test(readIfExists(filePath)))) {
    signals.push('gsd-command-refs');
  }

  const runtimeSurfacePaths = listLegacyRuntimeSurfacePaths(abs);
  if (runtimeSurfacePaths.length > 0) {
    signals.push('gsd-runtime-paths');
  }

  if (fs.existsSync(safeJoin(abs, '.planning')) && fs.existsSync(safeJoin(abs, '.oto'))) {
    conflicts.push('both-state-dirs');
  }

  const runtimePathCollision = listLegacyRuntimeSurfaceFiles(abs).some((relPath) => {
    const target = targetForLegacyRuntimeSurfacePath(relPath);
    return target && fs.existsSync(safeJoin(abs, target));
  });
  if (runtimePathCollision) conflicts.push('runtime-path-collision');

  const hasContentGsdSignals = signals.some((signal) => signal !== 'gsd-runtime-paths');
  if (hasOtoInstructionMarkers && hasContentGsdSignals) conflicts.push('oto-markers-present');

  return { isGsdEra: signals.length > 0, signals, conflicts };
}

function countInstructionMarkers(projectDir) {
  let totalCount = 0;
  const files = [];
  for (const name of INSTRUCTION_FILES) {
    const text = readIfExists(safeJoin(projectDir, name));
    const matches = text.match(/<!-- GSD:/g) || [];
    if (matches.length > 0) files.push({ path: name, count: matches.length });
    totalCount += matches.length;
  }
  return { totalCount, files };
}

function countStateFrontmatterKeys(projectDir) {
  const statePath = safeJoin(projectDir, '.planning/STATE.md');
  const count = readFirstNLines(statePath, 30).includes('gsd_state_version') ? 1 : 0;
  return { totalCount: count, files: count ? [{ path: '.planning/STATE.md', count }] : [] };
}

function isoTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function rewriteMarkers(text) {
  return text.replace(
    /<!-- GSD:([a-z-]+-(?:start|end))([^>]*) -->/g,
    '<!-- OTO:$1$2 -->'
  ).replace(
    /(<!-- OTO:[a-z-]+-start source:)oto defaults( -->)/gi,
    '$1GSD defaults$2'
  );
}

function rewriteFrontmatterKey(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return text;
  const frontmatter = match[1].replace(/^gsd_state_version:/m, 'oto_state_version:');
  return text.replace(match[0], `---\n${frontmatter}\n---\n`);
}

function rewriteInstructionBody(text) {
  return rewriteMarkers(text).replace(/\/gsd-/g, '/oto-');
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

async function _applyToStaging(projectDir, opts = {}) {
  const abs = path.resolve(projectDir);
  assertNotRuntimeConfigDir(abs);

  const detection = detectGsdProject(abs);
  if (!detection.isGsdEra) return { skipped: true, reason: 'no GSD signals' };
  if (detection.conflicts.length > 0 && !opts.force) {
    const error = new Error('half-migrated state detected: ' + detection.conflicts.join(','));
    error.exitCode = 2;
    throw error;
  }

  const { mapPath, cleanup } = buildMigrateMapPath();
  const stagingOut = await fsp.mkdtemp(path.join(os.tmpdir(), 'oto-migrate-out-'));
  const stagingReportsDir = path.join(os.tmpdir(), `oto-migrate-reports-${process.pid}-${Date.now()}-${crypto.randomUUID()}`);

  try {
    const engineResult = await engine.run({
      mode: 'apply',
      target: abs,
      out: stagingOut,
      force: true,
      owner: opts.owner || 'OTOJulian',
      mapPath,
      reportsDir: stagingReportsDir,
      skipRelPaths: listEngineSkipRelPaths(abs)
    });
    if (engineResult.exitCode !== 0) {
      const error = new Error('engine apply failed: exitCode=' + engineResult.exitCode);
      error.exitCode = engineResult.exitCode;
      throw error;
    }

    for (const name of INSTRUCTION_FILES) {
      const filePath = path.join(stagingOut, name);
      if (!fs.existsSync(filePath)) continue;
      const text = await fsp.readFile(filePath, 'utf8');
      const rewritten = rewriteMarkers(text);
      if (rewritten !== text) await writeFileAtomic(filePath, rewritten);
    }

    const statePath = path.join(stagingOut, '.planning', 'STATE.md');
    if (fs.existsSync(statePath)) {
      const text = await fsp.readFile(statePath, 'utf8');
      const rewritten = rewriteFrontmatterKey(text);
      if (rewritten !== text) await writeFileAtomic(statePath, rewritten);
    }

    return { skipped: false, stagingOut, stagingReportsDir, cleanupMap: cleanup, detection };
  } catch (error) {
    await fsp.rm(stagingOut, { recursive: true, force: true });
    await fsp.rm(stagingReportsDir, { recursive: true, force: true });
    cleanup();
    throw error;
  }
}

function normalizeRelPath(relPath) {
  return relPath.split(path.sep).join('/');
}

function shouldSkipRelPath(relPath, skipPatterns) {
  const normalized = normalizeRelPath(relPath);
  const segments = normalized.split('/');
  return skipPatterns.some((pattern) => {
    const normalizedPattern = normalizeRelPath(pattern);
    if (!normalizedPattern) return false;
    if (!normalizedPattern.includes('/')) return segments.includes(normalizedPattern);
    return normalized === normalizedPattern || normalized.startsWith(`${normalizedPattern}/`);
  });
}

function listFiles(root, skipPatterns = []) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath || entry.path || root;
      return path.relative(root, path.join(parent, entry.name));
    })
    .filter((relPath) => !shouldSkipRelPath(relPath, skipPatterns))
    .sort();
}

function listFilesToBackup(projectDir, scope = 'planning') {
  const rels = new Set();
  for (const name of INSTRUCTION_FILES) {
    if (fs.existsSync(safeJoin(projectDir, name))) rels.add(name);
  }
  if (fs.existsSync(safeJoin(projectDir, '.gitignore'))) rels.add('.gitignore');
  const statePath = '.planning/STATE.md';
  if (fs.existsSync(safeJoin(projectDir, statePath))) rels.add(statePath);

  if (scope === 'planning' || scope === 'all') {
    for (const relPath of listFiles(safeJoin(projectDir, '.planning'), MIGRATE_SKIP_PATTERNS)) {
      if (/\.(md|json)$/.test(relPath)) rels.add(path.join('.planning', relPath));
    }
  }

  if (scope === 'all') {
    for (const relPath of listFiles(projectDir, MIGRATE_SKIP_PATTERNS)) {
      if (!relPath.includes(path.sep) && relPath.endsWith('.md')) rels.add(relPath);
    }
  }

  for (const runtimeDir of RUNTIME_CONFIG_DIRS) {
    const supportRoot = path.join(runtimeDir, LEGACY_RUNTIME_SUPPORT_DIR);
    for (const relPath of listFiles(safeJoin(projectDir, supportRoot), MIGRATE_SKIP_PATTERNS)) {
      rels.add(path.join(supportRoot, relPath));
    }
  }

  for (const relPath of listLegacyRuntimeSurfaceFiles(projectDir)) {
    rels.add(relPath);
  }

  return Array.from(rels).filter((relPath) => !shouldSkipRelPath(relPath, MIGRATE_SKIP_PATTERNS)).sort();
}

async function copyTreeAtomic(src, dst, skipPatterns = []) {
  for (const relPath of listFiles(src, skipPatterns)) {
    const absSrc = path.join(src, relPath);
    const absDst = path.join(dst, relPath);
    await fsp.mkdir(path.dirname(absDst), { recursive: true });
    await writeFileAtomic(absDst, await fsp.readFile(absSrc));
  }
}

async function filesEqual(left, right) {
  const [leftContent, rightContent] = await Promise.all([fsp.readFile(left), fsp.readFile(right)]);
  return Buffer.compare(leftContent, rightContent) === 0;
}

async function moveFileIfSafe(fromAbs, toAbs, fromRel, toRel, opts = {}) {
  if (fs.existsSync(toAbs)) {
    if (opts.preferDestination) {
      await fsp.unlink(fromAbs);
      return [toRel];
    }
    const fromStat = fs.statSync(fromAbs);
    const toStat = fs.statSync(toAbs);
    if (!fromStat.isFile() || !toStat.isFile() || !(await filesEqual(fromAbs, toAbs))) {
      const error = new Error(`runtime path collision: ${fromRel} -> ${toRel}`);
      error.exitCode = 2;
      throw error;
    }
    await fsp.unlink(fromAbs);
    return [toRel];
  }
  await fsp.mkdir(path.dirname(toAbs), { recursive: true });
  await fsp.rename(fromAbs, toAbs);
  return [toRel];
}

async function moveDirectoryIfSafe(projectDir, fromRel, toRel, opts = {}) {
  const fromAbs = safeJoin(projectDir, fromRel);
  if (!fs.existsSync(fromAbs)) return [];
  const fromStat = fs.statSync(fromAbs);
  if (!fromStat.isDirectory()) {
    return moveFileIfSafe(fromAbs, safeJoin(projectDir, toRel), fromRel, toRel, opts);
  }

  const toAbs = safeJoin(projectDir, toRel);
  const changed = [];
  if (!fs.existsSync(toAbs)) {
    const nestedFiles = listFiles(fromAbs, MIGRATE_SKIP_PATTERNS);
    await fsp.mkdir(path.dirname(toAbs), { recursive: true });
    await fsp.rename(fromAbs, toAbs);
    return nestedFiles.map((nested) => path.join(toRel, nested));
  }

  for (const nested of listFiles(fromAbs, MIGRATE_SKIP_PATTERNS)) {
    const nestedFromRel = path.join(fromRel, nested);
    const nestedToRel = path.join(toRel, nested);
    changed.push(...await moveFileIfSafe(
      safeJoin(projectDir, nestedFromRel),
      safeJoin(projectDir, nestedToRel),
      nestedFromRel,
      nestedToRel,
      opts
    ));
  }
  await fsp.rm(fromAbs, { recursive: true, force: true });
  return changed;
}

async function renamePrefixedRuntimeEntries(projectDir, runtimeDir, surfaceDir) {
  const surfaceRootRel = path.join(runtimeDir, surfaceDir);
  const surfaceRoot = safeJoin(projectDir, surfaceRootRel);
  const changed = [];
  for (const entry of listDirectEntries(surfaceRoot)) {
    if (!entry.name.startsWith(LEGACY_RUNTIME_PREFIX)) continue;
    const renamed = `${OTO_RUNTIME_PREFIX}${entry.name.slice(LEGACY_RUNTIME_PREFIX.length)}`;
    changed.push(...await moveDirectoryIfSafe(
      projectDir,
      path.join(surfaceRootRel, entry.name),
      path.join(surfaceRootRel, renamed),
      { preferDestination: true }
    ));
  }
  return changed;
}

async function renameProjectRuntimeSurfacePaths(projectDir) {
  const changed = [];
  for (const runtimeDir of RUNTIME_CONFIG_DIRS) {
    changed.push(...await moveDirectoryIfSafe(
      projectDir,
      path.join(runtimeDir, LEGACY_RUNTIME_SUPPORT_DIR),
      path.join(runtimeDir, OTO_RUNTIME_SUPPORT_DIR),
      { preferDestination: true }
    ));
    changed.push(...await moveDirectoryIfSafe(
      projectDir,
      path.join(runtimeDir, 'commands', LEGACY_RUNTIME_COMMAND_DIR),
      path.join(runtimeDir, 'commands', OTO_RUNTIME_COMMAND_DIR),
      { preferDestination: true }
    ));
    for (const surfaceDir of RUNTIME_PREFIXED_SURFACE_DIRS) {
      changed.push(...await renamePrefixedRuntimeEntries(projectDir, runtimeDir, surfaceDir));
    }
  }
  return Array.from(new Set(changed)).sort();
}

async function apply(projectDir, opts = {}) {
  const abs = path.resolve(projectDir);
  const staged = await _applyToStaging(abs, opts);
  if (staged.skipped) {
    return { mode: 'apply', filesChanged: [], reason: staged.reason, exitCode: 0 };
  }

  const { stagingOut, stagingReportsDir, cleanupMap } = staged;
  let backupDir = null;
  try {
    if (!opts.noBackup) {
      backupDir = path.join(abs, '.oto-migrate-backup', isoTimestamp());
      for (const relPath of listFilesToBackup(abs, opts.scope || 'planning')) {
        const src = safeJoin(abs, relPath);
        if (!fs.existsSync(src)) continue;
        const dst = path.join(backupDir, relPath);
        await fsp.mkdir(path.dirname(dst), { recursive: true });
        await fsp.copyFile(src, dst);
      }
    }

    const filesChanged = listFiles(stagingOut, MIGRATE_SKIP_PATTERNS);
    await copyTreeAtomic(stagingOut, abs, MIGRATE_SKIP_PATTERNS);
    for (const relPath of await renameProjectRuntimeSurfacePaths(abs)) {
      if (!filesChanged.includes(relPath)) filesChanged.push(relPath);
    }

    for (const name of INSTRUCTION_FILES) {
      const filePath = safeJoin(abs, name);
      if (!fs.existsSync(filePath)) continue;
      const text = await fsp.readFile(filePath, 'utf8');
      const rewritten = rewriteInstructionBody(text);
      if (rewritten !== text) {
        await writeFileAtomic(filePath, rewritten);
        if (!filesChanged.includes(name)) filesChanged.push(name);
      }
    }

    if (opts.renameStateDir) {
      const planning = path.join(abs, '.planning');
      const oto = path.join(abs, '.oto');
      if (fs.existsSync(planning) && !fs.existsSync(oto)) await fsp.rename(planning, oto);
      const gitignore = path.join(abs, '.gitignore');
      if (fs.existsSync(gitignore)) {
        const text = await fsp.readFile(gitignore, 'utf8');
        const rewritten = text.replace(/^\.planning\//gm, '.oto/');
        if (rewritten !== text) await writeFileAtomic(gitignore, rewritten);
      }
    }

    const post = detectGsdProject(abs);
    if (post.signals.length > 0) {
      const error = new Error('apply did not eliminate all GSD signals: ' + post.signals.join(','));
      error.exitCode = 6;
      throw error;
    }

    return { mode: 'apply', filesChanged: filesChanged.sort(), backupDir, exitCode: 0 };
  } finally {
    await fsp.rm(stagingOut, { recursive: true, force: true });
    await fsp.rm(stagingReportsDir, { recursive: true, force: true });
    cleanupMap();
  }
}

async function main(args = [], cwd = process.cwd()) {
  // Supported flags: --dry-run --apply --rename-state-dir --no-backup --force --scope --project-dir
  let values;
  try {
    const parsed = require('node:util').parseArgs({
      args,
      options: {
        'dry-run': { type: 'boolean', default: false },
        apply: { type: 'boolean', default: false },
        'rename-state-dir': { type: 'boolean', default: false },
        'no-backup': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        scope: { type: 'string', default: 'planning' },
        owner: { type: 'string', default: 'OTOJulian' },
        'project-dir': { type: 'string' }
      },
      strict: true,
      allowPositionals: false
    });
    values = parsed.values;
  } catch (error) {
    process.stderr.write(`migrate: error: ${error.message}\n`);
    return 1;
  }

  const projectDir = path.resolve(values['project-dir'] || cwd || process.cwd());
  const mode = values.apply ? 'apply' : 'dry-run';
  const opts = {
    renameStateDir: values['rename-state-dir'],
    noBackup: values['no-backup'],
    force: values.force,
    scope: values.scope,
    owner: values.owner
  };

  try {
    const result = mode === 'apply'
      ? await apply(projectDir, opts)
      : await dryRun(projectDir, opts);
    const noSignals = result.reason === 'no GSD signals' || result.summary?.reason === 'no GSD signals';
    if (noSignals && !values['dry-run'] && !values.apply) {
      process.stderr.write(`migrate: not a GSD-era project: ${projectDir}\n`);
      return 1;
    }
    process.stdout.write(`migrate: ${mode} - files=${(result.filesChanged || result.files || []).length}, exit=${result.exitCode}\n`);
    return result.exitCode || 0;
  } catch (error) {
    process.stderr.write(`migrate: error: ${error.message}\n`);
    return error.exitCode || 5;
  }
}

async function dryRun(projectDir, opts = {}) {
  const abs = path.resolve(projectDir);
  const detection = detectGsdProject(abs);
  if (!detection.isGsdEra) {
    return { mode: 'dry-run', files: [], summary: { reason: 'no GSD signals', rule_types: [] }, exitCode: 0 };
  }

  const { mapPath, cleanup } = buildMigrateMapPath();
  const reportsDir = path.join(os.tmpdir(), `oto-migrate-reports-${process.pid}-${Date.now()}-${crypto.randomUUID()}`);
  try {
    const engineResult = await engine.run({
      mode: 'dry-run',
      target: abs,
      owner: opts.owner || 'OTOJulian',
      mapPath,
      reportsDir,
      skipRelPaths: listEngineSkipRelPaths(abs)
    });
    const reportPath = path.join(reportsDir, 'rebrand-dryrun.json');
    const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { files: [], summary_by_rule_type: {} };
    const markerReport = countInstructionMarkers(abs);
    const frontmatterReport = countStateFrontmatterKeys(abs);
    const runtimeSurfaceFiles = listLegacyRuntimeSurfaceFiles(abs);
    const files = Array.isArray(report.files) ? [...report.files] : [];
    const reportedPaths = new Set(files.map((file) => file.path));
    for (const relPath of runtimeSurfaceFiles) {
      if (!reportedPaths.has(relPath)) files.push({ path: relPath, matches: [], rule_type: 'path' });
    }
    const ruleTypes = Object.entries(report.summary_by_rule_type || {})
      .filter(([, count]) => count > 0)
      .map(([ruleType]) => ruleType);
    if (markerReport.totalCount > 0) ruleTypes.push('marker');
    if (frontmatterReport.totalCount > 0) ruleTypes.push('frontmatter');
    if (listLegacyRuntimeSurfacePaths(abs).length > 0) ruleTypes.push('path');

    return {
      mode: 'dry-run',
      files,
      summary: {
        engine_invocation: { mode: 'dry-run', target: abs, mapPath },
        marker_blocks: markerReport.totalCount,
        frontmatter_keys: frontmatterReport.totalCount,
        rule_types: Array.from(new Set(ruleTypes))
      },
      exitCode: engineResult.exitCode
    };
  } finally {
    cleanup();
    await fsp.rm(reportsDir, { recursive: true, force: true });
  }
}

module.exports = { detectGsdProject, dryRun, apply, main, rewriteMarkers, rewriteFrontmatterKey, _applyToStaging };
