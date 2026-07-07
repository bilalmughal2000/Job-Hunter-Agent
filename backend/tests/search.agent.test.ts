import { describe, expect, it } from 'vitest';
import {
  EmploymentType,
  JobSource,
  type NormalizedJob,
  RemoteType,
  type SearchQuery,
} from '@ajh/shared';
import { SearchAgent } from '../src/agents/search/index.js';
import { DeduplicationAgent } from '../src/agents/dedup/index.js';
import { ProviderRegistry } from '../src/providers/index.js';
import type { JobSourceProvider } from '../src/providers/index.js';
import { logger } from '../src/utils/logger.js';

function fakeProvider(
  source: JobSource,
  behavior: () => Promise<NormalizedJob[]>,
  available = true,
): JobSourceProvider {
  return {
    source,
    displayName: `fake:${source}`,
    isAvailable: () => available,
    search: behavior,
  };
}

const sampleJob = (url: string, overrides: Partial<NormalizedJob> = {}): NormalizedJob => ({
  title: 'Angular Dev',
  company: 'Acme',
  location: 'Lahore',
  country: 'Pakistan',
  employmentType: EmploymentType.FULL_TIME,
  remoteType: RemoteType.HYBRID,
  description: 'd',
  url,
  source: JobSource.MANUAL,
  ...overrides,
});

const query: SearchQuery = { keywords: ['angular'] };

describe('SearchAgent', () => {
  const dedup = new DeduplicationAgent();

  it('aggregates results across providers and dedupes', async () => {
    const registry = new ProviderRegistry()
      .register(fakeProvider(JobSource.MANUAL, () => Promise.resolve([sampleJob('https://a/1')])))
      .register(
        fakeProvider(JobSource.GOOGLE_JOBS, () =>
          // duplicate URL of the first provider's job
          Promise.resolve([
            sampleJob('https://a/1'),
            sampleJob('https://b/2', { company: 'Other' }),
          ]),
        ),
      );
    const agent = new SearchAgent(registry, dedup, logger);

    const result = await agent.run(query);
    expect(result.totalFound).toBe(3);
    expect(result.jobs).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.bySource[JobSource.MANUAL]).toBe(1);
    expect(result.bySource[JobSource.GOOGLE_JOBS]).toBe(2);
  });

  it('isolates a failing provider without sinking the run', async () => {
    const registry = new ProviderRegistry()
      .register(fakeProvider(JobSource.MANUAL, () => Promise.resolve([sampleJob('https://a/1')])))
      .register(fakeProvider(JobSource.INDEED, () => Promise.reject(new Error('rate limited'))));
    const agent = new SearchAgent(registry, dedup, logger);

    const result = await agent.run(query);
    expect(result.jobs).toHaveLength(1);
    expect(result.errors).toEqual([{ source: JobSource.INDEED, message: 'rate limited' }]);
  });

  it('skips unavailable providers', async () => {
    let called = false;
    const registry = new ProviderRegistry().register(
      fakeProvider(
        JobSource.LINKEDIN,
        () => {
          called = true;
          return Promise.resolve([]);
        },
        false,
      ),
    );
    const agent = new SearchAgent(registry, dedup, logger);

    const result = await agent.run(query);
    expect(called).toBe(false);
    expect(result.jobs).toHaveLength(0);
  });

  it('restricts to requested sources', async () => {
    const registry = new ProviderRegistry()
      .register(fakeProvider(JobSource.MANUAL, () => Promise.resolve([sampleJob('https://a/1')])))
      .register(fakeProvider(JobSource.INDEED, () => Promise.resolve([sampleJob('https://b/2')])));
    const agent = new SearchAgent(registry, dedup, logger);

    const result = await agent.run({ keywords: ['x'], sources: [JobSource.INDEED] });
    expect(result.bySource[JobSource.INDEED]).toBe(1);
    expect(result.bySource[JobSource.MANUAL]).toBeUndefined();
  });
});
