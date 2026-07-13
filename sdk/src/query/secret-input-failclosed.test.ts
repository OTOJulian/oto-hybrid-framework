import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const readlineMocks = vi.hoisted(() => ({
  createInterface: vi.fn(),
}));

vi.mock('node:readline', () => ({
  createInterface: readlineMocks.createInterface,
}));

import { readSecretInput } from './secret-commands.js';

type FakeReadline = {
  close: ReturnType<typeof vi.fn>;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
};

function unavailableEchoSuppressionFixture() {
  const close = vi.fn();
  const removeListener = vi.fn();
  const once = vi.fn((event: string, listener: (...args: unknown[]) => void) => {
    if (event === 'line') listener('sk-visible-regression-1234');
    return fakeRl;
  });
  const fakeRl: FakeReadline = { close, once, removeListener };
  readlineMocks.createInterface.mockReturnValue(fakeRl);

  const fakeStdin = {
    isTTY: true,
    once: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as NodeJS.ReadStream;
  const fakeStderr = new PassThrough();
  let stderrOutput = '';
  fakeStderr.on('data', (chunk) => {
    stderrOutput += chunk.toString();
  });

  return {
    close,
    fakeStdin,
    fakeStderr: fakeStderr as unknown as NodeJS.WriteStream,
    stderrOutput: () => stderrOutput,
  };
}

beforeEach(() => {
  readlineMocks.createInterface.mockReset();
});

describe('readSecretInput fails closed without echo suppression (WR-08)', () => {
  it('rejects secure input and closes readline when the private hook is unavailable', async () => {
    const fixture = unavailableEchoSuppressionFixture();

    await expect(readSecretInput(fixture.fakeStdin, fixture.fakeStderr)).rejects.toThrow(
      'secure key entry unavailable',
    );

    expect(fixture.close).toHaveBeenCalledOnce();
    expect(fixture.stderrOutput()).not.toContain('sk-visible-regression-1234');
  });

  it('rejects before writing the API key prompt', async () => {
    const fixture = unavailableEchoSuppressionFixture();

    await expect(readSecretInput(fixture.fakeStdin, fixture.fakeStderr)).rejects.toThrow(
      'secure key entry unavailable',
    );

    expect(fixture.stderrOutput()).not.toContain('Enter API key');
  });
});
