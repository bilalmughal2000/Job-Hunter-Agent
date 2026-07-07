import type {
  JobDTO,
  JobFilter,
  NormalizedJob,
  Paginated,
  ResumeDTO,
  ResumeProfileDTO,
  SearchQuery,
  SearchRunSummary,
} from '@ajh/shared';

export interface IJobService {
  list(filter: JobFilter): Promise<Paginated<JobDTO>>;
  getById(id: string): Promise<JobDTO>;
  /** Resolve companies, fingerprint, drop cross-run duplicates, persist. Returns count inserted. */
  persistNewJobs(jobs: NormalizedJob[]): Promise<number>;
}

export interface ISearchService {
  run(userId: string, query: SearchQuery): Promise<SearchRunSummary>;
}

export interface UploadResumeInput {
  userId: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface IResumeService {
  /** Store the file, extract text (with OCR fallback), extract + persist the profile. */
  upload(input: UploadResumeInput): Promise<ResumeDTO>;
  getById(id: string): Promise<ResumeDTO>;
  getProfile(resumeId: string): Promise<ResumeProfileDTO>;
}
