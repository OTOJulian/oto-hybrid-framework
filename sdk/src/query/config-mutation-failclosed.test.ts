import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import {
  configEnsureSection,
  configSet,
  configSetModelProfile,
} from './config-mutation.js';
import { secretClear, secretSet } from './secret-commands.js';
import { keyfilePath, writeKeyfile } from './secrets.js';

let tmpRoot: string;
let tmpHome: string;
let projectDir: string;
let configDir: string;
let configPath: string;

function seedConfig(bytes: string): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, bytes, 'utf8');
}

function piped(value: string): Readable & { isTTY?: boolean } {
  const stream = Readable.from([value]) as Readable & { isTTY?: boolean };
  stream.isTTY = false;
  return stream;
}

function fakeStderr(): NodeJS.WriteStream {
  return new PassThrough() as unknown as NodeJS.WriteStream;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'oto-config-failclosed-'));
  tmpHome = join(tmpRoot, 'home');
  projectDir = join(tmpRoot, 'project');
  configDir = join(projectDir, '.oto');
  configPath = join(configDir, 'config.json');
  mkdirSync(tmpHome, { recursive: true });
  mkdirSync(configDir, { recursive: true });
  vi.stubEnv('HOME', tmpHome);
  vi.stubEnv('EXA_API_KEY', '');
  vi.stubEnv('BRAVE_API_KEY', '');
  vi.stubEnv('FIRECRAWL_API_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (existsSync(configPath)) chmodSync(configPath, 0o600);
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('config mutations fail closed', () => {
  it('configSet rejects malformed JSON without exposing or changing its bytes', async () => {
    const original = '{bad json';
    seedConfig(original);

    const operation = configSet(['model_profile', 'quality'], projectDir);

    await expect(operation).rejects.toMatchObject({
      name: 'GSDError',
      message: expect.stringContaining('config.json is malformed JSON — config not modified'),
    });
    await expect(operation).rejects.not.toMatchObject({
      message: expect.stringContaining('bad json'),
    });
    expect(readFileSync(configPath, 'utf8')).toBe(original);
  });

  it('configSetModelProfile preserves malformed config bytes', async () => {
    const original = '{bad json';
    seedConfig(original);

    await expect(configSetModelProfile(['quality'], projectDir)).rejects.toThrow(
      'config.json is malformed JSON — config not modified',
    );
    expect(readFileSync(configPath, 'utf8')).toBe(original);
  });

  it('configEnsureSection preserves malformed config bytes', async () => {
    const original = '{bad json';
    seedConfig(original);

    await expect(configEnsureSection(['features'], projectDir)).rejects.toThrow(
      'config.json is malformed JSON — config not modified',
    );
    expect(readFileSync(configPath, 'utf8')).toBe(original);
  });

  it.each([
    ['configSet', () => configSet(['model_profile', 'quality'], projectDir)],
    ['configSetModelProfile', () => configSetModelProfile(['quality'], projectDir)],
    ['configEnsureSection', () => configEnsureSection(['features'], projectDir)],
  ])('%s rejects an array root without changing its bytes', async (_name, mutate) => {
    const original = '[]';
    seedConfig(original);

    await expect(mutate()).rejects.toThrow('must be a JSON object');
    expect(readFileSync(configPath, 'utf8')).toBe(original);
  });

  it.each(['null', '"nope"', '42'])(
    'configSet rejects the non-object root %s without changing its bytes',
    async (original) => {
      seedConfig(original);

      await expect(configSet(['model_profile', 'quality'], projectDir)).rejects.toThrow(
        'must be a JSON object',
      );
      expect(readFileSync(configPath, 'utf8')).toBe(original);
    },
  );

  it('starts from an empty object only when config.json does not exist', async () => {
    await expect(configSet(['model_profile', 'quality'], projectDir)).resolves.toMatchObject({
      data: { updated: true, key: 'model_profile', value: 'quality' },
    });

    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toMatchObject({
      model_profile: 'quality',
    });
  });

  it.runIf(process.platform !== 'win32')(
    'rejects an unreadable config without changing its bytes',
    async () => {
      const original = '{"model_profile":"balanced"}\n';
      seedConfig(original);
      chmodSync(configPath, 0o000);

      await expect(configSet(['model_profile', 'quality'], projectDir)).rejects.toThrow(
        'cannot read config',
      );

      chmodSync(configPath, 0o600);
      expect(readFileSync(configPath, 'utf8')).toBe(original);
    },
  );

  it('leaves no temporary config files after a rejected mutation', async () => {
    seedConfig('{bad json');

    await expect(configSet(['model_profile', 'quality'], projectDir)).rejects.toThrow(
      'config.json is malformed JSON — config not modified',
    );

    expect(readdirSync(configDir).filter((name) => name.includes('.tmp.'))).toEqual([]);
  });
});

describe('secret commands fail closed on malformed config', () => {
  it('secret-set removes an orphaned keyfile when enabling the flag fails', async () => {
    const original = '{bad json';
    seedConfig(original);

    await expect(
      secretSet(
        ['exa'],
        projectDir,
        undefined,
        piped('sk-failclosed-abcd1234\n'),
        fakeStderr(),
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/failed to enable exa_search.*keyfile restored/),
    });

    expect(readFileSync(configPath, 'utf8')).toBe(original);
    expect(existsSync(keyfilePath('exa'))).toBe(false);
  });

  it('secret-set restores a pre-existing keyfile when enabling the flag fails', async () => {
    const original = '{bad json';
    const prior = 'sk-prior-key-9999wxyz';
    seedConfig(original);
    writeKeyfile('exa', prior);

    await expect(
      secretSet(
        ['exa'],
        projectDir,
        undefined,
        piped('sk-failclosed-abcd1234\n'),
        fakeStderr(),
      ),
    ).rejects.toThrow('failed to enable exa_search');

    expect(readFileSync(configPath, 'utf8')).toBe(original);
    expect(readFileSync(keyfilePath('exa'), 'utf8')).toBe(`${prior}\n`);
  });

  it('secret-clear preserves a pre-existing keyfile when disabling the flag fails', async () => {
    const original = '{bad json';
    const prior = 'sk-prior-key-9999wxyz';
    seedConfig(original);
    writeKeyfile('exa', prior);

    await expect(secretClear(['exa'], projectDir)).rejects.toThrow(
      'config.json is malformed JSON — config not modified',
    );

    expect(readFileSync(configPath, 'utf8')).toBe(original);
    expect(readFileSync(keyfilePath('exa'), 'utf8')).toBe(`${prior}\n`);
  });
});
