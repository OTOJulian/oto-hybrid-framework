/**
 * Unit tests for config-get and resolve-model query handlers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GSDError, ErrorClassification, exitCodeFor } from '../errors.js';

// ─── Test setup ─────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'gsd-cfg-'));
  await mkdir(join(tmpDir, '.oto'), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ─── configGet ──────────────────────────────────────────────────────────────

describe('configGet', () => {
  it('returns raw config value for top-level key', async () => {
    const { configGet } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );
    const result = await configGet(['model_profile'], tmpDir);
    expect(result.data).toBe('quality');
  });

  it('traverses dot-notation for nested keys', async () => {
    const { configGet } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ workflow: { auto_advance: true } }),
    );
    const result = await configGet(['workflow.auto_advance'], tmpDir);
    expect(result.data).toBe(true);
  });

  it('throws GSDError when no key provided', async () => {
    const { configGet } = await import('./config-query.js');
    await expect(configGet([], tmpDir)).rejects.toThrow(GSDError);
  });

  it('throws GSDError for nonexistent key', async () => {
    const { configGet } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );
    await expect(configGet(['nonexistent.key'], tmpDir)).rejects.toThrow(GSDError);
  });

  it('throws GSDError that maps to exit code 1 for missing key (bug #2544)', async () => {
    const { configGet } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );
    try {
      await configGet(['nonexistent.key'], tmpDir);
      throw new Error('expected configGet to throw for missing key');
    } catch (err) {
      expect(err).toBeInstanceOf(GSDError);
      const gsdErr = err as GSDError;
      // UNIX convention: missing config key should exit 1 (like `git config --get`).
      // Validation (exit 10) is the previous buggy classification — see issue #2544.
      expect(gsdErr.classification).toBe(ErrorClassification.Execution);
      expect(exitCodeFor(gsdErr.classification)).toBe(1);
    }
  });

  it('throws GSDError that maps to exit code 1 when traversing into non-object (bug #2544)', async () => {
    const { configGet } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );
    try {
      await configGet(['model_profile.subkey'], tmpDir);
      throw new Error('expected configGet to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(GSDError);
      const gsdErr = err as GSDError;
      expect(exitCodeFor(gsdErr.classification)).toBe(1);
    }
  });

  it('reads raw config without merging defaults', async () => {
    const { configGet } = await import('./config-query.js');
    // Write config with only model_profile -- no workflow section
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    // Accessing workflow should fail (not merged with defaults)
    await expect(configGet(['workflow.auto_advance'], tmpDir)).rejects.toThrow(GSDError);
  });
});

// ─── resolveModel ───────────────────────────────────────────────────────────

describe('resolveModel', () => {
  it('returns model and profile for known agent', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model');
    expect(data).toHaveProperty('profile', 'balanced');
    expect(data).not.toHaveProperty('unknown_agent');
  });

  it('returns unknown_agent flag for unknown agent', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await resolveModel(['unknown-agent'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', 'sonnet');
    expect(data).toHaveProperty('unknown_agent', true);
  });

  it('throws GSDError when no agent type provided', async () => {
    const { resolveModel } = await import('./config-query.js');
    await expect(resolveModel([], tmpDir)).rejects.toThrow(GSDError);
  });

  it('respects model_overrides from config', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({
        model_profile: 'balanced',
        model_overrides: { 'gsd-planner': 'openai/gpt-5.4' },
      }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', 'openai/gpt-5.4');
  });

  it('returns empty model when resolve_model_ids is omit', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({
        model_profile: 'balanced',
        resolve_model_ids: 'omit',
      }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', '');
  });

  it('returns inherit for known agent when profile is inherit', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'inherit' }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', 'inherit');
    expect(data).toHaveProperty('profile', 'inherit');
    expect(data).not.toHaveProperty('unknown_agent');
  });

  it('inherit takes precedence over resolve_model_ids omit (init.quick regression)', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({
        model_profile: 'inherit',
        resolve_model_ids: 'omit',
      }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', 'inherit');
    expect(data).toHaveProperty('profile', 'inherit');
  });

  it('per-agent model_overrides still beat inherit profile', async () => {
    const { resolveModel } = await import('./config-query.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({
        model_profile: 'inherit',
        model_overrides: { 'gsd-planner': 'openai/gpt-5.4' },
      }),
    );
    const result = await resolveModel(['gsd-planner'], tmpDir);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('model', 'openai/gpt-5.4');
    expect(data).toHaveProperty('profile', 'inherit');
  });

  it('resolveModel uses workstream config when --ws is specified', async () => {
    const { resolveModel } = await import('./config-query.js');
    // Root config: balanced profile → gsd-executor resolves to 'sonnet'
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    // Workstream config: quality profile → gsd-executor resolves to 'opus'
    await mkdir(join(tmpDir, '.oto', 'workstreams', 'frontend'), { recursive: true });
    await writeFile(
      join(tmpDir, '.oto', 'workstreams', 'frontend', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );

    const rootResult = await resolveModel(['gsd-executor'], tmpDir);
    const rootData = rootResult.data as Record<string, unknown>;
    expect(rootData.profile).toBe('balanced');
    expect(rootData.model).toBe('sonnet');

    const wsResult = await resolveModel(['gsd-executor'], tmpDir, 'frontend');
    const wsData = wsResult.data as Record<string, unknown>;
    expect(wsData.profile).toBe('quality');
    expect(wsData.model).toBe('opus');
  });
});

// ─── MODEL_PROFILES ─────────────────────────────────────────────────────────

describe('MODEL_PROFILES', () => {
  it('contains all 18 agent entries (sync with model-profiles.cjs)', async () => {
    const { MODEL_PROFILES } = await import('./config-query.js');
    expect(Object.keys(MODEL_PROFILES)).toHaveLength(18);
  });

  it('has quality/balanced/budget/adaptive for each agent', async () => {
    const { MODEL_PROFILES } = await import('./config-query.js');
    for (const agent of Object.keys(MODEL_PROFILES)) {
      expect(MODEL_PROFILES[agent]).toHaveProperty('quality');
      expect(MODEL_PROFILES[agent]).toHaveProperty('balanced');
      expect(MODEL_PROFILES[agent]).toHaveProperty('budget');
      expect(MODEL_PROFILES[agent]).toHaveProperty('adaptive');
    }
  });
});

// ─── VALID_PROFILES ─────────────────────────────────────────────────────────

describe('VALID_PROFILES', () => {
  it('contains the five profile names including inherit (sync with model-profiles.cjs)', async () => {
    const { VALID_PROFILES } = await import('./config-query.js');
    expect(VALID_PROFILES).toEqual(['quality', 'balanced', 'budget', 'adaptive', 'inherit']);
  });
});

// ─── getAgentToModelMapForProfile ───────────────────────────────────────────

describe('getAgentToModelMapForProfile', () => {
  it("maps every agent to 'inherit' for the inherit profile (sync with model-profiles.cjs)", async () => {
    const { getAgentToModelMapForProfile, MODEL_PROFILES } = await import('./config-query.js');
    const map = getAgentToModelMapForProfile('inherit');
    expect(Object.keys(map)).toHaveLength(Object.keys(MODEL_PROFILES).length);
    for (const agent of Object.keys(MODEL_PROFILES)) {
      expect(map[agent]).toBe('inherit');
    }
  });
});

// ─── Phase 14 gap-closure: fail-closed integration reads (CR-02) ────────────
// NOTE: this describe MUST stay last in the file — the post-read gate test
// calls vi.resetModules(), which re-instantiates errors.js for any later
// dynamic import and would break instanceof GSDError assertions elsewhere.

describe('configGet fail-closed integration reads (Phase 14 gap-closure, CR-02)', () => {
  const INTEGRATION_CASES = [
    ['exa_search', 'exa_api_key'],
    ['brave_search', 'brave_api_key'],
    ['firecrawl', 'firecrawl_api_key'],
  ] as const;

  afterEach(() => {
    vi.doUnmock('./secrets.js');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  /**
   * Broken-home fixture: `$HOME/.oto` is a regular file, so writeKeyfile's
   * mkdirSync throws and migrateLegacyIntegrationKeys cannot complete.
   */
  async function stubBrokenHome(name: string): Promise<string> {
    const fakeHome = join(tmpDir, name);
    await mkdir(fakeHome, { recursive: true });
    await writeFile(join(fakeHome, '.oto'), 'not-a-dir');
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    return fakeHome;
  }

  it('rejects with a sanitized error when migration cannot complete (all three integrations)', async () => {
    const { configGet } = await import('./config-query.js');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    for (const [configKey] of INTEGRATION_CASES) {
      const fakeHome = await stubBrokenHome(`home-broken-${configKey}`);
      const marker = `sk-test-cq-${configKey}-0123456789`;
      const configFile = join(tmpDir, '.oto', 'config.json');
      const original = JSON.stringify({ [configKey]: marker });
      await writeFile(configFile, original);

      let caught: unknown;
      try {
        await configGet([configKey], tmpDir);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(GSDError);
      expect((caught as GSDError).message).toContain('withheld');
      expect((caught as GSDError).message).not.toContain(marker);
      expect((caught as GSDError).classification).toBe(ErrorClassification.Execution);
      // Config unchanged: the legacy string stays put, but it never left the handler.
      expect(await readFile(configFile, 'utf8')).toBe(original);
      // Broken home untouched — no keyfile could have been created.
      expect(await readFile(join(fakeHome, '.oto'), 'utf8')).toBe('not-a-dir');
    }
  });

  it('preserves fail-open reads for non-sensitive keys on the broken-home fixture', async () => {
    const { configGet } = await import('./config-query.js');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await stubBrokenHome('home-broken-nonsensitive');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality', exa_search: 'sk-test-cq-open-0123456789' }),
    );

    const result = await configGet(['model_profile'], tmpDir);
    expect(result.data).toBe('quality');
  });

  it('post-read gate: an integration string never leaves configGet even when migration silently no-ops', async () => {
    vi.resetModules();
    const actual = await vi.importActual<typeof import('./secrets.js')>('./secrets.js');
    vi.doMock('./secrets.js', () => ({
      ...actual,
      migrateLegacyIntegrationKeys: vi.fn().mockResolvedValue({ migrated: [], conflicts: [] }),
    }));
    const { configGet } = await import('./config-query.js');

    const marker = 'sk-test-cq-gate-0123456789';
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ exa_search: marker }),
    );

    let caught: unknown;
    try {
      await configGet(['exa_search'], tmpDir);
    } catch (err) {
      caught = err;
    }

    // vi.resetModules re-instantiates errors.js, so assert on shape, not identity.
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('withheld');
    expect((caught as Error).message).not.toContain(marker);
    expect((caught as { classification?: string }).classification).toBe('execution');
  });
});
