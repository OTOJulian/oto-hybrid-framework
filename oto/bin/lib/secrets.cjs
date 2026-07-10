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
  fs.writeFileSync(target, String(value) + '\n', { mode: 0o600 });
  fs.chmodSync(target, 0o600);
}

function readKeyfile(slug, baseDir) {
  const target = keyfilePath(slug, baseDir);
  if (!fs.existsSync(target)) return null;

  let healed = false;
  if ((fs.statSync(target).mode & 0o077) !== 0) {
    fs.chmodSync(target, 0o600);
    healed = true;
    process.stderr.write(`fixed permissions on ${target} (now 0600)\n`);
  }

  return { value: fs.readFileSync(target, 'utf8').trim(), healed };
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
};
