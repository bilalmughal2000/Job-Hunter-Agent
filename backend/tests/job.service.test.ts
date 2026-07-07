import { describe, expect, it, vi } from 'vitest';
import type { Company } from '@prisma/client';
import { EmploymentType, JobSource, type NormalizedJob, RemoteType } from '@ajh/shared';
import { JobService } from '../src/services/index.js';
import { DeduplicationAgent } from '../src/agents/dedup/index.js';
import type { JobCreateData } from '../src/models/job.mapper.js';
import type {
  ICompanyRepository,
  IJobRepository,
  JobWithCompany,
} from '../src/repositories/index.js';
import { NotFoundError } from '../src/utils/errors.js';

const nJob = (url: string, o: Partial<NormalizedJob> = {}): NormalizedJob => ({
  title: 'Angular Dev',
  company: 'Acme',
  location: 'Lahore',
  country: 'Pakistan',
  employmentType: EmploymentType.FULL_TIME,
  remoteType: RemoteType.HYBRID,
  description: 'd',
  url,
  source: JobSource.MANUAL,
  ...o,
});

function makeService(overrides: {
  existing?: { url: string; dedupHash: string | null }[];
  jobRepo?: Partial<IJobRepository>;
  companyRepo?: Partial<ICompanyRepository>;
}) {
  const created: JobCreateData[] = [];
  const jobRepo: IJobRepository = {
    listDedupKeys: () => Promise.resolve(overrides.existing ?? []),
    createManySkipDuplicates: (data) => {
      created.push(...data);
      return Promise.resolve(data.length);
    },
    findById: () => Promise.resolve(null),
    findMany: () => Promise.resolve({ items: [], total: 0 }),
    updateAnalysis: () => Promise.resolve(),
    ...overrides.jobRepo,
  };
  const companyRepo: ICompanyRepository = {
    upsertByNameLocation: (name, location) =>
      Promise.resolve({ id: `co-${name}-${location ?? 'null'}`, name } as Company),
    ...overrides.companyRepo,
  };
  const service = new JobService(jobRepo, companyRepo, new DeduplicationAgent());
  return { service, created };
}

describe('JobService.persistNewJobs', () => {
  it('persists all jobs when none exist yet', async () => {
    const { service, created } = makeService({});
    const count = await service.persistNewJobs([
      nJob('https://a/1'),
      nJob('https://b/2', { company: 'Other', title: 'React Dev' }),
    ]);
    expect(count).toBe(2);
    expect(created).toHaveLength(2);
    expect(created[0]?.dedupHash).toBeTruthy();
  });

  it('drops jobs already present in the DB (by URL)', async () => {
    const { service, created } = makeService({
      existing: [{ url: 'https://a/1', dedupHash: 'x' }],
    });
    const count = await service.persistNewJobs([nJob('https://a/1')]);
    expect(count).toBe(0);
    expect(created).toHaveLength(0);
  });

  it('reuses one company row for jobs sharing name+location', async () => {
    const upsert = vi.fn((name: string) => Promise.resolve({ id: `co-${name}`, name } as Company));
    const { service } = makeService({ companyRepo: { upsertByNameLocation: upsert } });
    await service.persistNewJobs([
      nJob('https://a/1'),
      nJob('https://a/2'), // same company+location
    ]);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('returns 0 for an empty batch', async () => {
    const { service } = makeService({});
    expect(await service.persistNewJobs([])).toBe(0);
  });
});

describe('JobService.getById', () => {
  it('throws NotFoundError when missing', async () => {
    const { service } = makeService({});
    await expect(service.getById('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps a found job to a DTO', async () => {
    const row = {
      id: 'j1',
      title: 'Angular Dev',
      companyId: 'c1',
      company: { id: 'c1', name: 'Acme' },
      location: 'Lahore',
      country: 'Pakistan',
      salary: null,
      experience: null,
      employmentType: 'FULL_TIME',
      remoteType: 'HYBRID',
      description: 'd',
      requirements: null,
      benefits: null,
      url: 'https://a/1',
      source: 'MANUAL',
      externalId: null,
      postedDate: null,
      aiSummary: null,
      matchScore: null,
      missingSkills: [],
      status: 'NEW',
      dedupHash: 'x',
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-02T00:00:00Z'),
    } as unknown as JobWithCompany;
    const { service } = makeService({ jobRepo: { findById: () => Promise.resolve(row) } });

    const dto = await service.getById('j1');
    expect(dto).toMatchObject({ id: 'j1', company: 'Acme', source: JobSource.MANUAL });
    expect(dto.createdAt).toBe('2026-07-01T00:00:00.000Z');
  });
});
