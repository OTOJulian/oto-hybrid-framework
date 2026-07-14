/**
 * SDK-side integration secret storage tests.
 *
 * Every filesystem helper receives an explicit temporary base directory so
 * these tests never inspect or mutate the real ~/.oto directory.
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
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ErrorClassification, GSDError } from '../errors.js';
import {
  deleteKeyfile,
  detectKeySource,
  integrationForConfigKey,
  keyfilePath,
  maskSecret,
  migrateLegacyIntegrationKeys,
  readKeyfile,
  validateIntegrationValue,
  warnIfNoKeyDetected,
  writeKeyfile,
} from './secrets.js';

let tmpBase: string;

beforeEach(() => {
  tmpBase = mkdtempSync(join(tmpdir(), 'oto-secrets-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(tmpBase, { recursive: true, force: true });
});

function captureStderr() {
  return vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

function capturedOutput(spy: ReturnType<typeof captureStderr>): string {
  return spy.mock.calls.map(([chunk]) => String(chunk)).join('');
}

describe('integration metadata and masking', () => {
  it('maps config keys to their allowlisted integration metadata', () => {
    expect(integrationForConfigKey('exa_search')).toMatchObject({
      slug: 'exa',
      envVar: 'EXA_API_KEY',
      keyfileName: 'exa_api_key',
    });
    expect(integrationForConfigKey('unrelated')).toBeNull();
  });

  it('rejects unknown integration slugs as validation errors', () => {
    try {
      keyfilePath('unknown', tmpBase);
      throw new Error('expected keyfilePath to reject an unknown slug');
    } catch (error) {
      expect(error).toBeInstanceOf(GSDError);
      expect((error as GSDError).classification).toBe(ErrorClassification.Validation);
    }
  });

  it('masks unset, short, and long secrets without exposing their prefixes', () => {
    expect(maskSecret(null)).toBe('(unset)');
    expect(maskSecret('short')).toBe('****');
    expect(maskSecret('exa-secret-1234')).toBe('****1234');
  });
});

describe('keyfile CRUD', () => {
  it('writes newline-terminated content with mode 0600 in a 0700 directory', () => {
    writeKeyfile('exa', 'sk-test-value', tmpBase);

    const target = join(tmpBase, 'exa_api_key');
    expect(readFileSync(target, 'utf8')).toBe('sk-test-value\n');
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(statSync(tmpBase).mode & 0o777).toBe(0o700);
  });

  it('returns a trimmed keyfile value without healing secure permissions', () => {
    writeKeyfile('brave', 'brave-secret', tmpBase);

    expect(readKeyfile('brave', tmpBase)).toEqual({ value: 'brave-secret', healed: false });
  });

  it('heals permissive keyfiles to 0600 and reports the repair', () => {
    writeKeyfile('firecrawl', 'fire-secret', tmpBase);
    const target = join(tmpBase, 'firecrawl_api_key');
    chmodSync(target, 0o644);
    const stderr = captureStderr();

    expect(readKeyfile('firecrawl', tmpBase)).toEqual({ value: 'fire-secret', healed: true });
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(capturedOutput(stderr)).toContain(`fixed permissions on ${target} (now 0600)`);
  });

  it('returns null for missing keyfiles and reports whether deletion occurred', () => {
    expect(readKeyfile('exa', tmpBase)).toBeNull();
    expect(deleteKeyfile('exa', tmpBase)).toBe(false);

    writeKeyfile('exa', 'delete-me', tmpBase);
    expect(deleteKeyfile('exa', tmpBase)).toBe(true);
    expect(existsSync(join(tmpBase, 'exa_api_key'))).toBe(false);
  });
});

describe('key source detection and validation', () => {
  it('prefers the environment and reports a shadowed keyfile', () => {
    writeKeyfile('exa', 'keyfile-secret', tmpBase);
    vi.stubEnv('EXA_API_KEY', 'environment-secret-5678');

    expect(detectKeySource('exa', tmpBase)).toEqual({
      source: 'env',
      envVar: 'EXA_API_KEY',
      keyfile: join(tmpBase, 'exa_api_key'),
      masked: '****5678',
      shadowedKeyfile: true,
    });
  });

  it('falls back to a keyfile and then to no source', () => {
    vi.stubEnv('BRAVE_API_KEY', '');
    writeKeyfile('brave', 'brave-key-9876', tmpBase);

    expect(detectKeySource('brave', tmpBase)).toEqual({
      source: 'keyfile',
      envVar: 'BRAVE_API_KEY',
      keyfile: join(tmpBase, 'brave_api_key'),
      masked: '****9876',
      shadowedKeyfile: false,
    });

    deleteKeyfile('brave', tmpBase);
    expect(detectKeySource('brave', tmpBase)).toEqual({
      source: null,
      envVar: 'BRAVE_API_KEY',
      keyfile: join(tmpBase, 'brave_api_key'),
      masked: '(unset)',
      shadowedKeyfile: false,
    });
  });

  it('rejects integration strings with the secret-set pointer but allows booleans and other keys', () => {
    expect(validateIntegrationValue('exa_search', 'sk-x')).toEqual({
      ok: false,
      message: "exa_search: booleans only — to set your API key use /oto-settings-integrations (or 'oto-sdk query secret-set exa')",
    });
    expect(validateIntegrationValue('exa_search', true)).toEqual({ ok: true });
    expect(validateIntegrationValue('model_profile', 'quality')).toEqual({ ok: true });
  });

  it('warns when enabling an integration with no environment or keyfile source', () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    const stderr = captureStderr();

    warnIfNoKeyDetected('firecrawl', tmpBase);

    expect(capturedOutput(stderr)).toContain(
      'no Firecrawl API key detected (FIRECRAWL_API_KEY or ~/.oto/firecrawl_api_key)',
    );
  });
});

describe('D-15 key usability', () => {
  it('uses a trimmed non-empty environment key and ignores whitespace-only env values', () => {
    vi.stubEnv('EXA_API_KEY', '  key123  ');
    expect(detectKeySource('exa', tmpBase).source).toBe('env');

    vi.stubEnv('EXA_API_KEY', ' \t ');
    expect(detectKeySource('exa', tmpBase).source).toBeNull();
  });

  it('detects non-empty regular files but rejects empty and whitespace-only files', () => {
    vi.stubEnv('EXA_API_KEY', '');
    const target = keyfilePath('exa', tmpBase);

    writeFileSync(target, 'sk-abc');
    expect(detectKeySource('exa', tmpBase).source).toBe('keyfile');
    writeFileSync(target, '');
    expect(detectKeySource('exa', tmpBase).source).toBeNull();
    writeFileSync(target, ' \n\t');
    expect(detectKeySource('exa', tmpBase).source).toBeNull();
  });

  it('follows a symlink to a regular non-empty file without changing its mode', () => {
    vi.stubEnv('EXA_API_KEY', '');
    const linked = join(tmpBase, 'password-manager-key');
    writeFileSync(linked, 'sk-linked\n', { mode: 0o644 });
    chmodSync(linked, 0o644);
    symlinkSync(linked, keyfilePath('exa', tmpBase));

    expect(detectKeySource('exa', tmpBase).source).toBe('keyfile');
    expect(statSync(linked).mode & 0o777).toBe(0o644);
  });

  it('rejects symlinks to directories and dangling symlinks with one-line notices', () => {
    vi.stubEnv('EXA_API_KEY', '');
    const target = keyfilePath('exa', tmpBase);
    const directory = join(tmpBase, 'directory');
    mkdirSync(directory);
    symlinkSync(directory, target);
    const stderr = captureStderr();

    expect(detectKeySource('exa', tmpBase).source).toBeNull();
    expect(capturedOutput(stderr)).toContain('not a regular file');
    rmSync(target);
    stderr.mockClear();
    symlinkSync(join(tmpBase, 'missing'), target);
    expect(detectKeySource('exa', tmpBase).source).toBeNull();
    expect(capturedOutput(stderr)).toContain('dangling symlink');
  });

  it('keeps WR-07 write refusal for symlink destinations', () => {
    const linked = join(tmpBase, 'victim');
    writeFileSync(linked, 'unchanged');
    symlinkSync(linked, keyfilePath('exa', tmpBase));

    expect(() => writeKeyfile('exa', 'replacement', tmpBase)).toThrow(/not a regular file/);
    expect(readFileSync(linked, 'utf8')).toBe('unchanged');
  });
});

describe('legacy integration migration', () => {
  it('moves a legacy config string to a 0600 keyfile and rewrites the flag to true', async () => {
    const plaintext = 'sk-config-1234567890';
    const configPath = join(tmpBase, 'config.json');
    writeFileSync(configPath, JSON.stringify({ exa_search: plaintext, commit_docs: true }));
    const stderr = captureStderr();

    await expect(migrateLegacyIntegrationKeys(configPath, tmpBase)).resolves.toEqual({
      migrated: ['exa_search'],
      conflicts: [],
    });

    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toEqual({ exa_search: true, commit_docs: true });
    expect(readFileSync(join(tmpBase, 'exa_api_key'), 'utf8')).toBe(`${plaintext}\n`);
    expect(statSync(join(tmpBase, 'exa_api_key')).mode & 0o777).toBe(0o600);
    expect(capturedOutput(stderr)).toContain('migrated exa_search API key');
    expect(capturedOutput(stderr)).toContain('this key may exist in git history');
    expect(capturedOutput(stderr)).not.toContain(plaintext);
  });

  it('preserves a conflicting keyfile and drops the config string with masked notice values', async () => {
    const configSecret = 'config-secret-1111';
    const keyfileSecret = 'keyfile-secret-2222';
    const configPath = join(tmpBase, 'config.json');
    writeKeyfile('exa', keyfileSecret, tmpBase);
    writeFileSync(configPath, JSON.stringify({ exa_search: configSecret }));
    const stderr = captureStderr();

    await expect(migrateLegacyIntegrationKeys(configPath, tmpBase)).resolves.toEqual({
      migrated: ['exa_search'],
      conflicts: ['exa_search'],
    });

    expect(readKeyfile('exa', tmpBase)?.value).toBe(keyfileSecret);
    expect(JSON.parse(readFileSync(configPath, 'utf8')).exa_search).toBe(true);
    expect(capturedOutput(stderr)).toContain('****2222');
    expect(capturedOutput(stderr)).toContain('****1111');
    expect(capturedOutput(stderr)).not.toContain(configSecret);
    expect(capturedOutput(stderr)).not.toContain(keyfileSecret);
  });

  it('silently no-ops for missing, unparseable, and boolean-only config files', async () => {
    const missingPath = join(tmpBase, 'missing.json');
    await expect(migrateLegacyIntegrationKeys(missingPath, tmpBase)).resolves.toEqual({
      migrated: [],
      conflicts: [],
    });

    const invalidPath = join(tmpBase, 'invalid.json');
    writeFileSync(invalidPath, '{not-json');
    await expect(migrateLegacyIntegrationKeys(invalidPath, tmpBase)).resolves.toEqual({
      migrated: [],
      conflicts: [],
    });

    const booleanPath = join(tmpBase, 'boolean.json');
    writeFileSync(booleanPath, JSON.stringify({ exa_search: false, brave_search: true }));
    await expect(migrateLegacyIntegrationKeys(booleanPath, tmpBase)).resolves.toEqual({
      migrated: [],
      conflicts: [],
    });
  });
});
