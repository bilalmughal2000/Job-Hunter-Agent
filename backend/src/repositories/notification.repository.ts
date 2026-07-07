import type {
  Notification,
  NotificationChannel,
  NotificationStatus,
  PrismaClient,
} from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject?: string | null;
  body: string;
  jobId?: string | null;
  applicationId?: string | null;
  sentAt?: Date | null;
  error?: string | null;
}

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  listByUser(
    userId: string,
    filter: { page?: number; pageSize?: number },
  ): Promise<{ items: Notification[]; total: number }>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        status: input.status,
        subject: input.subject ?? null,
        body: input.body,
        jobId: input.jobId ?? null,
        applicationId: input.applicationId ?? null,
        sentAt: input.sentAt ?? null,
        error: input.error ?? null,
      },
    });
  }

  async listByUser(
    userId: string,
    filter: { page?: number; pageSize?: number },
  ): Promise<{ items: Notification[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 30));
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total };
  }
}
