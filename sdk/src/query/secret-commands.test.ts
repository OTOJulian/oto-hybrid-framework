/**
 * Behavior tests for the secret command surface.
 *
 * HOME and every supported integration environment variable are isolated for
 * each test so the suite never reads or mutates the user's real keyfiles.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ErrorClassification, GSDError } from '../errors.js';
import { writeKeyfile } from './secrets.js';
import {
  readSecretInput,
  secretClear,
  secretSet,
  secretStatus,
} from './secret-commands.js';

let tmpRoot: string;
let tmpHome: string;
let projectDir: string;

function configPath(): string {
  return join(projectDir, '.oto', 'config.json');
}

function keyfilePath(slug: 'exa' | 'brave' | 'firecrawl'): string {
  return join(tmpHome, '.oto', `${slug}_api_key`);
}

function piped(value: string): Readable & { isTTY?: boolean } {
  const stream = Readable.from([value]) as Readable & { isTTY?: boolean };
  stream.isTTY = false;
  return stream;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'oto-secret-commands-'));
  tmpHome = join(tmpRoot, 'home');
  projectDir = join(tmpRoot, 'project');
  mkdirSync(tmpHome, { recursive: true });
  mkdirSync(join(projectDir, '.oto'), { recursive: true });
  writeFileSync(
    configPath(),
    JSON.stringify({ exa_search: false, brave_search: false, firecrawl: false }, null, 2) + '\n',
  );
  vi.stubEnv('HOME', tmpHome);
  vi.stubEnv('EXA_API_KEY', '');
  vi.stubEnv('BRAVE_API_KEY', '');
  vi.stubEnv('FIRECRAWL_API_KEY', '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('readSecretInput', () => {
  it('reads and trims a key from piped stdin', async () => {
    await expect(readSecretInput(piped('sk-test-abcdef123456\n'))).resolves.toBe(
      'sk-test-abcdef123456',
    );
  });

  it('rejects empty piped input as a validation error', async () => {
    await expect(readSecretInput(piped('  \n'))).rejects.toMatchObject({
      message: 'empty API key — nothing written',
      classification: ErrorClassification.Validation,
    });
  });

  it('rejects keys containing whitespace', async () => {
    await expect(readSecretInput(piped('sk-test two-parts\n'))).rejects.toMatchObject({
      message: 'API key contains whitespace — aborting',
      classification: ErrorClassification.Validation,
    });
  });
});

describe('secretSet', () => {
  it('writes a 0600 keyfile, enables config, and returns only a mask', async () => {
    const rawKey = 'sk-test-abcdef123456';

    const result = await secretSet(['exa'], projectDir, undefined, piped(`${rawKey}\n`));

    expect(readFileSync(keyfilePath('exa'), 'utf8')).toBe(`${rawKey}\n`);
    expect(statSync(keyfilePath('exa')).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(configPath(), 'utf8')).exa_search).toBe(true);
    expect(result.data).toMatchObject({
      integration: 'exa',
      config_key: 'exa_search',
      enabled: true,
      keyfile: '~/.oto/exa_api_key',
      masked: '****3456',
    });
    expect(JSON.stringify(result)).not.toContain(rawKey);
  });

  it('rejects an API key passed through argv before reading stdin', async () => {
    await expect(secretSet(['exa', 'sk-inline-key'], projectDir)).rejects.toMatchObject({
      message: expect.stringContaining('never accepted as arguments'),
      classification: ErrorClassification.Validation,
    });
    expect(existsSync(keyfilePath('exa'))).toBe(false);
  });

  it('rejects unknown slugs and lists every valid integration', async () => {
    await expect(secretSet(['unknown-slug'], projectDir)).rejects.toMatchObject({
      message: "unknown integration 'unknown-slug' — valid: exa, brave, firecrawl",
      classification: ErrorClassification.Validation,
    });
  });

  it('does not write or enable anything for empty input', async () => {
    await expect(secretSet(['exa'], projectDir, undefined, piped('\n'))).rejects.toBeInstanceOf(
      GSDError,
    );
    expect(existsSync(keyfilePath('exa'))).toBe(false);
    expect(JSON.parse(readFileSync(configPath(), 'utf8')).exa_search).toBe(false);
  });
});

describe('secretClear', () => {
  it('deletes the keyfile and disables the integration flag', async () => {
    writeKeyfile('exa', 'sk-test-clear-1234', join(tmpHome, '.oto'));
    writeFileSync(configPath(), JSON.stringify({ exa_search: true }) + '\n');

    const result = await secretClear(['exa'], projectDir);

    expect(existsSync(keyfilePath('exa'))).toBe(false);
    expect(JSON.parse(readFileSync(configPath(), 'utf8')).exa_search).toBe(false);
    expect(result.data).toMatchObject({
      integration: 'exa',
      config_key: 'exa_search',
      cleared: true,
      keyfile_existed: true,
      enabled: false,
      env_still_set: false,
    });
  });

  it('reports honestly when an environment key remains available', async () => {
    const rawKey = 'environment-secret-9876';
    writeKeyfile('exa', 'keyfile-secret-1234', join(tmpHome, '.oto'));
    vi.stubEnv('EXA_API_KEY', rawKey);

    const result = await secretClear(['exa'], projectDir);

    expect(result.data.env_still_set).toBe(true);
    expect(result.raw).toContain('EXA_API_KEY still set — integration remains available');
    expect(JSON.stringify(result)).not.toContain(rawKey);
  });
});

describe('secretStatus', () => {
  it('returns all integrations in stable order with exact display lines', async () => {
    writeFileSync(
      configPath(),
      JSON.stringify({ exa_search: false, brave_search: true, firecrawl: false }) + '\n',
    );
    writeKeyfile('brave', 'brave-secret-9c1e', join(tmpHome, '.oto'));

    const result = await secretStatus([], projectDir);

    expect(result.data.integrations.map((entry) => entry.integration)).toEqual([
      'exa',
      'brave',
      'firecrawl',
    ]);
    expect(result.raw).toBe(
      'Exa: disabled — no key detected\n' +
      'Brave: enabled — key from ~/.oto/brave_api_key (****9c1e)\n' +
      'Firecrawl: disabled — no key detected',
    );
  });

  it('prefers the environment and notes a shadowed keyfile without exposing either key', async () => {
    const envKey = 'environment-secret-4f2a';
    const fileKey = 'keyfile-secret-8b7c';
    writeFileSync(configPath(), JSON.stringify({ exa_search: true }) + '\n');
    writeKeyfile('exa', fileKey, join(tmpHome, '.oto'));
    vi.stubEnv('EXA_API_KEY', envKey);

    const result = await secretStatus(['exa'], projectDir);

    expect(result.data.integrations).toEqual([
      expect.objectContaining({
        integration: 'exa',
        enabled: true,
        source: 'env',
        env_var: 'EXA_API_KEY',
        keyfile: '~/.oto/exa_api_key',
        masked: '****4f2a',
        shadowed_keyfile: true,
      }),
    ]);
    expect(result.raw).toBe(
      'Exa: enabled — key from env EXA_API_KEY (****4f2a) [shadows ~/.oto/exa_api_key]',
    );
    expect(JSON.stringify(result)).not.toContain(envKey);
    expect(JSON.stringify(result)).not.toContain(fileKey);
  });

  it('heals a loose keyfile to 0600 and reports the repair in its entry', async () => {
    writeFileSync(configPath(), JSON.stringify({ firecrawl: true }) + '\n');
    writeKeyfile('firecrawl', 'firecrawl-secret-abcd', join(tmpHome, '.oto'));
    chmodSync(keyfilePath('firecrawl'), 0o644);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const result = await secretStatus(['firecrawl'], projectDir);

    expect(statSync(keyfilePath('firecrawl')).mode & 0o777).toBe(0o600);
    expect(result.data.integrations[0]).toMatchObject({
      integration: 'firecrawl',
      source: 'keyfile',
      healed: true,
    });
  });

  it('rejects an unknown optional status slug', async () => {
    await expect(secretStatus(['other'], projectDir)).rejects.toMatchObject({
      message: "unknown integration 'other' — valid: exa, brave, firecrawl",
      classification: ErrorClassification.Validation,
    });
  });
});
