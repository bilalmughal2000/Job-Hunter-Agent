import type { Prisma, PrismaClient, ResumeVersion } from '@prisma/client';
import type { CustomizedResume } from '@ajh/shared';

export interface CreateResumeVersionInput {
  userId: string;
  baseResumeId: string;
  jobId: string;
  content: CustomizedResume;
  atsScore: number;
  label?: string | null;
}

export interface IResumeVersionRepository {
  create(input: CreateResumeVersionInput): Promise<ResumeVersion>;
  listByJob(jobId: string): Promise<ResumeVersion[]>;
  findById(id: string): Promise<ResumeVersion | null>;
}

export class ResumeVersionRepository implements IResumeVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateResumeVersionInput): Promise<ResumeVersion> {
    // Auto-increment version per (baseResume, job).
    const last = await this.prisma.resumeVersion.findFirst({
      where: { baseResumeId: input.baseResumeId, jobId: input.jobId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    return this.prisma.resumeVersion.create({
      data: {
        userId: input.userId,
        baseResumeId: input.baseResumeId,
        jobId: input.jobId,
        content: input.content as unknown as Prisma.InputJsonValue,
        atsScore: input.atsScore,
        label: input.label ?? `v${version}`,
        version,
      },
    });
  }

  listByJob(jobId: string): Promise<ResumeVersion[]> {
    return this.prisma.resumeVersion.findMany({
      where: { jobId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findById(id: string): Promise<ResumeVersion | null> {
    return this.prisma.resumeVersion.findUnique({ where: { id } });
  }
}
