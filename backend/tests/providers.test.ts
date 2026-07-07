import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobSource, RemoteType } from '@ajh/shared';
import {
  buildDefaultRegistry,
  JSearchProvider,
  RemoteOkProvider,
  SampleProvider,
} from '../src/providers/index.js';
import { InMemoryCache } from '../src/utils/cache.js';
import { logger } from '../src/utils/logger.js';

const ctx = () => ({ cache: new InMemoryCache(), logger, rateLimitMs: 0, retries: 0 });

describe('buildDefaultRegistry', () => {
  it('enables the real Remotive provider and disables gated stubs by default', () => {
    const registry = buildDefaultRegistry(ctx());
    const available = registry.available().map((p) => p.source);
    // Real key-less sources are enabled; sample fixtures are NOT by default.
    expect(available).toContain(JobSource.REMOTIVE);
    expect(available).toContain(JobSource.REMOTEOK);
    expect(available).not.toContain(JobSource.MANUAL);
    // Gated sources are registered but disabled until a compliant integration.
    expect(registry.get(JobSource.LINKEDIN)?.isAvailable()).toBe(false);
    expect(registry.get(JobSource.INDEED)?.isAvailable()).toBe(false);
  });

  it('can opt into the sample provider (offline/demo)', () => {
    const registry = buildDefaultRegistry(ctx(), { includeSample: true });
    expect(registry.available().map((p) => p.source)).toContain(JobSource.MANUAL);
  });

  it('filters available providers by requested sources', () => {
    const registry = buildDefaultRegistry(ctx());
    expect(registry.available([JobSource.LINKEDIN])).toHaveLength(0);
    expect(registry.available([JobSource.REMOTIVE])).toHaveLength(1);
  });

  it('enables JSearch (Google/LinkedIn/Indeed) only when an API key is provided', () => {
    expect(buildDefaultRegistry(ctx()).get(JobSource.GOOGLE_JOBS)?.isAvailable()).toBe(false);
    const withKey = buildDefaultRegistry(ctx(), { jsearchApiKey: 'test-key' });
    expect(withKey.get(JobSource.GOOGLE_JOBS)?.isAvailable()).toBe(true);
  });
});

describe('JSearchProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps aggregated results and labels the publisher source (LinkedIn/Indeed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              jobs: [
                {
                  job_id: 'a1',
                  employer_name: 'Tkxel',
                  job_title: 'Angular Developer',
                  job_apply_link: 'https://www.linkedin.com/jobs/view/123',
                  job_description: 'Build Angular apps',
                  job_city: 'Lahore',
                  job_country: 'Pakistan',
                  job_employment_type: 'FULLTIME',
                  job_publisher: 'LinkedIn',
                },
                {
                  job_id: 'b2',
                  employer_name: 'Systems',
                  job_title: 'Frontend Engineer',
                  job_apply_link: 'https://indeed.com/viewjob?jk=456',
                  job_description: 'React role',
                  job_is_remote: true,
                  job_publisher: 'Indeed',
                },
              ],
            },
          }),
      }),
    );
    const jobs = await new JSearchProvider(ctx(), 'test-key').search({
      keywords: ['angular'],
      locations: ['Lahore, Pakistan'],
    });
    expect(jobs).toHaveLength(2);
    const li = jobs.find((j) => j.company === 'Tkxel');
    expect(li?.source).toBe(JobSource.LINKEDIN);
    expect(li?.location).toBe('Lahore, Pakistan');
    expect(li?.url).toContain('linkedin.com');
    const indeed = jobs.find((j) => j.company === 'Systems');
    expect(indeed?.source).toBe(JobSource.INDEED);
    expect(indeed?.remoteType).toBe(RemoteType.REMOTE);
  });

  it('is unavailable without a key', () => {
    expect(new JSearchProvider(ctx(), '').isAvailable()).toBe(false);
  });
});

describe('RemoteOkProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  const feed = [
    { legal: 'RemoteOK legal notice' },
    {
      id: 1,
      company: 'Acme',
      position: 'Senior Angular Developer',
      tags: ['angular', 'typescript'],
      description: '<p>Build <b>Angular</b> apps</p>',
      location: 'Worldwide',
      salary_min: 60000,
      salary_max: 90000,
      url: 'https://remoteok.com/remote-jobs/1-senior-angular',
      date: '2026-07-01',
    },
    {
      id: 2,
      company: 'Beta',
      position: 'Rust Engineer',
      tags: ['rust'],
      description: '<p>Systems programming in Rust</p>',
      url: 'https://remoteok.com/remote-jobs/2-rust',
    },
  ];

  function stubFetch(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(feed) }),
    );
  }

  it('drops the legal notice, strips HTML, and maps fields', async () => {
    stubFetch();
    const jobs = await new RemoteOkProvider(ctx()).search({ keywords: [] });
    expect(jobs).toHaveLength(2);
    const angular = jobs.find((j) => j.title.includes('Angular'));
    expect(angular?.company).toBe('Acme');
    expect(angular?.remoteType).toBe(RemoteType.REMOTE);
    expect(angular?.description).toContain('Build Angular apps');
    expect(angular?.description).not.toContain('<');
    expect(angular?.salary).toBe('$60000 - $90000');
    expect(angular?.url).toContain('remoteok.com');
  });

  it('filters by keyword relevance', async () => {
    stubFetch();
    const jobs = await new RemoteOkProvider(ctx()).search({ keywords: ['angular'] });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.title).toContain('Angular');
  });

  it('throws on a non-ok response (so BaseProvider can isolate it)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' }),
    );
    await expect(new RemoteOkProvider(ctx()).search({ keywords: [] })).rejects.toThrow(/RemoteOK/);
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
