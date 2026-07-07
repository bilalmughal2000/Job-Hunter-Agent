import type { Notification } from '@prisma/client';
import type { NotificationDTO } from '@ajh/shared';

export function toNotificationDTO(n: Notification): NotificationDTO {
  return {
    id: n.id,
    channel: n.channel,
    status: n.status,
    subject: n.subject,
    body: n.body,
    jobId: n.jobId,
    applicationId: n.applicationId,
    sentAt: n.sentAt?.toISOString() ?? null,
    error: n.error,
    createdAt: n.createdAt.toISOString(),
  };
}
