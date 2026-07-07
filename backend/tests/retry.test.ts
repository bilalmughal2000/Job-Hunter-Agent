import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../src/utils/retry.js';

const noSleep = () => Promise.resolve();

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { retries: 3, sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gives up after `retries` and rethrows the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always'));
    await expect(withRetry(fn, { retries: 2, sleep: noSleep })).rejects.toThrow('always');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('stops early when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('4xx'));
    await expect(
      withRetry(fn, { retries: 5, sleep: noSleep, shouldRetry: () => false }),
    ).rejects.toThrow('4xx');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
