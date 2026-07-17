import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { websearch } from './websearch.js';

let root: string;
let home: string;

function writeBraveKeyfile(content: string): void {
  const keyDir = join(home, '.oto');
  mkdirSync(keyDir, { recursive: true, mode: 0o700 });
  const keyPath = join(keyDir, 'brave_api_key');
  writeFileSync(keyPath, content, { mode: 0o600 });
  chmodSync(keyPath, 0o600);
}

function stubSuccessfulFetch() {
  const fetchStub = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ web: { results: [] } }),
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'oto-sdk-websearch-'));
  home = join(root, 'home');
  mkdirSync(home, { recursive: true });
  vi.stubEnv('HOME', home);
  vi.stubEnv('BRAVE_API_KEY', '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe('websearch Brave credential resolution', () => {
  it('degrades without throwing when neither the environment nor keyfile has a Brave key', async () => {
    const result = await websearch(['test query'], root);
    const data = result.data as Record<string, unknown>;

    expect(data.available).toBe(false);
    expect(data.reason).toContain('BRAVE_API_KEY');
    expect(data.reason).toContain('~/.oto/brave_api_key');
  });

  it('uses the Brave keyfile when BRAVE_API_KEY is unset', async () => {
    writeBraveKeyfile('kf-test-key-0123456789\n');
    const fetchStub = stubSuccessfulFetch();

    const result = await websearch(['test query'], root);

    expect(fetchStub).toHaveBeenCalledOnce();
    expect(fetchStub.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'X-Subscription-Token': 'kf-test-key-0123456789',
      }),
    });
    expect(result.data).toMatchObject({ available: true, count: 0, results: [] });
  });

  it('treats an empty Brave keyfile as unavailable', async () => {
    writeBraveKeyfile('');

    const result = await websearch(['test query'], root);

    expect(result.data).toMatchObject({ available: false });
  });

  it('prefers BRAVE_API_KEY over the Brave keyfile', async () => {
    vi.stubEnv('BRAVE_API_KEY', 'env-key-0123456789');
    writeBraveKeyfile('kf-test-key-0123456789\n');
    const fetchStub = stubSuccessfulFetch();

    const result = await websearch(['test query'], root);

    expect(fetchStub.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'X-Subscription-Token': 'env-key-0123456789',
      }),
    });
    expect(result.data).toMatchObject({ available: true });
  });

  it('returns a query error after resolving an available Brave key', async () => {
    vi.stubEnv('BRAVE_API_KEY', 'env-key-0123456789');

    const result = await websearch([], root);

    expect(result.data).toMatchObject({ available: false, error: 'Query required' });
  });
});
