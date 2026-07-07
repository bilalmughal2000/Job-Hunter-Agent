import {
  ApplicationStatus,
  WorkflowStage,
  type ApplicationDTO,
  type ApplicationPackageDTO,
  type CustomizedResume,
  type Paginated,
} from '@ajh/shared';
import type { Prisma } from '@prisma/client';
import { toApplicationDTO, toApplicationEventDTO } from '../models/application.mapper.js';
import type {
  ApplicationEventData,
  IApplicationRepository,
} from '../repositories/application.repository.js';
import type { IJobRepository, IResumeRepository } from '../repositories/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { canTransitionStatus, isAtOrAfter, nextStage } from './workflow.js';
import type { IApplicationService, UpdateApplicationInput } from './types.js';

export class ApplicationService implements IApplicationService {
  constructor(
    private readonly apps: IApplicationRepository,
    private readonly jobs: IJobRepository,
    private readonly resumes: IResumeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Load an application the user owns, or 404. */
  private async owned(userId: string, id: string) {
    const app = await this.apps.findById(id);
    if (!app || app.userId !== userId) throw new NotFoundError(`Application not found: ${id}`);
    return app;
  }

  async create(
    userId: string,
    input: { jobId: string; resumeVersionId?: string; coverLetterId?: string },
  ): Promise<ApplicationDTO> {
    const job = await this.jobs.findById(input.jobId);
    if (!job) throw new NotFoundError(`Job not found: ${input.jobId}`);
    try {
      const app = await this.apps.create({
        userId,
        jobId: input.jobId,
        resumeVersionId: input.resumeVersionId ?? null,
        coverLetterId: input.coverLetterId ?? null,
      });
      return toApplicationDTO(app);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ValidationError('An application already exists for this job');
      }
      throw err;
    }
  }

  async advance(userId: string, id: string, note?: string): Promise<ApplicationDTO> {
    const app = await this.owned(userId, id);
    const current = app.stage as unknown as WorkflowStage;
    const next = nextStage(current);
    if (!next) throw new ValidationError('Application is already at the final stage');

    // The package must be assembled before it can be prepared/reviewed.
    if (next === WorkflowStage.PACKAGE_PREPARED && (!app.resumeVersionId || !app.coverLetterId)) {
      throw new ValidationError(
        'Attach a customized resume version and a cover letter before preparing the package',
      );
    }

    const data: Prisma.ApplicationUncheckedUpdateInput = { stage: next };
    const event: ApplicationEventData = {
      fromStage: current,
      toStage: next,
      fromStatus: app.status as unknown as ApplicationStatus,
      toStatus: app.status as unknown as ApplicationStatus,
      note: note ?? null,
    };

    // Reaching SUBMITTED means the user has approved (linear order guarantees it);
    // reflect that in the tracked status + applied date.
    if (next === WorkflowStage.SUBMITTED) {
      data.status = ApplicationStatus.SUBMITTED;
      data.appliedDate = app.appliedDate ?? this.now();
      event.toStatus = ApplicationStatus.SUBMITTED;
    }

    return toApplicationDTO(await this.apps.transition(id, data, event));
  }

  async updateStatus(
    userId: string,
    id: string,
    status: ApplicationStatus,
    note?: string,
  ): Promise<ApplicationDTO> {
    const app = await this.owned(userId, id);
    const current = app.status as unknown as ApplicationStatus;

    if (!canTransitionStatus(current, status)) {
      throw new ValidationError(`Cannot change status from ${current} to ${status}`);
    }
    // Auto-Apply policy (constraint #9): never mark SUBMITTED without approval.
    if (
      status === ApplicationStatus.SUBMITTED &&
      !isAtOrAfter(app.stage as unknown as WorkflowStage, WorkflowStage.USER_APPROVED)
    ) {
      throw new ValidationError(
        'Application must be user-approved before it can be marked submitted',
      );
    }

    const data: Prisma.ApplicationUncheckedUpdateInput = { status };
    if (status === ApplicationStatus.SUBMITTED && !app.appliedDate) {
      data.appliedDate = this.now();
    }

    return toApplicationDTO(
      await this.apps.transition(id, data, {
        fromStage: app.stage as unknown as WorkflowStage,
        toStage: app.stage as unknown as WorkflowStage,
        fromStatus: current,
        toStatus: status,
        note: note ?? null,
      }),
    );
  }

  async update(
    userId: string,
    id: string,
    fields: UpdateApplicationInput,
  ): Promise<ApplicationDTO> {
    await this.owned(userId, id);
    const data: Prisma.ApplicationUncheckedUpdateInput = {};
    if ('resumeVersionId' in fields) data.resumeVersionId = fields.resumeVersionId ?? null;
    if ('coverLetterId' in fields) data.coverLetterId = fields.coverLetterId ?? null;
    if ('recruiterName' in fields) data.recruiterName = fields.recruiterName ?? null;
    if ('recruiterContact' in fields) data.recruiterContact = fields.recruiterContact ?? null;
    if ('notes' in fields) data.notes = fields.notes ?? null;
    if ('interviewDate' in fields) {
      data.interviewDate = fields.interviewDate ? new Date(fields.interviewDate) : null;
    }
    if ('followUpDate' in fields) {
      data.followUpDate = fields.followUpDate ? new Date(fields.followUpDate) : null;
    }
    return toApplicationDTO(await this.apps.update(id, data));
  }

  async getPackage(userId: string, id: string): Promise<ApplicationPackageDTO> {
    const app = await this.owned(userId, id);
    const profile = await this.resumes.findLatestProfileForUser(userId);
    return {
      application: toApplicationDTO(app),
      customizedResume: (app.resumeVersion?.content as unknown as CustomizedResume) ?? null,
      coverLetter: app.coverLetter?.content ?? null,
      portfolioUrl: profile?.portfolioUrl ?? null,
      githubUrl: profile?.githubUrl ?? null,
      linkedinUrl: profile?.linkedinUrl ?? null,
      events: app.events.map(toApplicationEventDTO),
      nextStage: nextStage(app.stage as unknown as WorkflowStage),
    };
  }

  async list(
    userId: string,
    filter: { status?: ApplicationStatus; page?: number; pageSize?: number },
  ): Promise<Paginated<ApplicationDTO>> {
    const { items, total } = await this.apps.listByUser(userId, filter);
    return {
      items: items.map(toApplicationDTO),
      page: Math.max(1, filter.page ?? 1),
      pageSize: filter.pageSize ?? 20,
      total,
    };
  }
}
