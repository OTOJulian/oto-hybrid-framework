import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.js';

const MARKER = 'scrub-marker-0123456789';

interface Fixture {
  projectDir: string;
  otoDir: string;
  configPath: string;
  originalBytes: string;
}

describe('loadConfig integration-value scrub parity', () => {
  let tmpHome: string;
  const fixtures: Fixture[] = [];

  beforeEach(async () => {
    tmpHome = await mkdtemp(join(tmpdir(), 'oto-sdk-loader-home-'));
    vi.stubEnv('HOME', tmpHome);
    vi.stubEnv('GSD_HOME', '');
    vi.stubEnv('EXA_API_KEY', '');
    vi.stubEnv('BRAVE_API_KEY', '');
    vi.stubEnv('FIRECRAWL_API_KEY', '');
  });

  afterEach(async () => {
    for (const fixture of fixtures.splice(0)) {
      try { chmodSync(fixture.otoDir, 0o755); } catch {}
      try { chmodSync(fixture.configPath, 0o644); } catch {}
      await rm(fixture.projectDir, { recursive: true, force: true });
    }
    await rm(tmpHome, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  async function seedConfig(config: Record<string, unknown>): Promise<Fixture> {
    const projectDir = await mkdtemp(join(tmpdir(), 'oto-sdk-loader-project-'));
    const otoDir = join(projectDir, '.oto');
    const configPath = join(otoDir, 'config.json');
    const originalBytes = JSON.stringify(config, null, 2) + '\n';
    await mkdir(otoDir, { recursive: true });
    await writeFile(configPath, originalBytes);

    // Directory mode blocks the atomic temp/rename path. Read-only file mode
    // also blocks atomicWriteConfig's direct-write fallback on POSIX.
    chmodSync(configPath, 0o444);
    chmodSync(otoDir, 0o555);

    const fixture = { projectDir, otoDir, configPath, originalBytes };
    fixtures.push(fixture);
    return fixture;
  }

  function expectDiskPristine(fixture: Fixture): void {
    expect(readFileSync(fixture.configPath, 'utf8')).toBe(fixture.originalBytes);
  }

  it('scrubs an object integration value after migration rewrite fails', async () => {
    const fixture = await seedConfig({ exa_search: { nested: MARKER } });

    const config = await loadConfig(fixture.projectDir);

    expect(config.exa_search).toBe(true);
    expect(JSON.stringify(config)).not.toContain(MARKER);
    expectDiskPristine(fixture);
  });

  it('scrubs a numeric integration value after migration rewrite fails', async () => {
    const fixture = await seedConfig({ brave_search: 42 });

    const config = await loadConfig(fixture.projectDir);

    expect(config.brave_search).toBe(true);
    expectDiskPristine(fixture);
  });

  it('scrubs a null integration value after migration rewrite fails', async () => {
    const fixture = await seedConfig({ firecrawl: null });

    const config = await loadConfig(fixture.projectDir);

    expect(config.firecrawl).toBe(false);
    expectDiskPristine(fixture);
  });

  it('scrubs an array integration value without returning its marker', async () => {
    const fixture = await seedConfig({ exa_search: [MARKER] });

    const config = await loadConfig(fixture.projectDir);

    expect(config.exa_search).toBe(true);
    expect(JSON.stringify(config)).not.toContain(MARKER);
    expectDiskPristine(fixture);
  });

  it('preserves legacy non-empty string scrubbing after migration rewrite fails', async () => {
    const fixture = await seedConfig({ exa_search: MARKER });

    const config = await loadConfig(fixture.projectDir);

    expect(config.exa_search).toBe(true);
    expect(JSON.stringify(config)).not.toContain(MARKER);
    expectDiskPristine(fixture);
  });

  it('maps an empty integration string to false after migration rewrite fails', async () => {
    const fixture = await seedConfig({ exa_search: '' });

    const config = await loadConfig(fixture.projectDir);

    expect(config.exa_search).toBe(false);
    expectDiskPristine(fixture);
  });
});
