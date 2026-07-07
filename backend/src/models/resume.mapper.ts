import type {
  Resume,
  ResumeProfile,
  ResumeSkill,
  ResumeExperience,
  ResumeProject,
  ResumeEducation,
  ResumeCertification,
  ResumeLanguage,
  ResumeAward,
} from '@prisma/client';
import {
  type ResumeDTO,
  type ResumeFileFormat,
  type ResumeParseStatus,
  type ResumeProfileDTO,
  type SkillType,
} from '@ajh/shared';

export type ResumeProfileWithChildren = ResumeProfile & {
  skills: ResumeSkill[];
  experiences: ResumeExperience[];
  projects: ResumeProject[];
  educations: ResumeEducation[];
  certifications: ResumeCertification[];
  languages: ResumeLanguage[];
  awards: ResumeAward[];
};

const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

export function toResumeDTO(resume: Resume & { profile?: { id: string } | null }): ResumeDTO {
  return {
    id: resume.id,
    originalName: resume.originalName,
    format: resume.format as unknown as ResumeFileFormat,
    mimeType: resume.mimeType,
    sizeBytes: resume.sizeBytes,
    parseStatus: resume.parseStatus as unknown as ResumeParseStatus,
    parseError: resume.parseError,
    isPrimary: resume.isPrimary,
    uploadedAt: resume.uploadedAt.toISOString(),
    hasProfile: !!resume.profile,
  };
}

export function toResumeProfileDTO(profile: ResumeProfileWithChildren): ResumeProfileDTO {
  return {
    id: profile.id,
    resumeId: profile.resumeId,
    extractedAt: profile.extractedAt.toISOString(),
    fullName: profile.fullName,
    headline: profile.headline,
    summary: profile.summary,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    portfolioUrl: profile.portfolioUrl,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    websiteUrl: profile.websiteUrl,
    skills: profile.skills.map((s) => ({
      name: s.name,
      type: s.type as unknown as SkillType,
      level: s.level,
    })),
    experiences: profile.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location,
      startDate: iso(e.startDate),
      endDate: iso(e.endDate),
      isCurrent: e.isCurrent,
      description: e.description,
      highlights: e.highlights,
    })),
    projects: profile.projects.map((p) => ({
      name: p.name,
      description: p.description,
      url: p.url,
      technologies: p.technologies,
    })),
    educations: profile.educations.map((ed) => ({
      institution: ed.institution,
      degree: ed.degree,
      fieldOfStudy: ed.fieldOfStudy,
      startDate: iso(ed.startDate),
      endDate: iso(ed.endDate),
      grade: ed.grade,
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      issueDate: iso(c.issueDate),
      expiryDate: iso(c.expiryDate),
      credentialId: c.credentialId,
      url: c.url,
    })),
    languages: profile.languages.map((l) => ({ name: l.name, proficiency: l.proficiency })),
    awards: profile.awards.map((a) => ({
      title: a.title,
      issuer: a.issuer,
      date: iso(a.date),
      description: a.description,
    })),
  };
}
