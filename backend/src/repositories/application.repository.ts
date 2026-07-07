import type {
  Application,
  ApplicationEvent,
  Company,
  CoverLetter,
  Job,
  Prisma,
  PrismaClient,
  ResumeVersion,
} from '@prisma/client';
import { ApplicationStatus, WorkflowStage } from '@ajh/shared';

export type ApplicationWithRelations = Application & {
  job: Job & { company: Company | null };
  resumeVersion: ResumeVersion | null;
  coverLetter: CoverLetter | null;
  events: ApplicationEvent[];
};

export interface CreateApplicationInput {
  userId: string;
  jobId: string;
  resumeVersionId?: string | null;
  coverLetterId?: string | null;
}

export interface ApplicationEventData {
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note?: string | null;
}

export interface ListApplicationsFilter {
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}

export interface IApplicationRepository {
  create(input: CreateApplicationInput): Promise<ApplicationWithRelations>;
  findById(id: string): Promise<ApplicationWithRelations | null>;
  listByUser(
    userId: string,
    filter: ListApplicationsFilter,
  ): Promise<{ items: ApplicationWithRelations[]; total: number }>;
  /** Atomically apply a partial update and append an audit event. */
  transition(
    id: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
    event: ApplicationEventData,
  ): Promise<ApplicationWithRelations>;
  update(
    id: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
  ): Promise<ApplicationWithRelations>;
}

const INCLUDE = {
  job: { include: { company: true } },
  resumeVersion: true,
  coverLetter: true,
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ApplicationInclude;

export class ApplicationRepository implements IApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateApplicationInput): Promise<ApplicationWithRelations> {
    return this.prisma.application.create({
      data: {
        userId: input.userId,
        jobId: input.jobId,
        resumeVersionId: input.resumeVersionId ?? null,
        coverLetterId: input.coverLetterId ?? null,
        stage: WorkflowStage.JOB_FOUND,
        status: ApplicationStatus.SAVED,
        events: {
          create: {
            fromStage: null,
            toStage: WorkflowStage.JOB_FOUND,
            fromStatus: null,
            toStatus: ApplicationStatus.SAVED,
            note: 'Application created',
          },
        },
      },
      include: INCLUDE,
    });
  }

  findById(id: string): Promise<ApplicationWithRelations | null> {
    return this.prisma.application.findUnique({ where: { id }, include: INCLUDE });
  }

  async listByUser(
    userId: string,
    filter: ListApplicationsFilter,
  ): Promise<{ items: ApplicationWithRelations[]; total: number }> {
    const where: Prisma.ApplicationWhereInput = { userId };
    if (filter.status) where.status = filter.status;
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { items, total };
  }

  async transition(
    id: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
    event: ApplicationEventData,
  ): Promise<ApplicationWithRelations> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.application.update({ where: { id }, data, include: INCLUDE }),
      this.prisma.applicationEvent.create({
        data: {
          applicationId: id,
          fromStage: event.fromStage,
          toStage: event.toStage,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          note: event.note ?? null,
        },
      }),
    ]);
    return updated;
  }

  update(
    id: string,
    data: Prisma.ApplicationUncheckedUpdateInput,
  ): Promise<ApplicationWithRelations> {
    return this.prisma.application.update({ where: { id }, data, include: INCLUDE });
  }
}
