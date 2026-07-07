import type { CoverLetter, PrismaClient } from '@prisma/client';

export interface CreateCoverLetterInput {
  userId: string;
  jobId: string;
  resumeVersionId: string;
  content: string;
  tone?: string | null;
}

export interface ICoverLetterRepository {
  create(input: CreateCoverLetterInput): Promise<CoverLetter>;
  update(id: string, content: string): Promise<CoverLetter | null>;
  findById(id: string): Promise<CoverLetter | null>;
}

export class CoverLetterRepository implements ICoverLetterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCoverLetterInput): Promise<CoverLetter> {
    const last = await this.prisma.coverLetter.findFirst({
      where: { jobId: input.jobId, resumeVersionId: input.resumeVersionId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return this.prisma.coverLetter.create({
      data: {
        userId: input.userId,
        jobId: input.jobId,
        resumeVersionId: input.resumeVersionId,
        content: input.content,
        tone: input.tone ?? null,
        version: (last?.version ?? 0) + 1,
      },
    });
  }

  async update(id: string, content: string): Promise<CoverLetter | null> {
    const existing = await this.prisma.coverLetter.findUnique({ where: { id } });
    if (!existing) return null;
    return this.prisma.coverLetter.update({
      where: { id },
      data: { content, isEdited: true },
    });
  }

  findById(id: string): Promise<CoverLetter | null> {
    return this.prisma.coverLetter.findUnique({ where: { id } });
  }
}
