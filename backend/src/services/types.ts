import type {
  JobDTO,
  JobFilter,
  NormalizedJob,
  Paginated,
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
