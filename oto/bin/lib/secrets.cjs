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

function migrateLegacyIntegrationKeys(configPath, baseDir) {
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
}

/**
 * Validate/migrate the integration fields of a fully merged new-project
 * config BEFORE any write (Phase 14 gap-closure, CR-01 / SECR-02).
 *
 * - Caller-supplied non-boolean (present in userChoices): hard reject with
 *   the sanitized D-05 message — returns { ok:false, message }; the value is
 *   never echoed.
 * - Trusted global-default string (from ~/.oto/defaults.json, NOT owned by
 *   userChoices): migrate to a 0600 keyfile (keyfile-wins on conflict, D-02)
 *   and set the config field to boolean true. The oto-owned defaults.json is
 *   then best-effort healed so re-migration doesn't repeat.
 * - Any other non-boolean: coerced via Boolean(value).
 *
 * This helper NEVER touches the foreign GSD install's state dir (D-08 —
 * that directory is read-only for oto; only oto-owned paths are written).
 *
 * Mutates `merged` in place. Returns { ok:true, migrated } on success.
 */
function reconcileNewProjectIntegrations(merged, userChoices, baseDir) {
  const choices = userChoices || {};
  const migrated = [];

  for (const [slug, integration] of Object.entries(INTEGRATIONS)) {
    const value = merged[integration.configKey];
    if (typeof value === 'boolean') continue;

    const callerOwned =
      Object.prototype.hasOwnProperty.call(choices, integration.configKey) &&
      typeof choices[integration.configKey] !== 'boolean';
    if (callerOwned) {
      // D-05: sanitized rejection — message never includes the value.
      return validateIntegrationValue(integration.configKey, value);
    }

    if (typeof value === 'string' && value) {
      // Trusted global-default string — same conflict policy as
      // migrateLegacyIntegrationKeys: an existing keyfile wins (D-02).
      const existing = readKeyfile(slug, baseDir);
      if (existing && existing.value !== value) {
        process.stderr.write(
          `${integration.configKey}: keyfile ~/.oto/${integration.keyfileName} (${maskSecret(existing.value)}) kept; config string (${maskSecret(value)}) dropped — re-set via /oto-settings-integrations if wrong\n`,
        );
      } else {
        writeKeyfile(slug, value, baseDir);
        process.stderr.write(
          `migrated ${integration.configKey} API key from global defaults to ~/.oto/${integration.keyfileName} (0600)\n`,
        );
      }
      merged[integration.configKey] = true;
      migrated.push(integration.configKey);
    } else {
      merged[integration.configKey] = Boolean(value);
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
  migrateLegacyIntegrationKeys,
  reconcileNewProjectIntegrations,
};
