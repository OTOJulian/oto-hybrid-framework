import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  keyfilePath,
  migrateLegacyIntegrationKeys,
  readKeyfile,
  writeKeyfile,
} from './secrets.js';

let root: string;
let base: string;

function createSymlinkFixture(): { victim: string; target: string } {
  mkdirSync(base, { recursive: true, mode: 0o700 });
  const victim = join(root, 'victim.txt');
  writeFileSync(victim, 'victim-content', { mode: 0o644 });
  chmodSync(victim, 0o644);
  const target = keyfilePath('exa', base);
  symlinkSync(victim, target);
  return { victim, target };
}

function writeConfig(value: Record<string, unknown>): string {
  const configPath = join(root, 'config.json');
  writeFileSync(configPath, JSON.stringify(value, null, 2) + '\n');
  return configPath;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'oto-sdk-keyfile-symlink-'));
  base = join(root, '.oto');
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe('symlink-safe keyfile handling', () => {
  it('refuses a symlink without reading or re-moding its victim', () => {
    const { victim } = createSymlinkFixture();
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(
      (() => true) as typeof process.stderr.write,
    );

    expect(readKeyfile('exa', base)).toBeNull();
    expect(readFileSync(victim, 'utf8')).toBe('victim-content');
    expect(statSync(victim).mode & 0o777).toBe(0o644);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('not a regular file'));
  });

  it('refuses a symlink without overwriting its victim', () => {
    const { victim, target } = createSymlinkFixture();

    expect(() => writeKeyfile('exa', 'sk-new', base)).toThrow(/not a regular file/);
    expect(readFileSync(victim, 'utf8')).toBe('victim-content');
    expect(statSync(victim).mode & 0o777).toBe(0o644);
    expect(readlinkSync(target)).toBe(victim);
  });

  it('fails migration closed when the destination keyfile is a symlink', async () => {
    const { victim } = createSymlinkFixture();
    const configPath = writeConfig({
      exa_search: 'sk-legacy-gap2-0123456789',
    });
    const before = readFileSync(configPath, 'utf8');

    await expect(migrateLegacyIntegrationKeys(configPath, base)).rejects.toThrow(
      /not a regular file/,
    );
    expect(readFileSync(configPath, 'utf8')).toBe(before);
    expect(readFileSync(victim, 'utf8')).toBe('victim-content');
    expect(statSync(victim).mode & 0o777).toBe(0o644);
  });

  it('heals a regular keyfile before replacing its content', () => {
    mkdirSync(base, { recursive: true, mode: 0o700 });
    const target = keyfilePath('exa', base);
    writeFileSync(target, 'old-content\n', { mode: 0o644 });
    chmodSync(target, 0o644);

    writeKeyfile('exa', 'sk-new-key-0123456789', base);

    expect(readFileSync(target, 'utf8')).toBe('sk-new-key-0123456789\n');
    expect(statSync(target).mode & 0o777).toBe(0o600);
  });
});
