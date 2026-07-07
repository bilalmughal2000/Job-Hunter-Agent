/**
 * Shared domain enums used across backend and frontend.
 * These are string enums so they serialize cleanly over JSON and map
 * 1:1 to Prisma enums introduced in Phase 2.
 */

export enum JobSource {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  ROZEE = 'ROZEE',
  MUSTAKBIL = 'MUSTAKBIL',
  WELLFOUND = 'WELLFOUND',
  GOOGLE_JOBS = 'GOOGLE_JOBS',
  GREENHOUSE = 'GREENHOUSE',
  LEVER = 'LEVER',
  COMPANY_CAREER = 'COMPANY_CAREER',
  MANUAL = 'MANUAL',
}

export enum RemoteType {
  ON_SITE = 'ON_SITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
  UNKNOWN = 'UNKNOWN',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  TEMPORARY = 'TEMPORARY',
  UNKNOWN = 'UNKNOWN',
}

/** Ordered stages of the application workflow (Phase 6 state machine). */
export enum WorkflowStage {
  JOB_FOUND = 'JOB_FOUND',
  RESUME_MATCHED = 'RESUME_MATCHED',
  RESUME_CUSTOMIZED = 'RESUME_CUSTOMIZED',
  COVER_LETTER_GENERATED = 'COVER_LETTER_GENERATED',
  PACKAGE_PREPARED = 'PACKAGE_PREPARED',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  USER_APPROVED = 'USER_APPROVED',
  SUBMITTED = 'SUBMITTED',
  TRACKING = 'TRACKING',
}

/** Human-facing application status (tracked independently of workflow stage). */
export enum ApplicationStatus {
  SAVED = 'SAVED',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  TECHNICAL_TEST = 'TECHNICAL_TEST',
  FINAL_INTERVIEW = 'FINAL_INTERVIEW',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum NotificationChannel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
}

export enum SkillType {
  TECHNICAL = 'TECHNICAL',
  SOFT = 'SOFT',
  GENERAL = 'GENERAL',
}

export enum ResumeFileFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  DOC = 'DOC',
  TXT = 'TXT',
  RTF = 'RTF',
}

/** Lifecycle of a resume's text extraction (mirrors the Prisma enum). */
export enum ResumeParseStatus {
  PENDING = 'PENDING',
  PARSING = 'PARSING',
  PARSED = 'PARSED',
  OCR_FALLBACK = 'OCR_FALLBACK',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  FAILED = 'FAILED',
}
