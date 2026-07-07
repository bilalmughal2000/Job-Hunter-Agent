import type { JobDTO, JobFilter, NormalizedJob, Paginated } from '@ajh/shared';
import type { DeduplicationAgent } from '../agents/dedup/index.js';
import { toJobCreateData, toJobDTO } from '../models/job.mapper.js';
import type { JobCreateData } from '../models/job.mapper.js';
import type { ICompanyRepository, IJobRepository } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import type { IJobService } from './types.js';

export class JobService implements IJobService {
  constructor(
    private readonly jobs: IJobRepository,
    private readonly companies: ICompanyRepository,
    private readonly dedup: DeduplicationAgent,
  ) {}

  async list(filter: JobFilter): Promise<Paginated<JobDTO>> {
    const { items, total } = await this.jobs.findMany(filter);
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = filter.pageSize ?? 20;
    return { items: items.map(toJobDTO), page, pageSize, total };
  }

  async getById(id: string): Promise<JobDTO> {
    const job = await this.jobs.findById(id);
    if (!job) throw new NotFoundError(`Job not found: ${id}`);
    return toJobDTO(job);
  }

  async persistNewJobs(jobs: NormalizedJob[]): Promise<number> {
    if (jobs.length === 0) return 0;

    // 1. Drop anything that duplicates a job already in the DB.
    const existing = await this.jobs.listDedupKeys();
    const fresh = jobs.filter((job) => !this.dedup.isDuplicateOfExisting(job, existing));
    if (fresh.length === 0) return 0;

    // 2. Resolve companies (deduped by name+location within this batch).
    const companyCache = new Map<string, string>();
    const toCreate: JobCreateData[] = [];
    for (const job of fresh) {
      const companyKey = `${job.company}::${job.location}`;
      let companyId = companyCache.get(companyKey) ?? null;
      if (companyId === null && job.company.trim()) {
        const company = await this.companies.upsertByNameLocation(job.company, job.location);
        companyId = company.id;
        companyCache.set(companyKey, companyId);
      }
      toCreate.push(toJobCreateData(job, companyId, this.dedup.fingerprint(job)));
    }

    // 3. Bulk insert, letting the DB's unique(url) skip any race duplicates.
    return this.jobs.createManySkipDuplicates(toCreate);
  }
}
