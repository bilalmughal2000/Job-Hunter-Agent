import type { Company, Job } from '@prisma/client';
import {
  EmploymentType as PrismaEmploymentType,
  JobSourceKind as PrismaJobSourceKind,
  RemoteType as PrismaRemoteType,
} from '@prisma/client';
import type { EmploymentType, JobDTO, JobSource, NormalizedJob, RemoteType } from '@ajh/shared';

/**
 * Shared enums and Prisma enums have identical string members but are distinct
 * TS types. These maps convert between them explicitly (safer than casting).
 */
export const toPrismaSource = (s: JobSource): PrismaJobSourceKind =>
  PrismaJobSourceKind[s as keyof typeof PrismaJobSourceKind];
export const toPrismaRemote = (r: RemoteType): PrismaRemoteType =>
  PrismaRemoteType[r as keyof typeof PrismaRemoteType];
export const toPrismaEmployment = (e: EmploymentType): PrismaEmploymentType =>
  PrismaEmploymentType[e as keyof typeof PrismaEmploymentType];

/** Prisma Job (optionally with its Company joined) → API DTO. */
export function toJobDTO(job: Job & { company?: Company | null }): JobDTO {
  return {
    id: job.id,
    title: job.title,
    company: job.company?.name ?? null,
    companyId: job.companyId,
    location: job.location,
    country: job.country,
    salary: job.salary,
    experience: job.experience,
    employmentType: job.employmentType as unknown as EmploymentType,
    remoteType: job.remoteType as unknown as RemoteType,
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    url: job.url,
    source: job.source as unknown as JobSource,
    externalId: job.externalId,
    postedDate: job.postedDate?.toISOString() ?? null,
    aiSummary: job.aiSummary,
    matchScore: job.matchScore,
    missingSkills: job.missingSkills,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export interface JobCreateData {
  title: string;
  companyId: string | null;
  location: string;
  country: string;
  salary: string | null;
  experience: string | null;
  employmentType: PrismaEmploymentType;
  remoteType: PrismaRemoteType;
  description: string;
  requirements: string | null;
  benefits: string | null;
  url: string;
  source: PrismaJobSourceKind;
  externalId: string | null;
  postedDate: Date | null;
  dedupHash: string;
}

/** NormalizedJob (+ resolved companyId + dedup fingerprint) → Prisma create input. */
export function toJobCreateData(
  job: NormalizedJob,
  companyId: string | null,
  dedupHash: string,
): JobCreateData {
  return {
    title: job.title,
    companyId,
    location: job.location,
    country: job.country,
    salary: job.salary ?? null,
    experience: job.experience ?? null,
    employmentType: toPrismaEmployment(job.employmentType),
    remoteType: toPrismaRemote(job.remoteType),
    description: job.description,
    requirements: job.requirements ?? null,
    benefits: job.benefits ?? null,
    url: job.url,
    source: toPrismaSource(job.source),
    externalId: job.externalId ?? null,
    postedDate: job.postedDate ? new Date(job.postedDate) : null,
    dedupHash,
  };
}
