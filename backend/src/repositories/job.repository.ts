import type { Prisma, PrismaClient } from '@prisma/client';
import { JobSkillRequirement } from '@prisma/client';
import { JobSortField, type JobFilter } from '@ajh/shared';
import type { JobCreateData } from '../models/job.mapper.js';
import { toPrismaRemote, toPrismaSource } from '../models/job.mapper.js';
import type { IJobRepository, JobWithCompany } from './types.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class JobRepository implements IJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listDedupKeys(): Promise<{ url: string; dedupHash: string | null }[]> {
    return this.prisma.job.findMany({ select: { url: true, dedupHash: true } });
  }

  async createManySkipDuplicates(data: JobCreateData[]): Promise<number> {
    if (data.length === 0) return 0;
    const result = await this.prisma.job.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async findById(id: string): Promise<JobWithCompany | null> {
    return this.prisma.job.findUnique({ where: { id }, include: { company: true } });
  }

  /** Persist a job's AI analysis: aiSummary + required/preferred JobSkills. */
  async updateAnalysis(
    jobId: string,
    summary: string,
    requiredSkills: string[],
    preferredSkills: string[],
  ): Promise<void> {
    // Resolve/create the canonical Skill rows for every mentioned skill.
    const names = [...new Set([...requiredSkills, ...preferredSkills])];
    const skillIdByName = new Map<string, string>();
    for (const name of names) {
      const skill = await this.prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      skillIdByName.set(name.toLowerCase(), skill.id);
    }

    const requiredSet = new Set(requiredSkills.map((s) => s.toLowerCase()));
    const links = names
      .map((name) => ({
        skillId: skillIdByName.get(name.toLowerCase())!,
        requirement: requiredSet.has(name.toLowerCase())
          ? JobSkillRequirement.REQUIRED
          : JobSkillRequirement.PREFERRED,
      }))
      .filter((l) => l.skillId);

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: { aiSummary: summary, status: 'ANALYZED' },
      }),
      this.prisma.jobSkill.deleteMany({ where: { jobId } }),
      this.prisma.jobSkill.createMany({
        data: links.map((l) => ({ jobId, skillId: l.skillId, requirement: l.requirement })),
        skipDuplicates: true,
      }),
    ]);
  }

  async findMany(filter: JobFilter): Promise<{ items: JobWithCompany[]; total: number }> {
    const where = this.buildWhere(filter);
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filter.pageSize ?? DEFAULT_PAGE_SIZE));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: { company: true },
        orderBy: this.buildOrderBy(filter.sort),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);

    return { items, total };
  }

  private buildWhere(filter: JobFilter): Prisma.JobWhereInput {
    const where: Prisma.JobWhereInput = {};
    const and: Prisma.JobWhereInput[] = [];

    if (filter.keywords?.trim()) {
      const kw = filter.keywords.trim();
      and.push({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { description: { contains: kw, mode: 'insensitive' } },
          { requirements: { contains: kw, mode: 'insensitive' } },
        ],
      });
    }
    if (filter.location?.trim()) {
      where.location = { contains: filter.location.trim(), mode: 'insensitive' };
    }
    if (filter.company?.trim()) {
      where.company = { is: { name: { contains: filter.company.trim(), mode: 'insensitive' } } };
    }
    if (filter.remoteTypes && filter.remoteTypes.length > 0) {
      where.remoteType = { in: filter.remoteTypes.map(toPrismaRemote) };
    }
    if (filter.sources && filter.sources.length > 0) {
      where.source = { in: filter.sources.map(toPrismaSource) };
    }
    if (typeof filter.minMatchScore === 'number') {
      where.matchScore = { gte: filter.minMatchScore };
    }
    if (filter.postedAfter) {
      const date = new Date(filter.postedAfter);
      if (!Number.isNaN(date.getTime())) where.postedDate = { gte: date };
    }

    if (and.length > 0) where.AND = and;
    return where;
  }

  private buildOrderBy(sort?: JobSortField): Prisma.JobOrderByWithRelationInput[] {
    switch (sort) {
      case JobSortField.HIGHEST_MATCH:
        return [{ matchScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      case JobSortField.SALARY:
        // Salary is a free-text field; best-effort lexical sort until it is parsed.
        return [{ salary: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      case JobSortField.NEWEST:
      default:
        return [{ postedDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    }
  }
}
