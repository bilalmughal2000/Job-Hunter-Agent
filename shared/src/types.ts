import type {
  ApplicationStatus,
  EmploymentType,
  JobSource,
  RemoteType,
  ResumeFileFormat,
  ResumeParseStatus,
  SkillType,
  WorkflowStage,
} from './enums.js';

/**
 * Search criteria accepted by the Search Agent (Phase 3). A single query can
 * fan out across multiple providers and locations.
 */
export interface SearchQuery {
  /** Free-text keywords, ANDed unless `boolean` is provided. */
  keywords: string[];
  /** Raw boolean expression (e.g. `Angular AND (Lahore OR Remote)`) — overrides keyword ANDing when set. */
  boolean?: string | null;
  /** Terms that must NOT appear in the job. */
  excludeKeywords?: string[];
  /** One or more target locations. */
  locations?: string[];
  /** Restrict to a specific company name. */
  company?: string | null;
  remoteTypes?: RemoteType[];
  /** Restrict which sources to query; empty/undefined = all enabled sources. */
  sources?: JobSource[];
  page?: number;
  pageSize?: number;
}

export enum JobSortField {
  NEWEST = 'NEWEST',
  HIGHEST_MATCH = 'HIGHEST_MATCH',
  SALARY = 'SALARY',
}

export type SortDirection = 'asc' | 'desc';

/** Filters for listing persisted jobs (`GET /jobs`). */
export interface JobFilter {
  keywords?: string;
  location?: string;
  company?: string;
  remoteTypes?: RemoteType[];
  sources?: JobSource[];
  minMatchScore?: number;
  postedAfter?: string;
  sort?: JobSortField;
  page?: number;
  pageSize?: number;
}

/** Outcome of a Deduplication Agent pass over a batch of normalized jobs. */
export interface DedupResult {
  unique: NormalizedJob[];
  duplicatesRemoved: number;
}

/** Summary returned after a search run completes (also persisted to SearchHistory). */
export interface SearchRunSummary {
  totalFound: number;
  afterDedup: number;
  newlyPersisted: number;
  durationMs: number;
  bySource: Record<string, number>;
  errors: { source: string; message: string }[];
}

/**
 * Normalized job shape emitted by every Search provider (Phase 3).
 * Providers are responsible for mapping their raw payloads into this contract.
 */
export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  country: string;
  salary?: string | null;
  experience?: string | null;
  employmentType: EmploymentType;
  remoteType: RemoteType;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  url: string;
  source: JobSource;
  postedDate?: string | null;
  /** Provider-native id, used for dedup before we mint our own. */
  externalId?: string | null;
}

/** Job as returned by the REST API (`GET /jobs`, `GET /jobs/:id`). */
export interface JobDTO {
  id: string;
  title: string;
  company: string | null;
  companyId: string | null;
  location: string;
  country: string;
  salary: string | null;
  experience: string | null;
  employmentType: EmploymentType;
  remoteType: RemoteType;
  description: string;
  requirements: string | null;
  benefits: string | null;
  url: string;
  source: JobSource;
  externalId: string | null;
  postedDate: string | null;
  aiSummary: string | null;
  matchScore: number | null;
  missingSkills: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Resume & Application (Phase 4)
// ─────────────────────────────────────────────────────────────

export interface ExtractedSkill {
  name: string;
  type: SkillType;
  level?: string | null;
}

export interface ExtractedExperience {
  company: string;
  title: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
  highlights: string[];
}

export interface ExtractedProject {
  name: string;
  description?: string | null;
  url?: string | null;
  technologies: string[];
}

export interface ExtractedEducation {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
}

export interface ExtractedCertification {
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialId?: string | null;
  url?: string | null;
}

export interface ExtractedLanguage {
  name: string;
  proficiency?: string | null;
}

export interface ExtractedAward {
  title: string;
  issuer?: string | null;
  date?: string | null;
  description?: string | null;
}

/**
 * The structured profile produced by a StructuredExtractor from a resume's raw
 * text. Persisted into ResumeProfile + its normalized child tables.
 */
export interface ExtractedProfile {
  fullName?: string | null;
  headline?: string | null;
  summary?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  skills: ExtractedSkill[];
  experiences: ExtractedExperience[];
  projects: ExtractedProject[];
  educations: ExtractedEducation[];
  certifications: ExtractedCertification[];
  languages: ExtractedLanguage[];
  awards: ExtractedAward[];
}

/** Resume upload metadata as returned by the API. */
export interface ResumeDTO {
  id: string;
  originalName: string;
  format: ResumeFileFormat;
  mimeType: string;
  sizeBytes: number;
  parseStatus: ResumeParseStatus;
  parseError: string | null;
  isPrimary: boolean;
  uploadedAt: string;
  hasProfile: boolean;
}

/** Full structured profile as returned by `GET /resume/:id/profile`. */
export interface ResumeProfileDTO extends ExtractedProfile {
  id: string;
  resumeId: string;
  extractedAt: string;
}

// ─────────────────────────────────────────────────────────────
// AI Agents (Phase 5)
// ─────────────────────────────────────────────────────────────

/** Structured output of the AI Matching Agent. */
export interface MatchResult {
  matchScore: number;
  explanation: string;
  missingSkills: string[];
  strongSkills: string[];
  weakSkills: string[];
  experienceGap: string;
  recommendation: string;
  confidenceScore: number;
}

/** Structured summary of a job produced by the Job Analysis Agent. */
export interface JobAnalysis {
  summary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  salary?: string | null;
}

/**
 * A customized, ATS-optimized resume produced by the Resume Optimizer Agent.
 * Every field is derived from the candidate's real profile — nothing invented.
 */
export interface CustomizedResume {
  summary: string;
  /** Existing skills reordered so the most job-relevant appear first. */
  highlightedSkills: string[];
  experiences: {
    company: string;
    title: string;
    bullets: string[];
  }[];
  /** ATS keywords the candidate legitimately possesses. */
  keywords: string[];
  /** Estimated ATS match, 0–100. */
  atsScore: number;
}

export interface CoverLetterResult {
  content: string;
  tone: string;
}

/** DTO for a persisted customized resume version. */
export interface ResumeVersionDTO {
  id: string;
  jobId: string;
  baseResumeId: string;
  label: string | null;
  content: CustomizedResume;
  atsScore: number | null;
  version: number;
  createdAt: string;
}

/** DTO for a persisted cover letter. */
export interface CoverLetterDTO {
  id: string;
  jobId: string;
  resumeVersionId: string;
  content: string;
  tone: string | null;
  isEdited: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Generic, typed API envelope returned by every REST endpoint. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApplicationSummary {
  id: string;
  jobTitle: string;
  company: string;
  stage: WorkflowStage;
  status: ApplicationStatus;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Application workflow (Phase 6)
// ─────────────────────────────────────────────────────────────

export interface ApplicationEventDTO {
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note: string | null;
  createdAt: string;
}

export interface ApplicationDTO {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string | null;
  resumeVersionId: string | null;
  coverLetterId: string | null;
  stage: WorkflowStage;
  status: ApplicationStatus;
  appliedDate: string | null;
  interviewDate: string | null;
  followUpDate: string | null;
  recruiterName: string | null;
  recruiterContact: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The complete package assembled for review before submission. */
export interface ApplicationPackageDTO {
  application: ApplicationDTO;
  customizedResume: CustomizedResume | null;
  coverLetter: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  events: ApplicationEventDTO[];
  /** Stage the application can advance to next, or null at the end. */
  nextStage: WorkflowStage | null;
}

// ── Analytics & Career Assistant (Phase 9) ──────────────────
export interface CountItem {
  label: string;
  count: number;
}

export interface AnalyticsDTO {
  totalJobs: number;
  jobsBySource: CountItem[];
  topCompanies: CountItem[];
  mostDemandedSkills: CountItem[];
  averageSalary: string | null;
  /** New jobs per day for the last 14 days. */
  hiringTrend: { date: string; count: number }[];
  applications: {
    total: number;
    byStatus: CountItem[];
    submitted: number;
    interviews: number;
    offers: number;
    rejections: number;
    successRate: number;
  };
  /** Missing skills aggregated across the user's matched jobs. */
  skillGaps: CountItem[];
}

export interface SkillDemandDTO {
  name: string;
  type: string;
  demand: number;
}

export interface WeeklyReportDTO {
  id: string;
  weekStart: string;
  weekEnd: string;
  data: {
    topCompanies: CountItem[];
    mostDemandedSkills: CountItem[];
    averageSalary: string | null;
    newJobs: number;
    applications: number;
    interviewProbability: number;
    skillGaps: CountItem[];
  };
  createdAt: string;
}

/** AI Career Assistant output for a job × the user's resume (spec §AI Career Assistant). */
export interface CareerAssistantDTO {
  interviewProbability: number;
  atsScore: number;
  resumeSuggestions: string[];
  missingSkills: string[];
  learningResources: { skill: string; resource: string; url: string }[];
  expectedSalaryRange: string;
  interviewQuestions: string[];
  companySummary: string;
  similarJobs: { id: string; title: string; company: string | null }[];
}

// ── Notifications (Phase 8) ──────────────────────────────────
export interface NotificationDTO {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string;
  jobId: string | null;
  applicationId: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

/** Result of a notify() fan-out across channels. */
export interface NotifyResult {
  delivered: { channel: string; status: string; error?: string }[];
}

// ── Auth (Phase 6) ───────────────────────────────────────────
export interface AuthUserDTO {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthResultDTO {
  token: string;
  user: AuthUserDTO;
}
