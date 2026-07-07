import { NotificationChannel } from '@ajh/shared';
import { withRetry } from '../../utils/retry.js';
import type { NotificationChannelSender, NotificationMessage, Recipient } from './types.js';

export interface TelegramConfig {
  token?: string;
  /** Default chat id if the recipient doesn't carry one. */
  defaultChatId?: string;
}

/** Telegram Bot API channel — free, no SDK (uses fetch). */
export class TelegramChannel implements NotificationChannelSender {
  readonly channel = NotificationChannel.TELEGRAM;

  constructor(private readonly config: TelegramConfig) {}

  isConfigured(): boolean {
    return !!this.config.token && !!(this.config.defaultChatId ?? '');
  }

  async send(message: NotificationMessage, recipient: Recipient): Promise<void> {
    const chatId = recipient.telegramChatId ?? this.config.defaultChatId;
    if (!this.config.token || !chatId) {
      throw new Error('Telegram not configured (token/chat id missing)');
    }
    const url = `https://api.telegram.org/bot${this.config.token}/sendMessage`;
    const text = message.subject ? `*${message.subject}*\n${message.body}` : message.body;

    await withRetry(
      async () => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`Telegram sendMessage failed: ${res.status} ${detail}`);
        }
      },
      { retries: 2 },
    );
  }
}
