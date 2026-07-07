import {
  type ApplicationDTO,
  type ApplicationEventDTO,
  type ApplicationStatus,
  type WorkflowStage,
} from '@ajh/shared';
import type { ApplicationEvent } from '@prisma/client';
import type { ApplicationWithRelations } from '../repositories/application.repository.js';

const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

export function toApplicationDTO(app: ApplicationWithRelations): ApplicationDTO {
  return {
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job.title,
    company: app.job.company?.name ?? null,
    resumeVersionId: app.resumeVersionId,
    coverLetterId: app.coverLetterId,
    stage: app.stage as unknown as WorkflowStage,
    status: app.status as unknown as ApplicationStatus,
    appliedDate: iso(app.appliedDate),
    interviewDate: iso(app.interviewDate),
    followUpDate: iso(app.followUpDate),
    recruiterName: app.recruiterName,
    recruiterContact: app.recruiterContact,
    notes: app.notes,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

export function toApplicationEventDTO(e: ApplicationEvent): ApplicationEventDTO {
  return {
    fromStage: (e.fromStage as unknown as WorkflowStage) ?? null,
    toStage: e.toStage as unknown as WorkflowStage,
    fromStatus: (e.fromStatus as unknown as ApplicationStatus) ?? null,
    toStatus: e.toStatus as unknown as ApplicationStatus,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  };
}
