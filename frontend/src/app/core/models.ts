/**
 * Frontend view of the backend API contracts (mirrors @ajh/shared). Kept local
 * so the Angular bundler stays decoupled from the backend workspace.
 */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}
export interface ApiError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type RemoteType = 'ON_SITE' | 'HYBRID' | 'REMOTE' | 'UNKNOWN';
export type JobSortField = 'NEWEST' | 'HIGHEST_MATCH' | 'SALARY';

export interface JobDTO {
  id: string;
  title: string;
  company: string | null;
  location: string;
  country: string;
  salary: string | null;
  experience: string | null;
  employmentType: string;
  remoteType: RemoteType;
  description: string;
  requirements: string | null;
  benefits: string | null;
  url: string;
  source: string;
  postedDate: string | null;
  aiSummary: string | null;
  matchScore: number | null;
  missingSkills: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobFilter {
  keywords?: string;
  location?: string;
  company?: string;
  remoteTypes?: RemoteType[];
  minMatchScore?: number;
  sort?: JobSortField;
  page?: number;
  pageSize?: number;
}

export interface SearchRunSummary {
  totalFound: number;
  afterDedup: number;
  newlyPersisted: number;
  durationMs: number;
  bySource: Record<string, number>;
  errors: { source: string; message: string }[];
}

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

export interface JobAnalysis {
  summary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  salary?: string | null;
}

export interface ResumeDTO {
  id: string;
  originalName: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  parseStatus: string;
  parseError: string | null;
  isPrimary: boolean;
  uploadedAt: string;
  hasProfile: boolean;
}

export interface ResumeProfileDTO {
  id: string;
  resumeId: string;
  extractedAt: string;
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  skills: { name: string; type: string; level?: string | null }[];
  experiences: {
    company: string;
    title: string;
    isCurrent: boolean;
    startDate?: string | null;
    endDate?: string | null;
    highlights: string[];
  }[];
  educations: { institution: string; degree?: string | null }[];
  certifications: { name: string }[];
  languages: { name: string; proficiency?: string | null }[];
  projects: { name: string; technologies: string[] }[];
}

export interface CustomizedResume {
  summary: string;
  highlightedSkills: string[];
  experiences: { company: string; title: string; bullets: string[] }[];
  keywords: string[];
  atsScore: number;
}

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

export type WorkflowStage =
  | 'JOB_FOUND'
  | 'RESUME_MATCHED'
  | 'RESUME_CUSTOMIZED'
  | 'COVER_LETTER_GENERATED'
  | 'PACKAGE_PREPARED'
  | 'READY_FOR_REVIEW'
  | 'USER_APPROVED'
  | 'SUBMITTED'
  | 'TRACKING';

export type ApplicationStatus =
  | 'SAVED'
  | 'READY_FOR_REVIEW'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INTERVIEW_SCHEDULED'
  | 'TECHNICAL_TEST'
  | 'FINAL_INTERVIEW'
  | 'OFFER_RECEIVED'
  | 'REJECTED'
  | 'WITHDRAWN';

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

export interface ApplicationEventDTO {
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note: string | null;
  createdAt: string;
}

export interface ApplicationPackageDTO {
  application: ApplicationDTO;
  customizedResume: CustomizedResume | null;
  coverLetter: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  events: ApplicationEventDTO[];
  nextStage: WorkflowStage | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}
export interface AuthResult {
  token: string;
  user: AuthUser;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'JOB_FOUND',
  'RESUME_MATCHED',
  'RESUME_CUSTOMIZED',
  'COVER_LETTER_GENERATED',
  'PACKAGE_PREPARED',
  'READY_FOR_REVIEW',
  'USER_APPROVED',
  'SUBMITTED',
  'TRACKING',
];

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'SAVED',
  'READY_FOR_REVIEW',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INTERVIEW_SCHEDULED',
  'TECHNICAL_TEST',
  'FINAL_INTERVIEW',
  'OFFER_RECEIVED',
  'REJECTED',
  'WITHDRAWN',
];
