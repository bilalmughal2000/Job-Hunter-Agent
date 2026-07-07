import { z } from 'zod';
import { ApplicationStatus, JobSortField, JobSource, RemoteType } from '@ajh/shared';

const remoteTypeEnum = z.nativeEnum(RemoteType);
const jobSourceEnum = z.nativeEnum(JobSource);

/** Body schema for `POST /search`. */
export const searchQuerySchema = z.object({
  keywords: z.array(z.string().min(1)).default([]),
  boolean: z.string().min(1).nullish(),
  excludeKeywords: z.array(z.string().min(1)).optional(),
  locations: z.array(z.string().min(1)).optional(),
  company: z.string().min(1).nullish(),
  remoteTypes: z.array(remoteTypeEnum).optional(),
  sources: z.array(jobSourceEnum).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

/** Comma-separated list → array helper for query params. */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item));

/** Query schema for `GET /jobs`. */
export const jobFilterSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  company: z.string().optional(),
  remoteTypes: csv(remoteTypeEnum).optional(),
  sources: csv(jobSourceEnum).optional(),
  minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
  postedAfter: z.string().datetime().optional(),
  sort: z.nativeEnum(JobSortField).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const jobIdParamSchema = z.object({
  id: z.string().uuid('Invalid job id'),
});

export const resumeIdParamSchema = z.object({
  id: z.string().uuid('Invalid resume id'),
});

// ── AI agents (Phase 5) ──────────────────────────────────────
export const matchBodySchema = z.object({
  resumeId: z.string().uuid().optional(),
});

export const customizeBodySchema = z.object({
  jobId: z.string().uuid('Invalid job id'),
  resumeId: z.string().uuid().optional(),
});

export const jobIdInParamSchema = z.object({
  jobId: z.string().uuid('Invalid job id'),
});

export const coverLetterBodySchema = z.object({
  jobId: z.string().uuid('Invalid job id'),
  resumeVersionId: z.string().uuid('Invalid resume version id'),
});

export const coverLetterUpdateSchema = z.object({
  content: z.string().min(1, 'content is required'),
});

// ── Auth (Phase 6) ───────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'password must be at least 8 characters'),
  name: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Applications (Phase 6) ───────────────────────────────────
export const createApplicationSchema = z.object({
  jobId: z.string().uuid('Invalid job id'),
  resumeVersionId: z.string().uuid().optional(),
  coverLetterId: z.string().uuid().optional(),
});

export const updateApplicationSchema = z
  .object({
    resumeVersionId: z.string().uuid().nullable().optional(),
    coverLetterId: z.string().uuid().nullable().optional(),
    interviewDate: z.string().datetime().nullable().optional(),
    followUpDate: z.string().datetime().nullable().optional(),
    recruiterName: z.string().max(200).nullable().optional(),
    recruiterContact: z.string().max(200).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();

export const advanceApplicationSchema = z.object({
  note: z.string().max(1000).optional(),
});

const applicationStatusEnum = z.nativeEnum(ApplicationStatus);

export const updateStatusSchema = z.object({
  status: applicationStatusEnum,
  note: z.string().max(1000).optional(),
});

export const applicationsFilterSchema = z.object({
  status: applicationStatusEnum.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
