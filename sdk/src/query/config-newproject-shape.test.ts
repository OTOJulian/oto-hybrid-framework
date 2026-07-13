import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GSDError } from '../errors.js';
import { configNewProject } from './config-mutation.js';

const GAP_MARKER = 'sk-gap1-marker-0123456789';
const DEFAULT_EXA = 'sk-default-exa-0123456789';

describe('configNewProject shape and two-phase security guards', () => {
  let tmpRoot: string;
  let projectDir: string;
  let tmpHome: string;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'oto-sdk-newproject-shape-'));
    projectDir = join(tmpRoot, 'project');
    tmpHome = join(tmpRoot, 'home');
    await mkdir(projectDir, { recursive: true });
    await mkdir(tmpHome, { recursive: true });
    vi.stubEnv('HOME', tmpHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(tmpRoot, { recursive: true, force: true });
  });

  async function captureError(promise: Promise<unknown>): Promise<GSDError> {
    try {
      await promise;
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GSDError);
      return error as GSDError;
    }
    throw new Error('expected configNewProject to reject');
  }

  async function seedDefaults(defaults: Record<string, unknown>): Promise<string> {
    const defaultsDir = join(tmpHome, '.gsd');
    await mkdir(defaultsDir, { recursive: true });
    const bytes = JSON.stringify(defaults, null, 2) + '\n';
    await writeFile(join(defaultsDir, 'defaults.json'), bytes);
    return bytes;
  }

  it('rejects the verifier array reproduction before creating .oto', async () => {
    const error = await captureError(
      configNewProject([JSON.stringify([{ exa_search: GAP_MARKER }])], projectDir),
    );

    expect(error.message).toContain('expected a JSON object');
    expect(error.message).not.toContain('sk-gap1-marker');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('rejects primitive and null roots before creating .oto', async () => {
    for (const jsonArg of ['"just-a-string"', '42', 'null', 'true']) {
      const error = await captureError(configNewProject([jsonArg], projectDir));
      expect(error.message).toContain('expected a JSON object');
      expect(existsSync(join(projectDir, '.oto'))).toBe(false);
    }
  });

  it('rejects an unknown key by name without echoing its value', async () => {
    const error = await captureError(
      configNewProject([JSON.stringify({ exa_searchh: GAP_MARKER })], projectDir),
    );

    expect(error.message).toContain('exa_searchh');
    expect(error.message).not.toContain('sk-gap1-marker');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('rejects a nested integration string by its workflow dot-path', async () => {
    const error = await captureError(
      configNewProject(
        [JSON.stringify({ workflow: { exa_search: GAP_MARKER } })],
        projectDir,
      ),
    );

    expect(error.message).toContain('workflow.exa_search');
    expect(error.message).not.toContain('sk-gap1-marker');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('rejects deeply nested empty integration strings', async () => {
    const choices = { agent_skills: { deep: { brave_search: '' } } };
    const error = await captureError(
      configNewProject([JSON.stringify(choices)], projectDir),
    );

    expect(error.message).toContain('agent_skills.deep.brave_search');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('validates every caller value before migrating a valid raw default', async () => {
    const bytes = await seedDefaults({ exa_search: DEFAULT_EXA });

    await expect(
      configNewProject(
        [JSON.stringify({ brave_search: 'sk-bad-brave-0123456789' })],
        projectDir,
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining('booleans only') });

    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
    expect(existsSync(join(tmpHome, '.oto', 'exa_api_key'))).toBe(false);
    expect(await readFile(join(tmpHome, '.gsd', 'defaults.json'), 'utf8')).toBe(bytes);
  });

  it('keeps a caller boolean while migrating its hidden raw default to mode 0600', async () => {
    const bytes = await seedDefaults({ exa_search: DEFAULT_EXA });

    await configNewProject([JSON.stringify({ exa_search: false })], projectDir);

    const config = JSON.parse(
      await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(config.exa_search).toBe(false);
    const keyfile = join(tmpHome, '.oto', 'exa_api_key');
    expect(await readFile(keyfile, 'utf8')).toBe(DEFAULT_EXA + '\n');
    expect((await stat(keyfile)).mode & 0o777).toBe(0o600);
    expect(await readFile(join(tmpHome, '.gsd', 'defaults.json'), 'utf8')).toBe(bytes);
  });

  it('accepts model profile, mode, and granularity choices with boolean flags', async () => {
    const result = await configNewProject(
      [JSON.stringify({ model_profile: 'quality' })],
      projectDir,
    );
    expect(result.data).toMatchObject({ created: true });
    const config = JSON.parse(
      await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(config.model_profile).toBe('quality');
    expect(typeof config.exa_search).toBe('boolean');
    expect(typeof config.brave_search).toBe('boolean');
    expect(typeof config.firecrawl).toBe('boolean');

    const secondProject = join(tmpRoot, 'mode-project');
    await mkdir(secondProject);
    await expect(
      configNewProject(
        [JSON.stringify({ mode: 'yolo', granularity: 'standard' })],
        secondProject,
      ),
    ).resolves.toMatchObject({ data: { created: true } });
  });

  it('retains the top-level booleans-only rejection', async () => {
    const error = await captureError(
      configNewProject([JSON.stringify({ exa_search: GAP_MARKER })], projectDir),
    );

    expect(error.message).toContain('booleans only');
    expect(error.message).not.toContain('sk-gap1-marker');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('uses a fixed malformed-JSON message without echoing marker bytes', async () => {
    const malformed = '{bad json "exa_search":"sk-parse-marker-0123456789"';

    const error = await captureError(configNewProject([malformed], projectDir));

    expect(error.message).toContain('malformed JSON');
    expect(error.message).not.toContain('sk-parse-marker');
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });

  it('compensates earlier keyfile writes when a later Phase B write fails', async () => {
    const bytes = await seedDefaults({
      exa_search: DEFAULT_EXA,
      brave_search: 'sk-default-brave-0123456789',
    });
    const blockedBraveTarget = join(tmpHome, '.oto', 'brave_api_key');
    await mkdir(blockedBraveTarget, { recursive: true });

    const error = await captureError(configNewProject([], projectDir));

    expect(error.message).toContain('keyfile write failed — nothing was written');
    expect(existsSync(join(tmpHome, '.oto', 'exa_api_key'))).toBe(false);
    expect((await stat(blockedBraveTarget)).isDirectory()).toBe(true);
    expect(await readFile(join(tmpHome, '.gsd', 'defaults.json'), 'utf8')).toBe(bytes);
    expect(existsSync(join(projectDir, '.oto'))).toBe(false);
  });
});
