import type { CoverLetter, ResumeVersion } from '@prisma/client';
import type { CoverLetterDTO, CustomizedResume, ResumeVersionDTO } from '@ajh/shared';

export function toResumeVersionDTO(v: ResumeVersion): ResumeVersionDTO {
  return {
    id: v.id,
    jobId: v.jobId,
    baseResumeId: v.baseResumeId,
    label: v.label,
    content: v.content as unknown as CustomizedResume,
    atsScore: v.atsScore,
    version: v.version,
    createdAt: v.createdAt.toISOString(),
  };
}

export function toCoverLetterDTO(c: CoverLetter): CoverLetterDTO {
  return {
    id: c.id,
    jobId: c.jobId,
    resumeVersionId: c.resumeVersionId,
    content: c.content,
    tone: c.tone,
    isEdited: c.isEdited,
    version: c.version,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
