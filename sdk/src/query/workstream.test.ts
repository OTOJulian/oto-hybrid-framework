/**
 * Tests for workstream query handlers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { access, readFile } from 'node:fs/promises';
import { workstreamList, workstreamCreate, workstreamGet, workstreamSet } from './workstream.js';

describe('workstreamList', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-ws-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
    await writeFile(join(tmpDir, '.planning', 'config.json'), JSON.stringify({ model_profile: 'balanced' }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns flat mode when no workstreams directory', async () => {
    const r = await workstreamList([], tmpDir);
    const data = r.data as Record<string, unknown>;
    expect(data.mode).toBe('flat');
    expect(Array.isArray(data.workstreams)).toBe(true);
  });
});

describe('workstreamCreate', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-ws2-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
    await writeFile(join(tmpDir, '.planning', 'config.json'), JSON.stringify({ model_profile: 'balanced' }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates workstream directory tree', async () => {
    const r = await workstreamCreate(['test-ws'], tmpDir);
    const data = r.data as Record<string, unknown>;
    expect(data.created).toBe(true);
  });
});

describe('workstreamSet root STATE.md mirror sync (#2618 gap 2)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-ws-set-'));
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
    await writeFile(
      join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ model_profile: 'balanced' }),
    );

    // Root STATE.md with stale frontmatter (mirror of some prior workstream)
    const rootState = [
      '---',
      'gsd_state_version: 1.0',
      'milestone: v0.stale',
      'milestone_name: Stale Mirror',
      'active_workstream: old-ws',
      'current_phase: "99"',
      'status: completed',
      'last_updated: "2020-01-01T00:00:00.000Z"',
      '---',
      '',
      '# Project State',
      '',
    ].join('\n');
    await writeFile(join(tmpDir, '.planning', 'STATE.md'), rootState);

    // Target workstream with different frontmatter
    const wsDir = join(tmpDir, '.planning', 'workstreams', 'active-ws');
    await mkdir(wsDir, { recursive: true });
    const wsState = [
      '---',
      'gsd_state_version: 1.0',
      'milestone: v1.0',
      'milestone_name: Active Milestone',
      'active_workstream: active-ws',
      'current_phase: "3"',
      'status: executing',
      'last_updated: "2026-04-23T00:00:00.000Z"',
      '---',
      '',
      '# Project State',
      '',
      'Status: executing',
      'Current Phase: 3',
      '',
    ].join('\n');
    await writeFile(join(wsDir, 'STATE.md'), wsState);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('rewrites root .planning/STATE.md to mirror the new workstream STATE.md on switch', async () => {
    const r = await workstreamSet(['active-ws'], tmpDir);
    const data = r.data as Record<string, unknown>;
    expect(data.set).toBe(true);
    expect(data.active).toBe('active-ws');

    const rootStateAfter = await readFile(join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
    // The stale mirror fields must be gone; new workstream fields must be present.
    expect(rootStateAfter).toContain('milestone: v1.0');
    expect(rootStateAfter).toContain('milestone_name: Active Milestone');
    expect(rootStateAfter).toContain('active_workstream: active-ws');
    expect(rootStateAfter).toContain('current_phase:');
    expect(rootStateAfter).toContain('status: executing');
    expect(rootStateAfter).not.toContain('milestone: v0.stale');
    expect(rootStateAfter).not.toContain('Stale Mirror');
  });
});

describe('workstream session-scoped pointer parity', () => {
  let tmpDir: string;
  let previousThreadId: string | undefined;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'oto-ws-session-'));
    await mkdir(join(tmpDir, '.oto', 'workstreams', 'ws1'), { recursive: true });
    previousThreadId = process.env.CODEX_THREAD_ID;
    process.env.CODEX_THREAD_ID = `sdk-workstream-${Date.now()}-${Math.random()}`;
  });

  afterEach(async () => {
    await workstreamSet(['--clear'], tmpDir);
    if (previousThreadId === undefined) delete process.env.CODEX_THREAD_ID;
    else process.env.CODEX_THREAD_ID = previousThreadId;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('sets and gets the active workstream through the CODEX_THREAD_ID pointer', async () => {
    const selected = await workstreamSet(['ws1'], tmpDir);
    expect(selected.data).toMatchObject({ active: 'ws1', set: true });

    await expect(access(join(tmpDir, '.oto', 'active-workstream'))).rejects.toThrow();
    await expect(workstreamGet([], tmpDir)).resolves.toMatchObject({
      data: { active: 'ws1', mode: 'workstream' },
    });

    process.env.CODEX_THREAD_ID = `${process.env.CODEX_THREAD_ID}-other`;
    await expect(workstreamGet([], tmpDir)).resolves.toMatchObject({
      data: { active: null, mode: 'workstream' },
    });
  });
});
