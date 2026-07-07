import { z } from 'zod';
import { JobSortField, JobSource, RemoteType } from '@ajh/shared';

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
