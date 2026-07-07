import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter.js';

describe('RateLimiter', () => {
  it('does not wait on the first acquire', async () => {
    const waits: number[] = [];
    const limiter = new RateLimiter(
      1000,
      () => 0,
      (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    );
    await limiter.acquire();
    expect(waits).toEqual([]);
  });

  it('spaces subsequent acquires by the interval', async () => {
    const waits: number[] = [];
    const clock = 0;
    const limiter = new RateLimiter(
      1000,
      () => clock,
      (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    );
    await limiter.acquire(); // t=0, reserves slot at 1000
    await limiter.acquire(); // still t=0, must wait 1000
    await limiter.acquire(); // waits 2000
    expect(waits).toEqual([1000, 2000]);
  });
});
