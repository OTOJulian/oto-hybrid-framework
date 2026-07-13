import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OTO_SDK = join(REPO_ROOT, 'bin', 'oto-sdk.js');
const PARSE_MARKER_FRAGMENT = 'SYNTH_MARK';
const PARSE_MARKER_PREFIX = 'SYNTH_MARKER';
const PARSE_MARKER = 'SYNTH_MARKER_do_not_echo_123456789';

interface Fixture {
  projectDir: string;
  homeDir: string;
  rootConfigPath: string;
}

describe('loadConfig malformed JSON sanitization through shipped dist', () => {
  const fixtures: Fixture[] = [];

  beforeEach(() => {
    fixtures.length = 0;
  });

  afterEach(async () => {
    for (const fixture of fixtures) {
      await rm(fixture.projectDir, { recursive: true, force: true });
      await rm(fixture.homeDir, { recursive: true, force: true });
    }
  });

  async function seedFixture(): Promise<Fixture> {
    const projectDir = await mkdtemp(join(tmpdir(), 'oto-sdk-parse-project-'));
    const homeDir = await mkdtemp(join(tmpdir(), 'oto-sdk-parse-home-'));
    const rootConfigPath = join(projectDir, '.oto', 'config.json');
    await mkdir(dirname(rootConfigPath), { recursive: true });
    const fixture = { projectDir, homeDir, rootConfigPath };
    fixtures.push(fixture);
    return fixture;
  }

  function runResolveModel(fixture: Fixture, workstream?: string) {
    const args = [OTO_SDK, 'query', 'resolve-model', 'gsd-planner'];
    if (workstream) args.push('--ws', workstream);
    return spawnSync(process.execPath, args, {
      cwd: fixture.projectDir,
      env: {
        ...process.env,
        HOME: fixture.homeDir,
        GSD_HOME: '',
        EXA_API_KEY: '',
        BRAVE_API_KEY: '',
        FIRECRAWL_API_KEY: '',
      },
      encoding: 'utf8',
    });
  }

  function expectSanitizedFailure(
    result: ReturnType<typeof runResolveModel>,
    expectedPath: string,
  ): void {
    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    const output = stdout + stderr;

    expect(result.status).not.toBe(0);
    expect(stdout).not.toContain(PARSE_MARKER_FRAGMENT);
    expect(stderr).not.toContain(PARSE_MARKER_FRAGMENT);
    expect(stdout).not.toContain(PARSE_MARKER_PREFIX);
    expect(stderr).not.toContain(PARSE_MARKER_PREFIX);
    expect(stdout).not.toContain(PARSE_MARKER);
    expect(stderr).not.toContain(PARSE_MARKER);
    expect(output).toMatch(/malformed JSON/i);
    expect(output).toContain(expectedPath);
  }

  it('does not disclose fragments from the selected root config', async () => {
    const fixture = await seedFixture();
    await writeFile(fixture.rootConfigPath, `{"exa_search": ${PARSE_MARKER}}`);

    const result = runResolveModel(fixture);

    expectSanitizedFailure(result, fixture.rootConfigPath);
  });

  it('does not disclose fragments from an inherited root beneath a workstream', async () => {
    const fixture = await seedFixture();
    const workstreamConfigPath = join(
      fixture.projectDir,
      '.oto',
      'workstreams',
      'ws1',
      'config.json',
    );
    await mkdir(dirname(workstreamConfigPath), { recursive: true });
    await writeFile(workstreamConfigPath, '{"model_profile":"quality"}\n');
    await writeFile(fixture.rootConfigPath, `{"exa_search": ${PARSE_MARKER}}`);

    const result = runResolveModel(fixture, 'ws1');

    expectSanitizedFailure(result, fixture.rootConfigPath);
  });
});
