import {
  NotificationStatus,
  type NotificationDTO,
  type NotifyResult,
  type Paginated,
} from '@ajh/shared';
import {
  NotificationChannel as PrismaNotificationChannel,
  NotificationStatus as PrismaNotificationStatus,
} from '@prisma/client';
import type {
  NotificationChannelSender,
  NotificationMessage,
} from '../agents/notification/index.js';
import { toNotificationDTO } from '../models/notification.mapper.js';
import type { INotificationRepository } from '../repositories/notification.repository.js';
import type { IUserRepository } from '../repositories/user.repository.js';
import { NotFoundError } from '../utils/errors.js';
import type { Logger } from '../utils/logger.js';
import type { INotificationService } from './types.js';

export class NotificationService implements INotificationService {
  constructor(
    private readonly channels: NotificationChannelSender[],
    private readonly notifications: INotificationRepository,
    private readonly users: IUserRepository,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Deliver a message across every configured channel, persisting each attempt. */
  async notify(userId: string, message: NotificationMessage): Promise<NotifyResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const recipient = { email: user.email, telegramChatId: null };

    const delivered: NotifyResult['delivered'] = [];
    for (const channel of this.channels) {
      if (!channel.isConfigured()) continue;
      let status: NotificationStatus = NotificationStatus.SENT;
      let error: string | undefined;
      try {
        await channel.send(message, recipient);
      } catch (err) {
        status = NotificationStatus.FAILED;
        error = err instanceof Error ? err.message : String(err);
        this.logger.warn({ channel: channel.channel, error }, 'notification delivery failed');
      }

      await this.notifications.create({
        userId,
        channel:
          PrismaNotificationChannel[channel.channel as keyof typeof PrismaNotificationChannel],
        status: PrismaNotificationStatus[status as keyof typeof PrismaNotificationStatus],
        subject: message.subject,
        body: message.body,
        jobId: message.jobId ?? null,
        applicationId: message.applicationId ?? null,
        sentAt: status === NotificationStatus.SENT ? this.now() : null,
        error: error ?? null,
      });
      delivered.push({ channel: channel.channel, status, ...(error ? { error } : {}) });
    }

    return { delivered };
  }

  async list(
    userId: string,
    filter: { page?: number; pageSize?: number },
  ): Promise<Paginated<NotificationDTO>> {
    const { items, total } = await this.notifications.listByUser(userId, filter);
    return {
      items: items.map(toNotificationDTO),
      page: Math.max(1, filter.page ?? 1),
      pageSize: filter.pageSize ?? 30,
      total,
    };
  }
}
