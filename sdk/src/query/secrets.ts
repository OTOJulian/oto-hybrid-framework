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
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
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
  writeFileSync(target, String(value) + '\n', { mode: 0o600 });
  chmodSync(target, 0o600);
}

export interface KeyfileValue {
  value: string;
  healed: boolean;
}

export function readKeyfile(slug: string, baseDir?: string): KeyfileValue | null {
  const target = keyfilePath(slug, baseDir);
  if (!existsSync(target)) return null;

  let healed = false;
  if ((statSync(target).mode & 0o077) !== 0) {
    chmodSync(target, 0o600);
    healed = true;
    process.stderr.write(`fixed permissions on ${target} (now 0600)\n`);
  }

  return { value: readFileSync(target, 'utf8').trim(), healed };
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
