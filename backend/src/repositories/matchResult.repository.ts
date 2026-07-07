import type { MatchResult as PrismaMatchResult, PrismaClient } from '@prisma/client';
import type { MatchResult } from '@ajh/shared';

export interface SaveMatchInput {
  userId: string;
  jobId: string;
  resumeProfileId: string;
  result: MatchResult;
}

export interface IMatchResultRepository {
  /** Upsert the match for a (profile, job) pair and refresh the Job snapshot. */
  save(input: SaveMatchInput): Promise<PrismaMatchResult>;
}

export class MatchResultRepository implements IMatchResultRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(input: SaveMatchInput): Promise<PrismaMatchResult> {
    const { result } = input;
    const data = {
      matchScore: result.matchScore,
      explanation: result.explanation,
      missingSkills: result.missingSkills,
      strongSkills: result.strongSkills,
      weakSkills: result.weakSkills,
      experienceGap: result.experienceGap,
      recommendation: result.recommendation,
      confidenceScore: result.confidenceScore,
    };

    const [match] = await this.prisma.$transaction([
      this.prisma.matchResult.upsert({
        where: {
          resumeProfileId_jobId: { resumeProfileId: input.resumeProfileId, jobId: input.jobId },
        },
        update: { ...data, userId: input.userId },
        create: {
          userId: input.userId,
          jobId: input.jobId,
          resumeProfileId: input.resumeProfileId,
          ...data,
        },
      }),
      // Denormalized "primary" snapshot on the Job (spec Job Model).
      this.prisma.job.update({
        where: { id: input.jobId },
        data: {
          matchScore: result.matchScore,
          missingSkills: result.missingSkills,
          status: 'MATCHED',
        },
      }),
    ]);
    return match;
  }
}
