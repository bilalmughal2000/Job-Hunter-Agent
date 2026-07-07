import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { JobDTO, Paginated, SearchRunSummary } from '@ajh/shared';
import { createApp } from '../src/app.js';
import type { AppContainer } from '../src/container.js';
import type { IJobService, ISearchService } from '../src/services/index.js';
import { NotFoundError } from '../src/utils/errors.js';

const emptyPage: Paginated<JobDTO> = { items: [], page: 1, pageSize: 20, total: 0 };

function appWith(overrides: {
  job?: Partial<IJobService>;
  search?: Partial<ISearchService>;
  resolveDemoUserId?: () => Promise<string>;
}) {
  const container: AppContainer = {
    jobService: {
      list: () => Promise.resolve(emptyPage),
      getById: () => Promise.reject(new NotFoundError('missing')),
      persistNewJobs: () => Promise.resolve(0),
      ...overrides.job,
    },
    searchService: {
      run: () =>
        Promise.resolve<SearchRunSummary>({
          totalFound: 0,
          afterDedup: 0,
          newlyPersisted: 0,
          durationMs: 1,
          bySource: {},
          errors: [],
        }),
      ...overrides.search,
    },
    resolveDemoUserId: overrides.resolveDemoUserId ?? (() => Promise.resolve('demo-user')),
  };
  return createApp(container);
}

describe('GET /api/v1/jobs', () => {
  it('returns a paginated envelope', async () => {
    const list = vi.fn().mockResolvedValue(emptyPage);
    const res = await request(appWith({ job: { list } })).get('/api/v1/jobs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: emptyPage });
  });

  it('passes parsed filters to the service', async () => {
    const list = vi.fn().mockResolvedValue(emptyPage);
    await request(appWith({ job: { list } })).get(
      '/api/v1/jobs?keywords=angular&minMatchScore=80&sort=HIGHEST_MATCH&remoteTypes=REMOTE,HYBRID',
    );
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: 'angular',
        minMatchScore: 80,
        sort: 'HIGHEST_MATCH',
        remoteTypes: ['REMOTE', 'HYBRID'],
      }),
    );
  });

  it('rejects invalid filters with 400', async () => {
    const res = await request(appWith({})).get('/api/v1/jobs?minMatchScore=999');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/jobs/:id', () => {
  it('400s on a non-uuid id', async () => {
    const res = await request(appWith({})).get('/api/v1/jobs/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('404s when the service throws NotFound', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const res = await request(appWith({})).get(`/api/v1/jobs/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/v1/search', () => {
  it('runs a search and returns the summary', async () => {
    const run = vi.fn().mockResolvedValue({
      totalFound: 4,
      afterDedup: 3,
      newlyPersisted: 3,
      durationMs: 10,
      bySource: { MANUAL: 4 },
      errors: [],
    } satisfies SearchRunSummary);
    const res = await request(appWith({ search: { run } }))
      .post('/api/v1/search')
      .send({ keywords: ['angular'], locations: ['Lahore'] });
    expect(res.status).toBe(200);
    expect(res.body.data.newlyPersisted).toBe(3);
    expect(run).toHaveBeenCalledWith(
      'demo-user',
      expect.objectContaining({ keywords: ['angular'] }),
    );
  });

  it('honours the x-user-id header', async () => {
    const run = vi.fn().mockResolvedValue({
      totalFound: 0,
      afterDedup: 0,
      newlyPersisted: 0,
      durationMs: 1,
      bySource: {},
      errors: [],
    } satisfies SearchRunSummary);
    await request(appWith({ search: { run } }))
      .post('/api/v1/search')
      .set('x-user-id', 'user-42')
      .send({ keywords: ['angular'] });
    expect(run).toHaveBeenCalledWith('user-42', expect.anything());
  });

  it('rejects an invalid body with 400', async () => {
    const res = await request(appWith({}))
      .post('/api/v1/search')
      .send({ keywords: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
