import type { NotificationChannel } from '@ajh/shared';

/** A rendered notification ready to deliver. */
export interface NotificationMessage {
  subject: string;
  body: string;
  jobId?: string | null;
  applicationId?: string | null;
}

/** Where to deliver (recipient varies per channel). */
export interface Recipient {
  email?: string | null;
  telegramChatId?: string | null;
}

/**
 * Notification Agent channel. Each channel is independently pluggable/testable
 * (spec constraint #6). `isConfigured()` gates whether it can actually deliver.
 */
export interface NotificationChannelSender {
  readonly channel: NotificationChannel;
  isConfigured(): boolean;
  send(message: NotificationMessage, recipient: Recipient): Promise<void>;
}
