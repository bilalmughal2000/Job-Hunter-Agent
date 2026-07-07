import type {
  ApplicationStatus,
  EmploymentType,
  JobSource,
  RemoteType,
  WorkflowStage,
} from './enums.js';

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

/** Structured output of the AI Matching Agent (Phase 5). */
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
