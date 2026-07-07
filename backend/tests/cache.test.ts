import { describe, expect, it } from 'vitest';
import { InMemoryCache } from '../src/utils/cache.js';

describe('InMemoryCache', () => {
  it('stores and retrieves values', async () => {
    const cache = new InMemoryCache();
    await cache.set('k', { n: 1 });
    expect(await cache.get<{ n: number }>('k')).toEqual({ n: 1 });
  });

  it('returns undefined for missing keys', async () => {
    const cache = new InMemoryCache();
    expect(await cache.get('missing')).toBeUndefined();
  });

  it('expires entries past their TTL using the injected clock', async () => {
    let now = 1_000;
    const cache = new InMemoryCache(100, () => now);
    await cache.set('k', 'v');
    now = 1_050;
    expect(await cache.get('k')).toBe('v');
    now = 1_200; // past 100ms TTL
    expect(await cache.get('k')).toBeUndefined();
  });

  it('clears and deletes', async () => {
    const cache = new InMemoryCache();
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.delete('a');
    expect(await cache.get('a')).toBeUndefined();
    await cache.clear();
    expect(await cache.get('b')).toBeUndefined();
  });
});
