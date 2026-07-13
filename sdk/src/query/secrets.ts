/**
 * SDK-side integration secret storage.
 *
 * This module mirrors `oto/bin/lib/secrets.cjs` as part of Phase 14's
 * both-write-paths discipline. Keep both implementations behavior-identical:
 * committed config stores booleans while API keys live in env vars or 0600
 * keyfiles under ~/.oto.
 */

import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ErrorClassification, GSDError } from '../errors.js';

export const INTEGRATIONS = {
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
} as const;

export type IntegrationSlug = keyof typeof INTEGRATIONS;
type Integration = (typeof INTEGRATIONS)[IntegrationSlug];
type IntegrationMatch = Integration & { slug: IntegrationSlug };

export function integrationForConfigKey(configKey: string): IntegrationMatch | null {
  for (const slug of Object.keys(INTEGRATIONS) as IntegrationSlug[]) {
    const integration = INTEGRATIONS[slug];
    if (integration.configKey === configKey) return { slug, ...integration };
  }
  return null;
}

function integrationForSlug(slug: string): Integration {
  if (!Object.prototype.hasOwnProperty.call(INTEGRATIONS, slug)) {
    throw new GSDError(
      `unknown integration '${slug}' — valid: exa, brave, firecrawl`,
      ErrorClassification.Validation,
    );
  }
  return INTEGRATIONS[slug as IntegrationSlug];
}

function keyfileBase(baseDir?: string): string {
  return baseDir ?? join(homedir(), '.oto');
}

export function keyfilePath(slug: string, baseDir?: string): string {
  const integration = integrationForSlug(slug);
  return join(keyfileBase(baseDir), integration.keyfileName);
}

export function writeKeyfile(slug: string, value: string, baseDir?: string): void {
  const base = keyfileBase(baseDir);
  const target = keyfilePath(slug, base);
  mkdirSync(base, { recursive: true, mode: 0o700 });

  // Phase 14 gap-closure (WR-07 / SECR-01): never write through a
  // symlink or non-regular file, and tighten a pre-existing loose mode
  // BEFORE the new secret bytes land (heal-before-truncation).
  let st = null;
  try { st = lstatSync(target); } catch { /* ENOENT — fresh create below */ }
  if (st) {
    if (!st.isFile()) {
      throw new GSDError(
        `refusing to write ${target}: not a regular file — remove it and retry`,
        ErrorClassification.Execution,
      );
    }
    if ((st.mode & 0o077) !== 0) chmodSync(target, 0o600);
  }

  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC
    | (constants.O_NOFOLLOW || 0);
  const fd = openSync(target, flags, 0o600);
  try {
    writeSync(fd, String(value) + '\n');
  } finally {
    closeSync(fd);
  }
  chmodSync(target, 0o600);
}

export interface KeyfileValue {
  value: string;
  healed: boolean;
}

export function readKeyfile(slug: string, baseDir?: string): KeyfileValue | null {
  const target = keyfilePath(slug, baseDir);

  // Phase 14 gap-closure (WR-07): lstat and refuse non-regular files
  // BEFORE any chmod — chmodSync would dereference a planted symlink.
  let st;
  try {
    st = lstatSync(target);
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
    chmodSync(target, 0o600);
    healed = true;
    process.stderr.write(`fixed permissions on ${target} (now 0600)\n`);
  }

  const value = readFileSync(target, 'utf8').trim();
  // Phase 14 gap-closure (CR-01 / SECR-03): an empty/whitespace-only
  // keyfile is not a credential — report it absent so migration overwrites
  // it instead of treating it as an authoritative conflicting keyfile, and
  // so status reports "no key detected" instead of an enabled-unset key.
  if (value === '') return null;

  return { value, healed };
}

export function deleteKeyfile(slug: string, baseDir?: string): boolean {
  const target = keyfilePath(slug, baseDir);
  if (!existsSync(target)) return false;
  unlinkSync(target);
  return true;
}

export interface KeySource {
  source: 'env' | 'keyfile' | null;
  envVar: string;
  keyfile: string;
  masked: string;
  shadowedKeyfile: boolean;
}

export function detectKeySource(slug: string, baseDir?: string): KeySource {
  const integration = integrationForSlug(slug);
  const target = keyfilePath(slug, baseDir);
  const envValue = process.env[integration.envVar];

  if (typeof envValue === 'string' && envValue.trim() !== '') {
    return {
      source: 'env',
      envVar: integration.envVar,
      keyfile: target,
      masked: maskSecret(envValue),
      shadowedKeyfile: existsSync(target),
    };
  }

  const keyfile = readKeyfile(slug, baseDir);
  if (keyfile) {
    return {
      source: 'keyfile',
      envVar: integration.envVar,
      keyfile: target,
      masked: maskSecret(keyfile.value),
      shadowedKeyfile: false,
    };
  }

  return {
    source: null,
    envVar: integration.envVar,
    keyfile: target,
    masked: '(unset)',
    shadowedKeyfile: false,
  };
}

export function maskSecret(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(unset)';
  const secret = String(value);
  if (secret.length < 8) return '****';
  return '****' + secret.slice(-4);
}

export type IntegrationValidation = { ok: true } | { ok: false; message: string };

export function validateIntegrationValue(configKey: string, value: unknown): IntegrationValidation {
  const integration = integrationForConfigKey(configKey);
  if (!integration || typeof value === 'boolean') return { ok: true };

  return {
    ok: false,
    message: `${configKey}: booleans only — to set your API key use /oto-settings-integrations (or 'oto-sdk query secret-set ${integration.slug}')`,
  };
}

export function warnIfNoKeyDetected(configKey: string, baseDir?: string): void {
  const integration = integrationForConfigKey(configKey);
  if (!integration || detectKeySource(integration.slug, baseDir).source !== null) return;

  process.stderr.write(
    `no ${integration.label} API key detected (${integration.envVar} or ~/.oto/${integration.keyfileName}) — set one via /oto-settings-integrations or this flag has no effect.\n`,
  );
}

/**
 * Validate/migrate the integration fields of a fully merged new-project
 * config BEFORE any write (Phase 14 gap-closure, CR-01 / SECR-02).
 *
 * Mirrors `reconcileNewProjectIntegrations` in oto/bin/lib/secrets.cjs
 * (both-write-paths discipline) with two SDK-specific differences:
 * - Caller-supplied non-boolean values throw GSDError (Validation) instead
 *   of returning { ok:false } — the sanitized D-05 message never echoes the
 *   value.
 * - There is NO defaults-file write-back of any kind: the SDK's D11 defaults
 *   source belongs to the separate GSD install and is READ-ONLY per D-08.
 *   The string stays there and each subsequent new-project run re-migrates
 *   with a repeat masked notice (accepted posture, T-14-05-05).
 *
 * Trusted global-default strings become 0600 keyfiles under ~/.oto with the
 * keyfile-wins conflict policy (D-02); other non-booleans are coerced via
 * Boolean(value). Mutates `merged` in place.
 */
export function reconcileNewProjectIntegrations(
  merged: Record<string, unknown>,
  userChoices: Record<string, unknown>,
  baseDir?: string,
): { migrated: string[] } {
  const choices = userChoices ?? {};
  const migrated: string[] = [];

  for (const slug of Object.keys(INTEGRATIONS) as IntegrationSlug[]) {
    const integration = INTEGRATIONS[slug];
    const value = merged[integration.configKey];
    if (typeof value === 'boolean') continue;

    const callerOwned =
      Object.prototype.hasOwnProperty.call(choices, integration.configKey) &&
      typeof choices[integration.configKey] !== 'boolean';
    if (callerOwned) {
      // D-05: sanitized rejection — message never includes the value.
      const validation = validateIntegrationValue(integration.configKey, value);
      if (!validation.ok) {
        throw new GSDError(validation.message, ErrorClassification.Validation);
      }
      continue;
    }

    if (typeof value === 'string' && value !== '') {
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

  return { migrated };
}

async function atomicWriteConfig(configPath: string, config: Record<string, unknown>): Promise<void> {
  const tmpPath = configPath + '.tmp.' + process.pid;
  const content = JSON.stringify(config, null, 2) + '\n';
  try {
    await writeFile(tmpPath, content, 'utf8');
    await rename(tmpPath, configPath);
  } catch {
    try { await unlink(tmpPath); } catch { /* already gone */ }
    await writeFile(configPath, content, 'utf8');
  }
}

export interface MigrationResult {
  migrated: string[];
  conflicts: string[];
}

export async function migrateLegacyIntegrationKeys(
  configPath: string,
  baseDir?: string,
): Promise<MigrationResult> {
  let config: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await readFile(configPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { migrated: [], conflicts: [] };
    }
    config = parsed as Record<string, unknown>;
  } catch {
    return { migrated: [], conflicts: [] };
  }

  const migrated: string[] = [];
  const conflicts: string[] = [];
  let movedString = false;

  for (const slug of Object.keys(INTEGRATIONS) as IntegrationSlug[]) {
    const integration = INTEGRATIONS[slug];
    if (!Object.prototype.hasOwnProperty.call(config, integration.configKey)) continue;

    const current = config[integration.configKey];
    if (typeof current === 'boolean') continue;

    if (typeof current === 'string' && current !== '') {
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

  if (migrated.length === 0) return { migrated, conflicts };

  await atomicWriteConfig(configPath, config);
  if (movedString) {
    process.stderr.write(
      'note: this key may exist in git history — consider rotating it at the provider\n',
    );
  }

  return { migrated, conflicts };
}
