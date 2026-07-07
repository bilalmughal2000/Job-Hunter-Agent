import type { Company, Job, Resume, ResumeParseStatus } from '@prisma/client';
import type { ExtractedProfile, JobFilter, JobSource, ResumeFileFormat } from '@ajh/shared';
import type { JobCreateData } from '../models/job.mapper.js';
import type { ResumeProfileWithChildren } from '../models/resume.mapper.js';

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

// ── Resume & Application (Phase 4) ──────────────────────────────────────────

export interface CreateResumeInput {
  userId: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  format: ResumeFileFormat;
  sizeBytes: number;
  checksum: string;
}

export type ResumeWithProfileFlag = Resume & { profile: { id: string } | null };

export interface IResumeRepository {
  create(input: CreateResumeInput): Promise<Resume>;
  setStatus(id: string, status: ResumeParseStatus, error?: string | null): Promise<void>;
  /** Replace the resume's structured profile (and all children) atomically. */
  saveProfile(resumeId: string, profile: ExtractedProfile, rawText: string): Promise<void>;
  findById(id: string): Promise<ResumeWithProfileFlag | null>;
  findProfileByResumeId(resumeId: string): Promise<ResumeProfileWithChildren | null>;
}
