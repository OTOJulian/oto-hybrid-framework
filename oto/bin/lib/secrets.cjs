'use strict';

/**
 * Secrets handling — masking convention for API keys and other
 * credentials managed via /oto-settings-integrations.
 *
 * Convention: strings 8+ chars long render as `****<last-4>`; shorter
 * strings render as `****` with no tail (to avoid leaking a meaningful
 * fraction of a short secret). null/empty renders as `(unset)`.
 *
 * Keys considered sensitive are listed in SECRET_CONFIG_KEYS and matched
 * at the exact key-path level. The list is intentionally narrow — these
 * are the fields documented as secrets in docs/CONFIGURATION.md.
 */

const SECRET_CONFIG_KEYS = new Set([
  'brave_search',
  'firecrawl',
  'exa_search',
]);

function isSecretKey(keyPath) {
  return SECRET_CONFIG_KEYS.has(keyPath);
}

function maskSecret(value) {
  if (value === null || value === undefined || value === '') return '(unset)';
  const s = String(value);
  if (s.length < 8) return '****';
  return '****' + s.slice(-4);
}

// ── OTO Phase 14: keyfile storage (SECR-01..03) ──
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const INTEGRATIONS = {
  exa: {
    configKey: 'exa_search',
    envVar: 'EXA_API_KEY',
    keyfileName: 'exa_api_key',
    label: 'Exa',
  },
  brave: {
    configKey: 'brave_search',
    envVar: 'BRAVE_API_KEY',
    keyfileName: 'brave_api_key',
    label: 'Brave',
  },
  firecrawl: {
    configKey: 'firecrawl',
    envVar: 'FIRECRAWL_API_KEY',
    keyfileName: 'firecrawl_api_key',
    label: 'Firecrawl',
  },
};

function integrationForConfigKey(configKey) {
  for (const [slug, entry] of Object.entries(INTEGRATIONS)) {
    if (entry.configKey === configKey) return { slug, ...entry };
  }
  return null;
}

function integrationForSlug(slug) {
  const integration = INTEGRATIONS[slug];
  if (!integration) throw new Error(`Unknown integration: ${slug}`);
  return integration;
}

function keyfileBase(baseDir) {
  return baseDir || path.join(os.homedir(), '.oto');
}

function keyfilePath(slug, baseDir) {
  const integration = integrationForSlug(slug);
  return path.join(keyfileBase(baseDir), integration.keyfileName);
}

function writeKeyfile(slug, value, baseDir) {
  const base = keyfileBase(baseDir);
  const target = keyfilePath(slug, base);
  fs.mkdirSync(base, { recursive: true, mode: 0o700 });

  // OTO Phase 14 gap-closure (WR-07 / SECR-01): never write through a
  // symlink or non-regular file, and tighten a pre-existing loose mode
  // BEFORE the new secret bytes land (heal-before-truncation).
  let st = null;
  try { st = fs.lstatSync(target); } catch { /* ENOENT — fresh create below */ }
  if (st) {
    if (!st.isFile()) {
      throw new Error(`refusing to write ${target}: not a regular file — remove it and retry`);
    }
    if ((st.mode & 0o077) !== 0) fs.chmodSync(target, 0o600);
  }

  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC
    | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(target, flags, 0o600);
  try {
    fs.writeSync(fd, String(value) + '\n');
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(target, 0o600);
}

function readKeyfile(slug, baseDir) {
  const target = keyfilePath(slug, baseDir);

  // OTO Phase 14 gap-closure (WR-07): lstat and refuse non-regular files
  // BEFORE any chmod — chmodSync would dereference a planted symlink.
  let st;
  try {
    st = fs.lstatSync(target);
  } catch {
    return null; // ENOENT — no keyfile
  }
  if (!st.isFile()) {
    process.stderr.write(`refusing to read ${target}: not a regular file — remove it and re-set via /oto-settings-integrations\n`);
    return null;
  }

  // D-12 heal FIRST (CR-01 ordering): tighten permissions before content
  // is read, so an empty loose-mode keyfile is still healed.
  let healed = false;
  if ((st.mode & 0o077) !== 0) {
    fs.chmodSync(target, 0o600);
    healed = true;
    process.stderr.write(`fixed permissions on ${target} (now 0600)\n`);
  }

  const value = fs.readFileSync(target, 'utf8').trim();
  // OTO Phase 14 gap-closure (CR-01 / SECR-03): an empty/whitespace-only
  // keyfile is not a credential — report it absent so migration overwrites
  // it instead of treating it as an authoritative conflicting keyfile, and
  // so status reports "no key detected" instead of an enabled-unset key.
  if (value === '') return null;

  return { value, healed };
}

function deleteKeyfile(slug, baseDir) {
  const target = keyfilePath(slug, baseDir);
  if (!fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}

function detectKeySource(slug, baseDir) {
  const integration = integrationForSlug(slug);
  const envValue = process.env[integration.envVar];
  const target = keyfilePath(slug, baseDir);

  if (typeof envValue === 'string' && envValue.trim() !== '') {
    return {
      source: 'env',
      envVar: integration.envVar,
      masked: maskSecret(envValue),
      shadowedKeyfile: fs.existsSync(target),
    };
  }

  const keyfile = readKeyfile(slug, baseDir);
  if (keyfile) {
    return { source: 'keyfile', path: target, masked: maskSecret(keyfile.value) };
  }

  return { source: null, masked: '(unset)' };
}

function validateIntegrationValue(configKey, value) {
  if (!SECRET_CONFIG_KEYS.has(configKey) || typeof value === 'boolean') {
    return { ok: true };
  }

  const integration = integrationForConfigKey(configKey);
  return {
    ok: false,
    message: `${configKey}: booleans only — to set your API key use /oto-settings-integrations (or 'oto-sdk query secret-set ${integration.slug}')`,
  };
}

function warnIfNoKeyDetected(configKey, baseDir) {
  const integration = integrationForConfigKey(configKey);
  if (!integration || detectKeySource(integration.slug, baseDir).source !== null) return;
  process.stderr.write(
    `no ${integration.label} API key detected (${integration.envVar} or ~/.oto/${integration.keyfileName}) — set one via /oto-settings-integrations or this flag has no effect.\n`,
  );
}

function atomicWrite(target, content) {
  const tempPath = target + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, target);
  } catch {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch { /* best-effort cleanup */ }
    fs.writeFileSync(target, content, 'utf8');
  }
}

// OTO Phase 14 gap-closure (WR-01 / SECR-03/04): legacy migration must
// contend on the same directory lock as ordinary CJS config writers.
const _heldConfigLocks = new Set();
let _configLockCleanupRegistered = false;

function registerConfigLockCleanup() {
  if (_configLockCleanupRegistered) return;
  _configLockCleanupRegistered = true;
  process.on('exit', () => {
    for (const lockPath of _heldConfigLocks) {
      try { fs.unlinkSync(lockPath); } catch { /* already released */ }
    }
    _heldConfigLocks.clear();
  });
}

function withConfigDirLock(configPath, fn, opts = {}) {
  const lockPath = path.join(path.dirname(configPath), '.lock');
  const timeoutMs = opts.timeoutMs ?? 10000;
  const retryDelay = 100;
  const start = Date.now();

  try { fs.mkdirSync(path.dirname(configPath), { recursive: true }); } catch { /* ok */ }

  let acquired = false;
  while (Date.now() - start < timeoutMs) {
    try {
      fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        acquired: new Date().toISOString(),
      }), { flag: 'wx' });
      acquired = true;
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 30000) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch { continue; }

      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelay);
    }
  }

  if (!acquired) {
    if (opts.onTimeout === 'skip') return { skipped: true };
    throw new Error('config lock timeout: ' + lockPath);
  }

  registerConfigLockCleanup();
  _heldConfigLocks.add(lockPath);
  try {
    return fn();
  } finally {
    _heldConfigLocks.delete(lockPath);
    try { fs.unlinkSync(lockPath); } catch { /* already released */ }
  }
}

function migrateLegacyIntegrationKeys(configPath, baseDir, opts = {}) {
  const migrateBody = () => {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { migrated: [] };
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { migrated: [] };
  }

  const migrated = [];
  const conflicts = [];
  let movedString = false;

  for (const [slug, integration] of Object.entries(INTEGRATIONS)) {
    if (!Object.prototype.hasOwnProperty.call(config, integration.configKey)) continue;
    const current = config[integration.configKey];
    if (typeof current === 'boolean') continue;

    if (typeof current === 'string' && current) {
      const existing = readKeyfile(slug, baseDir);
      if (existing && existing.value !== current) {
        conflicts.push(integration.configKey);
        process.stderr.write(
          `${integration.configKey}: keyfile ~/.oto/${integration.keyfileName} (${maskSecret(existing.value)}) kept; config string (${maskSecret(current)}) dropped — re-set via /oto-settings-integrations if wrong\n`,
        );
      } else {
        writeKeyfile(slug, current, baseDir);
        process.stderr.write(
          `migrated ${integration.configKey} API key from config.json to ~/.oto/${integration.keyfileName} (0600)\n`,
        );
      }
      config[integration.configKey] = true;
      movedString = true;
    } else {
      config[integration.configKey] = Boolean(current);
    }
    migrated.push(integration.configKey);
  }

  if (migrated.length === 0) return { migrated: [] };
  atomicWrite(configPath, JSON.stringify(config, null, 2) + '\n');
  if (movedString) {
    process.stderr.write(
      'note: this key may exist in git history — consider rotating it at the provider\n',
    );
  }
  return { migrated, conflicts };
  };

  if (opts.alreadyLocked) return migrateBody();
  const result = withConfigDirLock(configPath, migrateBody, {
    timeoutMs: 2000,
    onTimeout: 'skip',
  });
  if (result && result.skipped) return { migrated: [], skipped: true };
  return result;
}

// OTO Phase 14 gap-closure (CR-02 / SECR-01/02): integration-key strings are
// never legitimate BELOW the top level of a config about to be written —
// INCLUDING the empty string (an empty nested value is still a smuggling
// vector and never valid config). Returns the first offending dot-path
// (e.g. "0.exa_search", "git.exa_search") or null. The VALUE is never
// returned — callers must keep messages sanitized.
function findNestedIntegrationString(node, prefix) {
  if (!node || typeof node !== 'object') return null;
  for (const [key, value] of Object.entries(node)) {
    const keyPath = prefix ? prefix + '.' + key : key;
    if (SECRET_CONFIG_KEYS.has(key) && typeof value === 'string') return keyPath;
    if (value && typeof value === 'object') {
      const nested = findNestedIntegrationString(value, keyPath);
      if (nested) return nested;
    }
  }
  return null;
}

/**
 * Validate and reconcile the integration fields of a fully merged
 * new-project config in two phases (CR-02 / WR-06 / SECR-01/02).
 *
 * Phase A validates every caller value, recursively scans the merged config,
 * and classifies raw-default migrations without writing. Phase B writes the
 * classified keyfiles with compensation, then finalizes booleans and heals
 * oto-owned defaults. A caller boolean controls config while a raw legacy
 * string retains independent migration provenance.
 */
function reconcileNewProjectIntegrations(merged, userChoices, baseDir, rawDefaults = {}) {
  const choices = userChoices || {};

  // Phase A: complete validation and classification with no reconcile writes.
  for (const [key, value] of Object.entries(merged)) {
    if (!value || typeof value !== 'object') continue;
    const offender = findNestedIntegrationString(value, key);
    if (offender) {
      return {
        ok: false,
        message: `${offender}: integration API keys are not allowed in config — booleans only; set keys via /oto-settings-integrations (or 'oto-sdk query secret-set <integration>')`,
      };
    }
  }

  for (const { configKey } of Object.values(INTEGRATIONS)) {
    if (
      Object.prototype.hasOwnProperty.call(choices, configKey) &&
      typeof choices[configKey] !== 'boolean'
    ) {
      return validateIntegrationValue(configKey, merged[configKey]);
    }
  }

  const candidates = [];
  for (const [slug, integration] of Object.entries(INTEGRATIONS)) {
    const callerOwned = Object.prototype.hasOwnProperty.call(choices, integration.configKey);
    const rawDefault = rawDefaults && rawDefaults[integration.configKey];
    const value =
      typeof rawDefault === 'string' && rawDefault !== ''
        ? rawDefault
        : !callerOwned && typeof merged[integration.configKey] === 'string' && merged[integration.configKey] !== ''
          ? merged[integration.configKey]
          : null;
    if (value === null) continue;

    const existing = readKeyfile(slug, baseDir);
    candidates.push({
      slug,
      integration,
      value,
      existing,
      conflict: Boolean(existing && existing.value !== value),
    });
  }

  // Phase B: commit keyfiles. Any failure restores all targets attempted in
  // this run, including a partially-created failing target.
  const attempted = [];
  for (const candidate of candidates) {
    if (candidate.conflict) {
      process.stderr.write(
        `${candidate.integration.configKey}: keyfile ~/.oto/${candidate.integration.keyfileName} (${maskSecret(candidate.existing.value)}) kept; config string (${maskSecret(candidate.value)}) dropped — re-set via /oto-settings-integrations if wrong\n`,
      );
      continue;
    }

    attempted.push(candidate);
    try {
      writeKeyfile(candidate.slug, candidate.value, baseDir);
      process.stderr.write(
        `migrated ${candidate.integration.configKey} API key from global defaults to ~/.oto/${candidate.integration.keyfileName} (0600)\n`,
      );
    } catch {
      for (const prior of attempted.reverse()) {
        try {
          if (prior.existing) writeKeyfile(prior.slug, prior.existing.value, baseDir);
          else deleteKeyfile(prior.slug, baseDir);
        } catch { /* best-effort compensation; preserve the sanitized failure */ }
      }
      return {
        ok: false,
        message: `${candidate.integration.configKey}: keyfile write failed — nothing was written (fix ~/.oto permissions and retry)`,
      };
    }
  }

  const migrated = candidates.map(({ integration }) => integration.configKey);
  const migratedSet = new Set(migrated);
  for (const integration of Object.values(INTEGRATIONS)) {
    if (
      Object.prototype.hasOwnProperty.call(choices, integration.configKey) &&
      typeof choices[integration.configKey] === 'boolean'
    ) {
      merged[integration.configKey] = choices[integration.configKey];
    } else if (migratedSet.has(integration.configKey)) {
      merged[integration.configKey] = true;
    } else {
      merged[integration.configKey] = Boolean(merged[integration.configKey]);
    }
  }

  if (migrated.length > 0) {
    // Best-effort heal of the OTO-OWNED ~/.oto/defaults.json only, so the
    // next new-project run doesn't re-migrate. Failure just means a repeat
    // masked notice (accepted, T-14-05-05). defaults.json is not git-tracked,
    // so no rotation warning is needed here.
    try {
      const defaultsPath = path.join(keyfileBase(baseDir), 'defaults.json');
      const defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
      if (defaults && typeof defaults === 'object' && !Array.isArray(defaults)) {
        let changed = false;
        for (const configKey of migrated) {
          if (typeof defaults[configKey] === 'string' && defaults[configKey]) {
            defaults[configKey] = true;
            changed = true;
          }
        }
        if (changed) {
          fs.writeFileSync(defaultsPath, JSON.stringify(defaults, null, 2), 'utf8');
        }
      }
    } catch { /* best-effort — repeat masked notices are the accepted fallback */ }
  }

  return { ok: true, migrated };
}

module.exports = {
  SECRET_CONFIG_KEYS,
  isSecretKey,
  maskSecret,
  INTEGRATIONS,
  integrationForConfigKey,
  keyfileBase,
  keyfilePath,
  writeKeyfile,
  readKeyfile,
  deleteKeyfile,
  detectKeySource,
  validateIntegrationValue,
  warnIfNoKeyDetected,
  withConfigDirLock,
  migrateLegacyIntegrationKeys,
  findNestedIntegrationString,
  reconcileNewProjectIntegrations,
};
