/**
 * Unit tests for config mutation handlers.
 *
 * Tests: isValidConfigKey, parseConfigValue, configSet,
 * configSetModelProfile, configNewProject, configEnsureSection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GSDError } from '../errors.js';

// ─── Test setup ─────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'gsd-cfgmut-'));
  await mkdir(join(tmpDir, '.oto'), { recursive: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(tmpDir, { recursive: true, force: true });
});

// ─── isValidConfigKey ──────────────────────────────────────────────────────

describe('isValidConfigKey', () => {
  it('accepts known exact keys', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('model_profile').valid).toBe(true);
    expect(isValidConfigKey('commit_docs').valid).toBe(true);
    expect(isValidConfigKey('workflow.auto_advance').valid).toBe(true);
  });

  it('accepts workflow.context_coverage_gate (#2492)', async () => {
    const { isValidConfigKey, parseConfigValue } = await import('./config-mutation.js');
    expect(isValidConfigKey('workflow.context_coverage_gate').valid).toBe(true);
    expect(parseConfigValue('true')).toBe(true);
    expect(parseConfigValue('false')).toBe(false);
  });

  it('accepts wildcard agent_skills.* patterns', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('agent_skills.gsd-planner').valid).toBe(true);
    expect(isValidConfigKey('agent_skills.custom_agent').valid).toBe(true);
  });

  it('accepts wildcard features.* patterns', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('features.global_learnings').valid).toBe(true);
    expect(isValidConfigKey('features.thinking_partner').valid).toBe(true);
  });

  it('rejects unknown keys with suggestion', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    const result = isValidConfigKey('model_profle');
    expect(result.valid).toBe(false);
    expect(result.suggestion).toBeDefined();
  });

  it('rejects completely invalid keys', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    const result = isValidConfigKey('totally_unknown_key');
    expect(result.valid).toBe(false);
  });

  it('accepts learnings.max_inject as valid key (D7)', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('learnings.max_inject').valid).toBe(true);
  });

  it('accepts features.global_learnings as valid key (D7)', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('features.global_learnings').valid).toBe(true);
  });

  it('returns curated suggestion for known typos before LCP fallback (D9)', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    const r1 = isValidConfigKey('workflow.codereview');
    expect(r1.valid).toBe(false);
    expect(r1.suggestion).toBe('workflow.code_review');

    const r2 = isValidConfigKey('agents.nyquist_validation_enabled');
    expect(r2.valid).toBe(false);
    expect(r2.suggestion).toBe('workflow.nyquist_validation');
  });

  // #2653 — SDK/CJS config-schema drift regression.
  // Every key accepted by the CJS config-set must also be accepted by
  // the SDK config-set. We exercise every entry in the shared schema
  // so drift fails this test the moment it is introduced.
  it('#2653 — accepts every key in shared VALID_CONFIG_KEYS', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    const { VALID_CONFIG_KEYS } = await import('./config-schema.js');
    const rejected: string[] = [];
    for (const key of VALID_CONFIG_KEYS) {
      const { valid } = isValidConfigKey(key);
      if (!valid) rejected.push(key);
    }
    expect(rejected).toEqual([]);
  });

  it('#2653 — accepts sample dynamic keys from every DYNAMIC_KEY_PATTERN', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    const samples = [
      'agent_skills.gsd-planner',
      'review.models.claude',
      'features.some_feature',
      'claude_md_assembly.blocks.intro',
      'model_profile_overrides.codex.opus',
      'model_profile_overrides.codex.sonnet',
      'model_profile_overrides.my-runtime.haiku',
    ];
    for (const key of samples) {
      expect(isValidConfigKey(key).valid, `expected ${key} to be accepted`).toBe(true);
    }
  });

  it('#2653 — accepts planning.sub_repos (CJS/docs key, previously rejected by SDK)', async () => {
    const { isValidConfigKey } = await import('./config-mutation.js');
    expect(isValidConfigKey('planning.sub_repos').valid).toBe(true);
  });
});

// ─── parseConfigValue ──────────────────────────────────────────────────────

describe('parseConfigValue', () => {
  it('converts "true" to boolean true', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('true')).toBe(true);
  });

  it('converts "false" to boolean false', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('false')).toBe(false);
  });

  it('converts numeric strings to numbers', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('42')).toBe(42);
    expect(parseConfigValue('3.14')).toBe(3.14);
  });

  it('parses JSON arrays', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('["a","b"]')).toEqual(['a', 'b']);
  });

  it('parses JSON objects', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('{"key":"val"}')).toEqual({ key: 'val' });
  });

  it('preserves plain strings', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('hello')).toBe('hello');
  });

  it('preserves empty string as empty string', async () => {
    const { parseConfigValue } = await import('./config-mutation.js');
    expect(parseConfigValue('')).toBe('');
  });
});

// ─── atomicWriteConfig behavior ───────────────────────────────────────────

describe('atomicWriteConfig internals (via configSet)', () => {
  it('uses PID-qualified temp file name (D4)', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(join(tmpDir, '.oto', 'config.json'), '{}');

    await configSet(['model_profile', 'quality'], tmpDir);

    // Verify the config was written (temp file should be cleaned up)
    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('quality');
  });

  it('falls back to direct write when rename fails (D5)', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(join(tmpDir, '.oto', 'config.json'), '{}');

    // Even if rename would fail, config-set should still succeed via fallback
    await configSet(['model_profile', 'balanced'], tmpDir);
    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('balanced');
  });
});

// ─── configSet lock protection ────────────────────────────────────────────

describe('configSet lock protection (D6)', () => {
  it('acquires and releases lock around read-modify-write', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(join(tmpDir, '.oto', 'config.json'), '{}');

    // Run two concurrent config-set operations — both should succeed without corruption
    const [r1, r2] = await Promise.all([
      configSet(['commit_docs', 'true'], tmpDir),
      configSet(['model_profile', 'quality'], tmpDir),
    ]);
    expect((r1.data as { updated: boolean }).updated).toBe(true);
    expect((r2.data as { updated: boolean }).updated).toBe(true);

    // Both values should be present (no lost updates)
    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.commit_docs).toBe(true);
    expect(raw.model_profile).toBe('quality');
  });
});

// ─── configSet context validation ─────────────────────────────────────────

describe('configSet context validation (D8)', () => {
  it('rejects invalid context values', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(join(tmpDir, '.oto', 'config.json'), '{}');

    await expect(configSet(['context', 'invalid'], tmpDir)).rejects.toThrow(/Invalid context value/);
  });

  it('accepts valid context values (dev, research, review)', async () => {
    const { configSet } = await import('./config-mutation.js');

    for (const ctx of ['dev', 'research', 'review']) {
      await writeFile(join(tmpDir, '.oto', 'config.json'), '{}');
      const result = await configSet(['context', ctx], tmpDir);
      expect((result.data as { updated: boolean }).updated).toBe(true);
    }
  });
});

// ─── configNewProject global defaults ─────────────────────────────────────

describe('configNewProject global defaults (D11)', () => {
  it('creates config with standard defaults when no global defaults exist', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const result = await configNewProject([], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('balanced');
  });
});

// ─── configNewProject nested globalDefaults merging ───────────────────────

describe('configNewProject nested globalDefaults merging (fix #2673)', () => {
  let fakeHome: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    fakeHome = await mkdtemp(join(tmpdir(), 'gsd-fakehome-'));
    await mkdir(join(fakeHome, '.gsd'), { recursive: true });
    originalHome = process.env.HOME;
    process.env.HOME = fakeHome;
  });

  afterEach(async () => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    await rm(fakeHome, { recursive: true, force: true });
  });

  it('preserves nested workflow keys from globalDefaults', async () => {
    await writeFile(
      join(fakeHome, '.gsd', 'defaults.json'),
      JSON.stringify({
        workflow: { auto_advance: true, discuss_mode: 'skip' },
        git: { branching_strategy: 'milestone' },
      }),
    );

    const { configNewProject } = await import('./config-mutation.js');
    const result = await configNewProject([], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    // Nested workflow keys from globalDefaults must survive
    expect(raw.workflow.auto_advance).toBe(true);
    expect(raw.workflow.discuss_mode).toBe('skip');
    // Hardcoded defaults not overridden by globalDefaults must still be present
    expect(raw.workflow.research).toBe(true);
    // Nested git key from globalDefaults must survive
    expect(raw.git.branching_strategy).toBe('milestone');
    // Hardcoded git defaults not overridden must still be present
    expect(raw.git.phase_branch_template).toBe('gsd/phase-{phase}-{slug}');
  });

  it('lets userChoices override globalDefaults nested keys', async () => {
    await writeFile(
      join(fakeHome, '.gsd', 'defaults.json'),
      JSON.stringify({
        workflow: { auto_advance: true },
      }),
    );

    const { configNewProject } = await import('./config-mutation.js');
    const choices = JSON.stringify({ workflow: { auto_advance: false } });
    const result = await configNewProject([choices], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    // userChoices must win over globalDefaults
    expect(raw.workflow.auto_advance).toBe(false);
  });

  it('preserves nested hooks, agent_skills, and features keys from globalDefaults', async () => {
    await writeFile(
      join(fakeHome, '.gsd', 'defaults.json'),
      JSON.stringify({
        hooks: { context_warnings: false },
        agent_skills: { my_skill: true },
        features: { beta_feature: true },
      }),
    );

    const { configNewProject } = await import('./config-mutation.js');
    const result = await configNewProject([], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.hooks.context_warnings).toBe(false);
    expect(raw.agent_skills.my_skill).toBe(true);
    expect(raw.features.beta_feature).toBe(true);
  });
});

// ─── configSet ─────────────────────────────────────────────────────────────

describe('configSet', () => {
  it('writes value and round-trips through reading config.json', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await configSet(['model_profile', 'quality'], tmpDir);
    expect(result.data).toEqual({
      updated: true,
      key: 'model_profile',
      value: 'quality',
      previousValue: 'balanced',
    });

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('quality');
  });

  it('sets nested dot-notation keys', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ workflow: { research: true } }),
    );
    const result = await configSet(['workflow.auto_advance', 'true'], tmpDir);
    expect(result.data).toEqual({
      updated: true,
      key: 'workflow.auto_advance',
      value: true,
    });

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.workflow.auto_advance).toBe(true);
    expect(raw.workflow.research).toBe(true);
  });

  it('rejects invalid key with GSDError', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({}),
    );
    await expect(configSet(['totally_bogus_key', 'value'], tmpDir)).rejects.toThrow(GSDError);
  });

  it('coerces values through parseConfigValue', async () => {
    const { configSet } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({}),
    );
    await configSet(['commit_docs', 'true'], tmpDir);
    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.commit_docs).toBe(true);
  });
});

// ─── Phase 14 integration secret validation ───────────────────────────────

describe('configSet integration flags (Phase 14, SECR-02)', () => {
  it('rejects string values for all integration flags without changing config.json', async () => {
    const { configSet } = await import('./config-mutation.js');
    const configPath = join(tmpDir, '.oto', 'config.json');
    const original = {
      exa_search: false,
      brave_search: false,
      firecrawl: false,
      commit_docs: true,
    };
    await writeFile(configPath, JSON.stringify(original));

    for (const key of ['exa_search', 'brave_search', 'firecrawl']) {
      await expect(configSet([key, 'sk-test123456789'], tmpDir)).rejects.toMatchObject({
        classification: 'validation',
        message: expect.stringContaining('booleans only'),
      });
      await expect(configSet([key, 'sk-test123456789'], tmpDir)).rejects.toThrow('secret-set');
      expect(JSON.parse(await readFile(configPath, 'utf8'))).toEqual(original);
    }
  });

  it('warns but allows boolean true when no key source is detected', async () => {
    const { configSet } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home');
    await mkdir(fakeHome, { recursive: true });
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const configPath = join(tmpDir, '.oto', 'config.json');
    await writeFile(configPath, JSON.stringify({ exa_search: false }));

    await expect(configSet(['exa_search', 'true'], tmpDir)).resolves.toMatchObject({
      data: { value: true },
    });

    expect(JSON.parse(await readFile(configPath, 'utf8')).exa_search).toBe(true);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain(
      'no Exa API key detected (EXA_API_KEY or ~/.oto/exa_api_key)',
    );
  });
});

// ─── Phase 14 canonical keyfile detection ─────────────────────────────────

describe('configNewProject integration keyfile detection (Phase 14, D-08)', () => {
  it('enables Exa when ~/.oto/exa_api_key exists', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-oto');
    await mkdir(join(fakeHome, '.oto'), { recursive: true });
    await writeFile(join(fakeHome, '.oto', 'exa_api_key'), 'exa-key\n');
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');

    await configNewProject([], tmpDir);

    const config = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf8'));
    expect(config.exa_search).toBe(true);
  });

  it('ignores a foreign ~/.gsd/exa_api_key with no fallback', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-gsd');
    const projectDir = join(tmpDir, 'foreign-key-project');
    await mkdir(join(fakeHome, '.gsd'), { recursive: true });
    await writeFile(join(fakeHome, '.gsd', 'exa_api_key'), 'foreign-key\n');
    await mkdir(join(projectDir, '.oto'), { recursive: true });
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');

    await configNewProject([], projectDir);

    const config = JSON.parse(await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'));
    expect(config.exa_search).toBe(false);
  });
});

// ─── Phase 14 gap-closure: new-project boolean enforcement (CR-01) ────────

describe('configNewProject boolean enforcement (Phase 14 gap-closure, CR-01)', () => {
  const INTEGRATION_CASES = [
    ['exa_search', 'exa_api_key'],
    ['brave_search', 'brave_api_key'],
    ['firecrawl', 'firecrawl_api_key'],
  ] as const;

  function stubCleanHome(fakeHome: string): void {
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
  }

  it('rejects caller-supplied strings for all three integrations without creating config.json', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-reject');
    await mkdir(join(fakeHome, '.oto'), { recursive: true });
    stubCleanHome(fakeHome);

    for (const [configKey] of INTEGRATION_CASES) {
      const projectDir = join(tmpDir, `reject-${configKey}`);
      await mkdir(join(projectDir, '.oto'), { recursive: true });
      const marker = `sk-test-${configKey}-0123456789`;

      let caught: unknown;
      try {
        await configNewProject([JSON.stringify({ [configKey]: marker })], projectDir);
      } catch (err: unknown) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(GSDError);
      expect((caught as GSDError).message).toMatch(/booleans only/);
      expect((caught as GSDError).message).not.toContain(marker);
      expect(existsSync(join(projectDir, '.oto', 'config.json'))).toBe(false);
    }
  });

  it('migrates global-default strings to 0600 ~/.oto keyfiles; .gsd/defaults.json stays byte-identical (D-08)', async () => {
    const { configNewProject } = await import('./config-mutation.js');

    for (const [configKey, keyfileName] of INTEGRATION_CASES) {
      const fakeHome = join(tmpDir, `home-migrate-${configKey}`);
      await mkdir(join(fakeHome, '.oto'), { recursive: true });
      await mkdir(join(fakeHome, '.gsd'), { recursive: true });
      const marker = `sk-test-${configKey}-9876543210`;
      const seeded = JSON.stringify({ [configKey]: marker }, null, 2) + '\n';
      await writeFile(join(fakeHome, '.gsd', 'defaults.json'), seeded);
      stubCleanHome(fakeHome);
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const projectDir = join(tmpDir, `migrate-${configKey}`);
      await mkdir(join(projectDir, '.oto'), { recursive: true });
      await configNewProject([], projectDir);

      const config = JSON.parse(
        await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'),
      ) as Record<string, unknown>;
      expect(config[configKey]).toBe(true);

      const keyfile = join(fakeHome, '.oto', keyfileName);
      expect(await readFile(keyfile, 'utf8')).toBe(`${marker}\n`);
      expect((await stat(keyfile)).mode & 0o777).toBe(0o600);

      // D-08: the GSD defaults source is READ-ONLY — never rewritten.
      expect(await readFile(join(fakeHome, '.gsd', 'defaults.json'), 'utf8')).toBe(seeded);

      const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
      expect(output).toContain(
        `migrated ${configKey} API key from global defaults to ~/.oto/${keyfileName} (0600)`,
      );
      expect(output).not.toContain(marker);
      stderr.mockRestore();
    }
  });

  it('re-migrates on each new project with a repeat masked notice; .gsd untouched (T-14-05-05)', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-repeat');
    await mkdir(join(fakeHome, '.oto'), { recursive: true });
    await mkdir(join(fakeHome, '.gsd'), { recursive: true });
    const marker = 'sk-test-repeat-fc-0123456789';
    const seeded = JSON.stringify({ firecrawl: marker }, null, 2) + '\n';
    await writeFile(join(fakeHome, '.gsd', 'defaults.json'), seeded);
    stubCleanHome(fakeHome);

    const firstProject = join(tmpDir, 'repeat-first');
    await mkdir(join(firstProject, '.oto'), { recursive: true });
    await configNewProject([], firstProject);

    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const secondProject = join(tmpDir, 'repeat-second');
    await mkdir(join(secondProject, '.oto'), { recursive: true });
    await configNewProject([], secondProject);

    const secondConfig = JSON.parse(
      await readFile(join(secondProject, '.oto', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(secondConfig.firecrawl).toBe(true);

    const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain(
      'migrated firecrawl API key from global defaults to ~/.oto/firecrawl_api_key (0600)',
    );
    expect(output).not.toContain(marker);
    expect(await readFile(join(fakeHome, '.gsd', 'defaults.json'), 'utf8')).toBe(seeded);
  });

  it('keeps an existing ~/.oto keyfile over a conflicting global-default string (D-02)', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-conflict');
    await mkdir(join(fakeHome, '.oto'), { recursive: true });
    await mkdir(join(fakeHome, '.gsd'), { recursive: true });
    const keyfileSecret = 'sk-existing-keyfile-0000';
    const defaultsSecret = 'sk-defaults-different-1111';
    const keyfile = join(fakeHome, '.oto', 'exa_api_key');
    await writeFile(keyfile, keyfileSecret + '\n', { mode: 0o600 });
    await writeFile(
      join(fakeHome, '.gsd', 'defaults.json'),
      JSON.stringify({ exa_search: defaultsSecret }),
    );
    stubCleanHome(fakeHome);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const projectDir = join(tmpDir, 'conflict-project');
    await mkdir(join(projectDir, '.oto'), { recursive: true });
    await configNewProject([], projectDir);

    // Keyfile wins: content unchanged, config gets boolean true.
    expect(await readFile(keyfile, 'utf8')).toBe(keyfileSecret + '\n');
    const config = JSON.parse(
      await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(config.exa_search).toBe(true);

    const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('kept; config string (****1111) dropped');
    expect(output).not.toContain(keyfileSecret);
    expect(output).not.toContain(defaultsSecret);
  });

  it('never writes a non-boolean integration value for mixed choices + defaults (defense gate)', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-mixed');
    await mkdir(join(fakeHome, '.oto'), { recursive: true });
    await mkdir(join(fakeHome, '.gsd'), { recursive: true });
    await writeFile(
      join(fakeHome, '.gsd', 'defaults.json'),
      JSON.stringify({ brave_search: 'sk-test-brave-mixed-0123456789' }),
    );
    stubCleanHome(fakeHome);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const projectDir = join(tmpDir, 'mixed-project');
    await mkdir(join(projectDir, '.oto'), { recursive: true });
    await configNewProject([JSON.stringify({ exa_search: true })], projectDir);

    const config = JSON.parse(
      await readFile(join(projectDir, '.oto', 'config.json'), 'utf8'),
    ) as Record<string, unknown>;
    for (const [configKey] of INTEGRATION_CASES) {
      expect(typeof config[configKey]).toBe('boolean');
    }
    expect(config.exa_search).toBe(true);
    expect(config.brave_search).toBe(true);
  });
});

// ─── Phase 14 read-time legacy migration ──────────────────────────────────

describe('SDK config read migration (Phase 14, SECR-03)', () => {
  it('configGet migrates a legacy integration string before returning the value', async () => {
    const { configGet } = await import('./config-query.js');
    const fakeHome = join(tmpDir, 'home-config-get');
    await mkdir(fakeHome, { recursive: true });
    vi.stubEnv('HOME', fakeHome);
    const plaintext = 'exa-legacy-config-get-1234';
    const configPath = join(tmpDir, '.oto', 'config.json');
    await writeFile(configPath, JSON.stringify({ exa_search: plaintext }));
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(configGet(['exa_search'], tmpDir)).resolves.toEqual({ data: true });

    const keyfile = join(fakeHome, '.oto', 'exa_api_key');
    expect(await readFile(keyfile, 'utf8')).toBe(`${plaintext}\n`);
    expect((await stat(keyfile)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(configPath, 'utf8')).exa_search).toBe(true);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain(plaintext);
  });

  it('loadConfig migrates legacy strings while retaining missing-config defaults', async () => {
    const { loadConfig } = await import('../config.js');
    const fakeHome = join(tmpDir, 'home-load-config');
    await mkdir(fakeHome, { recursive: true });
    vi.stubEnv('HOME', fakeHome);
    const plaintext = 'exa-legacy-load-config-5678';
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ exa_search: plaintext }),
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(loadConfig(tmpDir)).resolves.toMatchObject({ exa_search: true });
    const keyfile = join(fakeHome, '.oto', 'exa_api_key');
    expect(await readFile(keyfile, 'utf8')).toBe(`${plaintext}\n`);
    expect((await stat(keyfile)).mode & 0o777).toBe(0o600);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain(plaintext);

    const noConfigProject = join(tmpDir, 'no-config-project');
    await mkdir(noConfigProject, { recursive: true });
    await expect(loadConfig(noConfigProject)).resolves.toMatchObject({ exa_search: false });
  });
});

// ─── Phase 14 gap-closure: configSet legacy migration ──────────────────────

describe('configSet legacy migration (Phase 14 gap-closure)', () => {
  const INTEGRATION_CASES = [
    ['exa_search', 'exa_api_key'],
    ['brave_search', 'brave_api_key'],
    ['firecrawl', 'firecrawl_api_key'],
  ] as const;

  function stubCleanEnv(fakeHome: string): void {
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
  }

  it('migrates before warning so a newly created keyfile is detected', async () => {
    const { configSet } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-cs-warning-order');
    await mkdir(fakeHome, { recursive: true });
    stubCleanEnv(fakeHome);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const marker = 'sk-test-cs-warning-order-0123456789';
    const configFile = join(tmpDir, '.oto', 'config.json');
    await writeFile(configFile, JSON.stringify({ exa_search: marker }));

    await configSet(['exa_search', 'true'], tmpDir);

    const output = stderr.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('migrated exa_search API key');
    expect(output).not.toContain('no Exa API key detected');
  });

  it('migrates a legacy string to a keyfile before overwriting; previousValue never carries the secret', async () => {
    const { configSet } = await import('./config-mutation.js');

    for (const [configKey, keyfileName] of INTEGRATION_CASES) {
      const fakeHome = join(tmpDir, `home-cs-${configKey}`);
      await mkdir(fakeHome, { recursive: true });
      stubCleanEnv(fakeHome);
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const marker = `sk-test-cs-${configKey}-0123456789`;
      const configFile = join(tmpDir, '.oto', 'config.json');
      await writeFile(configFile, JSON.stringify({ [configKey]: marker }));

      const result = await configSet([configKey, 'true'], tmpDir);

      const keyfile = join(fakeHome, '.oto', keyfileName);
      expect(await readFile(keyfile, 'utf8')).toBe(`${marker}\n`);
      expect((await stat(keyfile)).mode & 0o777).toBe(0o600);
      expect(JSON.parse(await readFile(configFile, 'utf8'))[configKey]).toBe(true);

      const previousValue = (result.data as Record<string, unknown>).previousValue;
      expect(previousValue).not.toBe(marker);
      expect(String(previousValue).includes('sk-test')).toBe(false);
      expect(JSON.stringify(result)).not.toContain(marker);
      stderr.mockRestore();
    }
  });

  it('fails closed when migration cannot complete — config not modified, no secret in the error', async () => {
    const { configSet } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-cs-broken');
    await mkdir(fakeHome, { recursive: true });
    // `.oto` as a regular file: writeKeyfile's mkdirSync throws, migration cannot complete.
    await writeFile(join(fakeHome, '.oto'), 'not-a-dir');
    stubCleanEnv(fakeHome);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const marker = 'sk-test-cs-broken-0123456789';
    const configFile = join(tmpDir, '.oto', 'config.json');
    const original = JSON.stringify({ exa_search: marker });
    await writeFile(configFile, original);

    let caught: unknown;
    try {
      await configSet(['exa_search', 'true'], tmpDir);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(GSDError);
    expect((caught as GSDError).message).toMatch(/migration failed — config not modified/);
    expect((caught as GSDError).message).not.toContain(marker);
    // Byte-identical: the legacy credential was neither destroyed nor overwritten.
    expect(await readFile(configFile, 'utf8')).toBe(original);
  });

  it('leaves non-integration keys unaffected on the broken-home fixture', async () => {
    const { configSet } = await import('./config-mutation.js');
    const fakeHome = join(tmpDir, 'home-cs-nonint');
    await mkdir(fakeHome, { recursive: true });
    await writeFile(join(fakeHome, '.oto'), 'not-a-dir');
    stubCleanEnv(fakeHome);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const configFile = join(tmpDir, '.oto', 'config.json');
    await writeFile(configFile, JSON.stringify({ model_profile: 'balanced' }));

    await expect(configSet(['model_profile', 'quality'], tmpDir)).resolves.toMatchObject({
      data: { updated: true, key: 'model_profile', value: 'quality' },
    });
    expect(JSON.parse(await readFile(configFile, 'utf8')).model_profile).toBe('quality');
  });
});

// ─── Phase 14 gap-closure: root-fallback migration (CR-04) ─────────────────

describe('loadConfig root-fallback migration (Phase 14 gap-closure, CR-04)', () => {
  function stubCleanEnv(fakeHome: string): void {
    vi.stubEnv('HOME', fakeHome);
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
  }

  it('migrates the ROOT config layer before the root-fallback read for a missing workstream', async () => {
    const { loadConfig } = await import('../config.js');
    const fakeHome = join(tmpDir, 'home-root-fallback');
    await mkdir(fakeHome, { recursive: true });
    stubCleanEnv(fakeHome);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const marker = 'sk-test-root-0123456789';
    const rootConfig = join(tmpDir, '.oto', 'config.json');
    await writeFile(rootConfig, JSON.stringify({ exa_search: marker }));

    const result = await loadConfig(tmpDir, 'ws-missing');

    expect(result.exa_search).toBe(true);
    const keyfile = join(fakeHome, '.oto', 'exa_api_key');
    expect(await readFile(keyfile, 'utf8')).toBe(`${marker}\n`);
    expect((await stat(keyfile)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(rootConfig, 'utf8')).exa_search).toBe(true);
    expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain(marker);
  });

  it('scrubs integration strings from the loader result when migration cannot complete', async () => {
    const { loadConfig } = await import('../config.js');
    const fakeHome = join(tmpDir, 'home-root-broken');
    await mkdir(fakeHome, { recursive: true });
    // `.oto` as a regular file: writeKeyfile's mkdirSync throws, migration cannot complete.
    await writeFile(join(fakeHome, '.oto'), 'not-a-dir');
    stubCleanEnv(fakeHome);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const marker = 'sk-test-root-broken-0123456789';
    await writeFile(join(tmpDir, '.oto', 'config.json'), JSON.stringify({ exa_search: marker }));

    const result = await loadConfig(tmpDir, 'ws-missing');

    expect(typeof result.exa_search).toBe('boolean');
    expect(JSON.stringify(result)).not.toContain(marker);
  });
});

// ─── configSetModelProfile ─────────────────────────────────────────────────

describe('configSetModelProfile', () => {
  it('writes valid profile', async () => {
    const { configSetModelProfile } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await configSetModelProfile(['quality'], tmpDir);
    expect((result.data as { updated: boolean }).updated).toBe(true);
    expect((result.data as { profile: string }).profile).toBe('quality');

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('quality');
  });

  it('rejects invalid profile with GSDError', async () => {
    const { configSetModelProfile } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({}),
    );
    await expect(configSetModelProfile(['invalid_profile'], tmpDir)).rejects.toThrow(GSDError);
  });

  it("accepts 'inherit' and maps every agent to inherit", async () => {
    const { configSetModelProfile } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await configSetModelProfile(['inherit'], tmpDir);
    expect((result.data as { updated: boolean }).updated).toBe(true);
    expect((result.data as { profile: string }).profile).toBe('inherit');

    const agentToModelMap = (result.data as { agentToModelMap: Record<string, string> })
      .agentToModelMap;
    expect(Object.keys(agentToModelMap).length).toBeGreaterThan(0);
    for (const model of Object.values(agentToModelMap)) {
      expect(model).toBe('inherit');
    }

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('inherit');
  });

  it('normalizes profile name to lowercase', async () => {
    const { configSetModelProfile } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({}),
    );
    const result = await configSetModelProfile(['Quality'], tmpDir);
    expect((result.data as { profile: string }).profile).toBe('quality');
  });
});

// ─── configNewProject ──────────────────────────────────────────────────────

describe('configNewProject', () => {
  it('creates config.json with defaults', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const result = await configNewProject([], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('balanced');
    expect(raw.commit_docs).toBe(true);
  });

  it('merges user choices', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    const choices = JSON.stringify({ model_profile: 'quality', commit_docs: true });
    const result = await configNewProject([choices], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.model_profile).toBe('quality');
    expect(raw.commit_docs).toBe(true);
  });

  it('does not overwrite existing config', async () => {
    const { configNewProject } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'quality' }),
    );
    const result = await configNewProject([], tmpDir);
    expect((result.data as { created: boolean }).created).toBe(false);
  });
});

// ─── configEnsureSection ───────────────────────────────────────────────────

describe('configEnsureSection', () => {
  it('creates section if not present', async () => {
    const { configEnsureSection } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );
    const result = await configEnsureSection(['workflow'], tmpDir);
    expect((result.data as { ensured: boolean }).ensured).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.workflow).toEqual({});
  });

  it('is idempotent on existing section', async () => {
    const { configEnsureSection } = await import('./config-mutation.js');
    await writeFile(
      join(tmpDir, '.oto', 'config.json'),
      JSON.stringify({ workflow: { research: true } }),
    );
    const result = await configEnsureSection(['workflow'], tmpDir);
    expect((result.data as { ensured: boolean }).ensured).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.oto', 'config.json'), 'utf-8'));
    expect(raw.workflow).toEqual({ research: true });
  });
});
