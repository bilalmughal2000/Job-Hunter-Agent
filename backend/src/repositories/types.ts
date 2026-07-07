import type { Company, Job } from '@prisma/client';
import type { JobFilter, JobSource } from '@ajh/shared';
import type { JobCreateData } from '../models/job.mapper.js';

export type JobWithCompany = Job & { company: Company | null };

export interface ICompanyRepository {
  /** Find-or-create a company by (name, location). */
  upsertByNameLocation(name: string, location: string | null): Promise<Company>;
}

export interface IJobRepository {
  /** URL + dedupHash of every persisted job, for cross-run dedup. */
  listDedupKeys(): Promise<{ url: string; dedupHash: string | null }[]>;
  /** Insert new jobs, skipping any whose URL already exists. Returns count inserted. */
  createManySkipDuplicates(data: JobCreateData[]): Promise<number>;
  findById(id: string): Promise<JobWithCompany | null>;
  findMany(filter: JobFilter): Promise<{ items: JobWithCompany[]; total: number }>;
}

export interface RecordSearchInput {
  userId: string;
  criteria: unknown;
  source?: JobSource | null;
  resultsCount: number;
  newCount: number;
  durationMs: number;
  error?: string | null;
  triggeredBy?: 'MANUAL' | 'SCHEDULED';
}

export interface ISearchHistoryRepository {
  record(input: RecordSearchInput): Promise<void>;
}
