import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { secretStatus } from './secret-commands.js';
import {
  detectKeySource,
  keyfilePath,
  migrateLegacyIntegrationKeys,
  readKeyfile,
  warnIfNoKeyDetected,
  writeKeyfile,
} from './secrets.js';

let root: string;
let base: string;

function createKeyfile(content: string, mode = 0o600): string {
  mkdirSync(base, { recursive: true, mode: 0o700 });
  const target = keyfilePath('exa', base);
  writeFileSync(target, content, { mode });
  chmodSync(target, mode);
  return target;
}

function writeConfig(value: Record<string, unknown>): string {
  const configPath = join(root, 'config.json');
  writeFileSync(configPath, JSON.stringify(value, null, 2) + '\n');
  return configPath;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'oto-sdk-empty-keyfile-'));
  base = join(root, '.oto');
  vi.stubEnv('EXA_API_KEY', '');
  vi.stubEnv('BRAVE_API_KEY', '');
  vi.stubEnv('FIRECRAWL_API_KEY', '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe('empty keyfile handling', () => {
  it('treats a zero-byte keyfile as absent', () => {
    createKeyfile('');

    expect(readKeyfile('exa', base)).toBeNull();
  });

  it('treats a whitespace-only keyfile as absent', () => {
    createKeyfile('\n \t\n');

    expect(readKeyfile('exa', base)).toBeNull();
  });

  it('heals loose permissions before rejecting empty content', () => {
    const target = createKeyfile('\n \t\n', 0o644);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(
      (() => true) as typeof process.stderr.write,
    );

    expect(readKeyfile('exa', base)).toBeNull();
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('fixed permissions'));
  });

  it('detectKeySource reports no source for a zero-byte keyfile', () => {
    createKeyfile('');

    expect(detectKeySource('exa', base)).toMatchObject({
      source: null,
      masked: '(unset)',
    });
  });

  it('migrates a legacy credential past a zero-byte keyfile', async () => {
    const target = createKeyfile('');
    const configPath = writeConfig({
      exa_search: 'sk-legacy-gap2-0123456789',
    });

    const result = await migrateLegacyIntegrationKeys(configPath, base);

    expect(readFileSync(target, 'utf8')).toBe('sk-legacy-gap2-0123456789\n');
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(configPath, 'utf8')).exa_search).toBe(true);
    expect(result.conflicts).not.toContain('exa_search');
  });

  it('renders no key detected for an enabled integration with an empty keyfile', async () => {
    const home = join(root, 'home');
    const projectDir = join(root, 'project');
    const homeBase = join(home, '.oto');
    mkdirSync(homeBase, { recursive: true, mode: 0o700 });
    writeFileSync(join(homeBase, 'exa_api_key'), '', { mode: 0o600 });
    mkdirSync(join(projectDir, '.oto'), { recursive: true });
    writeFileSync(
      join(projectDir, '.oto', 'config.json'),
      JSON.stringify({ exa_search: true, brave_search: false, firecrawl: false }, null, 2) + '\n',
    );
    vi.stubEnv('HOME', home);

    const result = await secretStatus(['exa'], projectDir);

    expect(result.raw).toContain('Exa: enabled — no key detected');
    expect(result.raw).not.toContain('(unset)');
    expect(result.data.integrations[0]?.source).toBeNull();
  });

  it('keeps a different non-empty keyfile as the conflict winner', async () => {
    writeKeyfile('exa', 'sk-existing-keyfile-9999wxyz', base);
    const configPath = writeConfig({
      exa_search: 'sk-legacy-gap2-0123456789',
    });

    const result = await migrateLegacyIntegrationKeys(configPath, base);

    expect(readFileSync(keyfilePath('exa', base), 'utf8')).toBe(
      'sk-existing-keyfile-9999wxyz\n',
    );
    expect(result.conflicts).toContain('exa_search');
  });

  it('warns when the only candidate keyfile is zero-byte', () => {
    createKeyfile('');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(
      (() => true) as typeof process.stderr.write,
    );

    warnIfNoKeyDetected('exa_search', base);

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('no Exa API key detected'),
    );
  });
});
