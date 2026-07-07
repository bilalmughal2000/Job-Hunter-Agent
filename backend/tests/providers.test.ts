import { describe, expect, it } from 'vitest';
import { JobSource, RemoteType } from '@ajh/shared';
import { buildDefaultRegistry, SampleProvider } from '../src/providers/index.js';
import { InMemoryCache } from '../src/utils/cache.js';
import { logger } from '../src/utils/logger.js';

const ctx = () => ({ cache: new InMemoryCache(), logger, rateLimitMs: 0, retries: 0 });

describe('buildDefaultRegistry', () => {
  it('enables the real Remotive + Sample providers and disables gated stubs', () => {
    const registry = buildDefaultRegistry(ctx());
    const available = registry.available().map((p) => p.source);
    // Remotive (real, key-less) and the Sample fixtures are enabled.
    expect(available).toContain(JobSource.REMOTIVE);
    expect(available).toContain(JobSource.MANUAL);
    // Gated sources are registered but disabled until a compliant integration.
    expect(registry.get(JobSource.LINKEDIN)?.isAvailable()).toBe(false);
    expect(registry.get(JobSource.INDEED)?.isAvailable()).toBe(false);
  });

  it('filters available providers by requested sources', () => {
    const registry = buildDefaultRegistry(ctx());
    expect(registry.available([JobSource.LINKEDIN])).toHaveLength(0);
    expect(registry.available([JobSource.MANUAL])).toHaveLength(1);
  });
});

describe('SampleProvider', () => {
  it('matches on keywords (AND)', async () => {
    const provider = new SampleProvider(ctx());
    const jobs = await provider.search({ keywords: ['angular'] });
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => `${j.title} ${j.description}`.toLowerCase().includes('angular'))).toBe(
      true,
    );
  });

  it('applies exclude keywords', async () => {
    const provider = new SampleProvider(ctx());
    const withReact = await provider.search({ keywords: ['developer'] });
    const withoutReact = await provider.search({
      keywords: ['developer'],
      excludeKeywords: ['react'],
    });
    expect(withoutReact.length).toBeLessThan(withReact.length);
    expect(withoutReact.some((j) => j.title.toLowerCase().includes('react'))).toBe(false);
  });

  it('filters by company', async () => {
    const provider = new SampleProvider(ctx());
    const jobs = await provider.search({ keywords: [], company: 'Systems Limited' });
    expect(jobs.every((j) => j.company === 'Systems Limited')).toBe(true);
  });

  it('filters by remote type', async () => {
    const provider = new SampleProvider(ctx());
    const jobs = await provider.search({ keywords: [], remoteTypes: [RemoteType.REMOTE] });
    expect(jobs.every((j) => j.remoteType === RemoteType.REMOTE)).toBe(true);
  });

  it('serves a cached result on the second call', async () => {
    const shared = ctx();
    const provider = new SampleProvider(shared);
    const first = await provider.search({ keywords: ['angular'] });
    const second = await provider.search({ keywords: ['angular'] });
    expect(second).toEqual(first);
  });
});
