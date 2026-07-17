import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { planningPaths } from './helpers.js';
import { secretStatus } from './secret-commands.js';

let root: string;
let home: string;
let projectDir: string;
const workstream = 'selected-workstream';

function writeJson(path: string, value: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function writeRootConfig(value: Record<string, unknown>): string {
  const path = planningPaths(projectDir).config;
  writeJson(path, value);
  return path;
}

function writeWorkstreamConfig(value: Record<string, unknown>): string {
  const path = planningPaths(projectDir, workstream).config;
  writeJson(path, value);
  return path;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'oto-sdk-secret-status-inheritance-'));
  home = join(root, 'home');
  projectDir = join(root, 'project');
  mkdirSync(home, { recursive: true });
  mkdirSync(join(projectDir, '.oto'), { recursive: true });
  vi.stubEnv('HOME', home);
  vi.stubEnv('EXA_API_KEY', '');
  vi.stubEnv('BRAVE_API_KEY', '');
  vi.stubEnv('FIRECRAWL_API_KEY', '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe('secretStatus root-to-workstream inheritance (FRESH-CR-03)', () => {
  it('reports a root-enabled integration as enabled in a selected workstream', async () => {
    writeRootConfig({ exa_search: true });
    writeWorkstreamConfig({ brave_search: false });

    const result = await secretStatus(['exa'], projectDir, workstream);

    expect(result.data.integrations[0]).toMatchObject({ integration: 'exa', enabled: true });
    expect(result.raw).toContain('Exa: enabled');
  });

  it('honors a workstream false override over a root true flag', async () => {
    writeRootConfig({ exa_search: true });
    writeWorkstreamConfig({ exa_search: false });

    const result = await secretStatus(['exa'], projectDir, workstream);

    expect(result.data.integrations[0]).toMatchObject({ integration: 'exa', enabled: false });
    expect(result.raw).toContain('Exa: disabled');
  });

  it('migrates a root legacy key while reporting selected-workstream status without plaintext', async () => {
    const marker = 'sk-legacy-0123456789abcdef';
    const rootConfig = writeRootConfig({ exa_search: marker });
    writeWorkstreamConfig({ brave_search: false });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const result = await secretStatus([], projectDir, workstream);
    const serializedResult = JSON.stringify(result);

    expect(JSON.parse(readFileSync(rootConfig, 'utf8')).exa_search).toBe(true);
    expect(readFileSync(join(home, '.oto', 'exa_api_key'), 'utf8')).toBe(`${marker}\n`);
    expect(serializedResult).not.toContain('sk-legacy');
    expect(result.raw).not.toContain('sk-legacy');
    expect(result.data.integrations.find((entry) => entry.integration === 'exa')).toMatchObject({
      enabled: true,
      source: 'keyfile',
    });
  });

  it('preserves root-only status behavior when no workstream is selected', async () => {
    writeRootConfig({ exa_search: true });

    const result = await secretStatus(['exa'], projectDir);

    expect(result.data.integrations[0]).toMatchObject({ integration: 'exa', enabled: true });
    expect(result.raw).toBe('Exa: enabled — no key detected');
  });
});
