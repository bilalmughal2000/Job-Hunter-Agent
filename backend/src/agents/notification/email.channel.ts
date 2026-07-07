import { NotificationChannel } from '@ajh/shared';
import type { NotificationChannelSender, NotificationMessage, Recipient } from './types.js';

export interface EmailConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  from?: string;
}

/**
 * Email channel via Nodemailer (any free SMTP — e.g. a Gmail app password).
 * The transport is created lazily on first send so the dependency and any
 * connection only load when email is actually configured + used.
 */
export class EmailChannel implements NotificationChannelSender {
  readonly channel = NotificationChannel.EMAIL;

  constructor(private readonly config: EmailConfig) {}

  isConfigured(): boolean {
    return !!this.config.host && !!this.config.user && !!this.config.password;
  }

  async send(message: NotificationMessage, recipient: Recipient): Promise<void> {
    if (!this.isConfigured()) throw new Error('Email not configured (host/user/password missing)');
    if (!recipient.email) throw new Error('No recipient email address');

    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port ?? 587,
      secure: (this.config.port ?? 587) === 465,
      auth: { user: this.config.user, pass: this.config.password },
    });
    await transport.sendMail({
      from: this.config.from ?? this.config.user,
      to: recipient.email,
      subject: message.subject,
      text: message.body,
    });
  }
}
