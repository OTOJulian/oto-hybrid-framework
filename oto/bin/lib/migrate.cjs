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
const engine = require('../../../scripts/rebrand/lib/engine.cjs');

const RENAME_MAP_CANDIDATES = [
  path.resolve(__dirname, '..', '..', '..', 'rename-map.json'),
  path.resolve(__dirname, '..', '..', 'rename-map.json')
];
const INSTRUCTION_FILES = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'];
const RUNTIME_CONFIG_DIRS = ['.claude', '.codex', '.gemini'];

function resolveRenameMapPath() {
  for (const candidate of RENAME_MAP_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('rename-map.json not found at any of: ' + RENAME_MAP_CANDIDATES.join(', '));
}

const RENAME_MAP_PATH = resolveRenameMapPath();

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

function buildMigrateMapPath() {
  const map = JSON.parse(fs.readFileSync(RENAME_MAP_PATH, 'utf8'));
  const rules = { ...(map.rules || {}) };
  // B-01: .planning -> .oto is opt-in for migrate and not an engine path rule.
  rules.path = (rules.path || []).filter((rule) => rule.from !== '.planning');
  const derived = { ...map, rules };
  const mapPath = path.join(os.tmpdir(), `oto-migrate-map-${process.pid}-${Date.now()}-${crypto.randomUUID()}.json`);
  fs.writeFileSync(mapPath, `${JSON.stringify(derived, null, 2)}\n`);
  return {
    mapPath,
    cleanup: () => fs.rmSync(mapPath, { force: true })
  };
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
  if (hasOtoInstructionMarkers) conflicts.push('oto-markers-present');

  const planningDir = safeJoin(abs, '.planning');
  if (markdownFilesUnder(planningDir).some((filePath) => /\/gsd-\w/.test(readIfExists(filePath)))) {
    signals.push('gsd-command-refs');
  }

  if (fs.existsSync(safeJoin(abs, '.planning')) && fs.existsSync(safeJoin(abs, '.oto'))) {
    conflicts.push('both-state-dirs');
  }

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
    /<!-- GSD:([a-z-]+-(?:start|end))( source:[^ ]+)? -->/g,
    '<!-- OTO:$1$2 -->'
  );
}

function rewriteFrontmatterKey(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return text;
  const frontmatter = match[1].replace(/^gsd_state_version:/m, 'oto_state_version:');
  return text.replace(match[0], `---\n${frontmatter}\n---\n`);
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
      reportsDir: stagingReportsDir
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
      reportsDir
    });
    const reportPath = path.join(reportsDir, 'rebrand-dryrun.json');
    const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { files: [], summary_by_rule_type: {} };
    const markerReport = countInstructionMarkers(abs);
    const frontmatterReport = countStateFrontmatterKeys(abs);
    const ruleTypes = Object.entries(report.summary_by_rule_type || {})
      .filter(([, count]) => count > 0)
      .map(([ruleType]) => ruleType);
    if (markerReport.totalCount > 0) ruleTypes.push('marker');
    if (frontmatterReport.totalCount > 0) ruleTypes.push('frontmatter');

    return {
      mode: 'dry-run',
      files: report.files || [],
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

module.exports = { detectGsdProject, dryRun, rewriteMarkers, rewriteFrontmatterKey, _applyToStaging };
