import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const lockProbe = vi.hoisted(() => ({
  onAcquire: null as null | ((statePath: string) => void),
}));

vi.mock('./state-mutation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state-mutation.js')>();
  return {
    ...actual,
    acquireStateLock: vi.fn(async (statePath: string) => {
      lockProbe.onAcquire?.(statePath);
      return actual.acquireStateLock(statePath);
    }),
    releaseStateLock: vi.fn(actual.releaseStateLock),
  };
});

import * as stateMutation from './state-mutation.js';
import { configSet } from './config-mutation.js';
import { migrateLegacyIntegrationKeys } from './secrets.js';

describe('SDK legacy migration locking (WR-01)', () => {
  let tmpRoot: string;
  let homeDir: string;
  let projectDir: string;
  let configDir: string;
  let configPath: string;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'oto-sdk-migration-lock-'));
    homeDir = join(tmpRoot, 'home');
    projectDir = join(tmpRoot, 'project');
    configDir = join(projectDir, '.oto');
    configPath = join(configDir, 'config.json');
    mkdirSync(homeDir, { recursive: true });
    mkdirSync(configDir, { recursive: true });
    vi.stubEnv('HOME', homeDir);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    vi.clearAllMocks();
    lockProbe.onAcquire = null;
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderr.mockRestore();
    lockProbe.onAcquire = null;
    vi.unstubAllEnvs();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('S1 configSet migrates a legacy key inside its transaction without leaking lock files', async () => {
    const marker = 'sk-legacy-brave-0123456789';
    writeFileSync(configPath, JSON.stringify({ brave_search: marker, commit_docs: false }));

    await configSet(['exa_search', 'true'], projectDir);

    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toEqual({
      brave_search: true,
      commit_docs: false,
      exa_search: true,
    });
    const keyfile = join(homeDir, '.oto', 'brave_api_key');
    expect(readFileSync(keyfile, 'utf8')).toBe(`${marker}\n`);
    expect(statSync(keyfile).mode & 0o777).toBe(0o600);
    expect(existsSync(configPath + '.lock')).toBe(false);
    expect(readdirSync(configDir).filter((name) => name.includes('.tmp.'))).toEqual([]);
  });

  it('S2 standalone migration locks by default and alreadyLocked avoids a nested lock', async () => {
    const marker = 'sk-legacy-exa-0123456789';
    writeFileSync(configPath, JSON.stringify({ exa_search: marker }));

    await migrateLegacyIntegrationKeys(configPath);

    expect(stateMutation.acquireStateLock).toHaveBeenCalledOnce();
    expect(stateMutation.acquireStateLock).toHaveBeenCalledWith(configPath);
    expect(stateMutation.releaseStateLock).toHaveBeenCalledWith(configPath + '.lock');
    expect(existsSync(configPath + '.lock')).toBe(false);

    vi.mocked(stateMutation.acquireStateLock).mockClear();
    vi.mocked(stateMutation.releaseStateLock).mockClear();
    const alreadyLockedPath = join(configDir, 'already-locked.json');
    writeFileSync(alreadyLockedPath, JSON.stringify({ firecrawl: 'fc-legacy-0123456789abcdef' }));

    await migrateLegacyIntegrationKeys(alreadyLockedPath, undefined, { alreadyLocked: true });

    expect(stateMutation.acquireStateLock).not.toHaveBeenCalled();
    expect(stateMutation.releaseStateLock).not.toHaveBeenCalled();
    expect(JSON.parse(readFileSync(alreadyLockedPath, 'utf8')).firecrawl).toBe(true);
  });

  it('S3 configSet acquires once before migration and does not double-acquire', async () => {
    const marker = 'sk-legacy-brave-0123456789';
    const keyfile = join(homeDir, '.oto', 'brave_api_key');
    writeFileSync(configPath, JSON.stringify({ brave_search: marker, commit_docs: false }));
    let sawLegacyConfigBeforeAcquire = false;
    let sawNoKeyfileBeforeAcquire = false;
    lockProbe.onAcquire = (statePath) => {
      if (statePath !== configPath) return;
      sawLegacyConfigBeforeAcquire = JSON.parse(readFileSync(configPath, 'utf8')).brave_search === marker;
      sawNoKeyfileBeforeAcquire = !existsSync(keyfile);
    };

    await configSet(['exa_search', 'true'], projectDir);

    expect(sawLegacyConfigBeforeAcquire).toBe(true);
    expect(sawNoKeyfileBeforeAcquire).toBe(true);
    expect(stateMutation.acquireStateLock).toHaveBeenCalledTimes(1);
    expect(stateMutation.acquireStateLock).toHaveBeenCalledWith(configPath);
    expect(stateMutation.releaseStateLock).toHaveBeenCalledTimes(1);
    expect(existsSync(configPath + '.lock')).toBe(false);
  });

  it('S4 malformed config rejects without leaking its acquired lock', async () => {
    const original = '{bad json';
    writeFileSync(configPath, original);

    await expect(configSet(['exa_search', 'true'], projectDir)).rejects.toThrow(
      'config.json is malformed JSON — config not modified',
    );

    expect(readFileSync(configPath, 'utf8')).toBe(original);
    expect(stateMutation.acquireStateLock).toHaveBeenCalledTimes(1);
    expect(stateMutation.releaseStateLock).toHaveBeenCalledTimes(1);
    expect(existsSync(configPath + '.lock')).toBe(false);
    expect(readdirSync(configDir).filter((name) => name.includes('.tmp.'))).toEqual([]);
  });
});
