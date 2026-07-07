import type { Prisma, PrismaClient, Resume, ResumeParseStatus } from '@prisma/client';
import { SkillType as PrismaSkillType } from '@prisma/client';
import type { ExtractedProfile, SkillType } from '@ajh/shared';
import type { ResumeProfileWithChildren } from '../models/resume.mapper.js';
import type { CreateResumeInput, IResumeRepository, ResumeWithProfileFlag } from './types.js';

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toPrismaSkillType = (t: SkillType): PrismaSkillType =>
  PrismaSkillType[t as keyof typeof PrismaSkillType];

const PROFILE_INCLUDE = {
  skills: true,
  experiences: { orderBy: { sortOrder: 'asc' } },
  projects: { orderBy: { sortOrder: 'asc' } },
  educations: { orderBy: { sortOrder: 'asc' } },
  certifications: { orderBy: { sortOrder: 'asc' } },
  languages: true,
  awards: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ResumeProfileInclude;

export class ResumeRepository implements IResumeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateResumeInput): Promise<Resume> {
    // The user's first resume becomes their primary one.
    const existingCount = await this.prisma.resume.count({ where: { userId: input.userId } });
    return this.prisma.resume.create({
      data: {
        userId: input.userId,
        originalName: input.originalName,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        format: input.format,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
        isPrimary: existingCount === 0,
      },
    });
  }

  async setStatus(id: string, status: ResumeParseStatus, error?: string | null): Promise<void> {
    await this.prisma.resume.update({
      where: { id },
      data: { parseStatus: status, parseError: error ?? null },
    });
  }

  async saveProfile(resumeId: string, profile: ExtractedProfile, rawText: string): Promise<void> {
    // Link extracted skills to the canonical dictionary (case-insensitive).
    const dictionary = await this.prisma.skill.findMany({ select: { id: true, name: true } });
    const skillIdByName = new Map(dictionary.map((s) => [s.name.toLowerCase(), s.id]));

    await this.prisma.$transaction(async (tx) => {
      // Replace any prior profile (cascades to children).
      await tx.resumeProfile.deleteMany({ where: { resumeId } });

      await tx.resumeProfile.create({
        data: {
          resumeId,
          fullName: profile.fullName ?? null,
          headline: profile.headline ?? null,
          summary: profile.summary ?? null,
          email: profile.email ?? null,
          phone: profile.phone ?? null,
          location: profile.location ?? null,
          portfolioUrl: profile.portfolioUrl ?? null,
          githubUrl: profile.githubUrl ?? null,
          linkedinUrl: profile.linkedinUrl ?? null,
          websiteUrl: profile.websiteUrl ?? null,
          rawText,
          skills: {
            create: profile.skills.map((s) => ({
              name: s.name,
              type: toPrismaSkillType(s.type),
              level: s.level ?? null,
              skillId: skillIdByName.get(s.name.toLowerCase()) ?? null,
            })),
          },
          experiences: {
            create: profile.experiences.map((e, i) => ({
              company: e.company,
              title: e.title,
              location: e.location ?? null,
              startDate: toDate(e.startDate),
              endDate: toDate(e.endDate),
              isCurrent: e.isCurrent,
              description: e.description ?? null,
              highlights: e.highlights,
              sortOrder: i,
            })),
          },
          projects: {
            create: profile.projects.map((p, i) => ({
              name: p.name,
              description: p.description ?? null,
              url: p.url ?? null,
              technologies: p.technologies,
              sortOrder: i,
            })),
          },
          educations: {
            create: profile.educations.map((ed, i) => ({
              institution: ed.institution,
              degree: ed.degree ?? null,
              fieldOfStudy: ed.fieldOfStudy ?? null,
              startDate: toDate(ed.startDate),
              endDate: toDate(ed.endDate),
              grade: ed.grade ?? null,
              sortOrder: i,
            })),
          },
          certifications: {
            create: profile.certifications.map((c, i) => ({
              name: c.name,
              issuer: c.issuer ?? null,
              issueDate: toDate(c.issueDate),
              expiryDate: toDate(c.expiryDate),
              credentialId: c.credentialId ?? null,
              url: c.url ?? null,
              sortOrder: i,
            })),
          },
          languages: {
            create: profile.languages.map((l) => ({
              name: l.name,
              proficiency: l.proficiency ?? null,
            })),
          },
          awards: {
            create: profile.awards.map((a, i) => ({
              title: a.title,
              issuer: a.issuer ?? null,
              date: toDate(a.date),
              description: a.description ?? null,
              sortOrder: i,
            })),
          },
        },
      });
    });
  }

  async findById(id: string): Promise<ResumeWithProfileFlag | null> {
    return this.prisma.resume.findUnique({
      where: { id },
      include: { profile: { select: { id: true } } },
    });
  }

  async findProfileByResumeId(resumeId: string): Promise<ResumeProfileWithChildren | null> {
    return this.prisma.resumeProfile.findUnique({
      where: { resumeId },
      include: PROFILE_INCLUDE,
    });
  }
}
