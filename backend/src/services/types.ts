import type {
  AnalyticsDTO,
  ApplicationDTO,
  ApplicationPackageDTO,
  ApplicationStatus,
  CareerAssistantDTO,
  CoverLetterDTO,
  JobAnalysis,
  JobDTO,
  JobFilter,
  MatchResult,
  NormalizedJob,
  NotificationDTO,
  NotifyResult,
  Paginated,
  ResumeDTO,
  ResumeProfileDTO,
  ResumeVersionDTO,
  SearchQuery,
  SearchRunSummary,
  SkillDemandDTO,
  WeeklyReportDTO,
} from '@ajh/shared';
import type { NotificationMessage } from '../agents/notification/index.js';

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

export interface IJobAnalysisService {
  /** Summarize a job + persist required/preferred skills. */
  analyze(jobId: string): Promise<JobAnalysis>;
}

export interface IMatchingService {
  /** Score a job against the user's resume (given or primary) and persist the result. */
  match(userId: string, jobId: string, resumeId?: string): Promise<MatchResult>;
}

export interface IApplicationDocsService {
  customize(userId: string, jobId: string, resumeId?: string): Promise<ResumeVersionDTO>;
  listVersions(jobId: string): Promise<ResumeVersionDTO[]>;
  generateCoverLetter(
    userId: string,
    jobId: string,
    resumeVersionId: string,
  ): Promise<CoverLetterDTO>;
  editCoverLetter(id: string, content: string): Promise<CoverLetterDTO>;
}

export interface UpdateApplicationInput {
  resumeVersionId?: string | null;
  coverLetterId?: string | null;
  interviewDate?: string | null;
  followUpDate?: string | null;
  recruiterName?: string | null;
  recruiterContact?: string | null;
  notes?: string | null;
}

export interface IAnalyticsService {
  getAnalytics(userId: string): Promise<AnalyticsDTO>;
  listSkills(): Promise<SkillDemandDTO[]>;
  generateWeeklyReport(userId: string): Promise<WeeklyReportDTO>;
  listReports(userId: string): Promise<WeeklyReportDTO[]>;
}

export interface ICareerAssistantService {
  assist(userId: string, jobId: string): Promise<CareerAssistantDTO>;
}

export interface INotificationService {
  notify(userId: string, message: NotificationMessage): Promise<NotifyResult>;
  list(
    userId: string,
    filter: { page?: number; pageSize?: number },
  ): Promise<Paginated<NotificationDTO>>;
}

export interface IApplicationService {
  create(
    userId: string,
    input: { jobId: string; resumeVersionId?: string; coverLetterId?: string },
  ): Promise<ApplicationDTO>;
  advance(userId: string, id: string, note?: string): Promise<ApplicationDTO>;
  updateStatus(
    userId: string,
    id: string,
    status: ApplicationStatus,
    note?: string,
  ): Promise<ApplicationDTO>;
  update(userId: string, id: string, fields: UpdateApplicationInput): Promise<ApplicationDTO>;
  getPackage(userId: string, id: string): Promise<ApplicationPackageDTO>;
  list(
    userId: string,
    filter: { status?: ApplicationStatus; page?: number; pageSize?: number },
  ): Promise<Paginated<ApplicationDTO>>;
}
