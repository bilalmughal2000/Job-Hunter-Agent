import { NotificationChannel } from '@ajh/shared';
import type { NotificationChannelSender, NotificationMessage, Recipient } from './types.js';

/**
 * In-app channel: always "configured". Delivery is just persistence (handled by
 * the service), so this send is a no-op — it guarantees every notification is
 * recorded and visible in the app even with no external channels set up.
 */
export class InAppChannel implements NotificationChannelSender {
  readonly channel = NotificationChannel.IN_APP;

  isConfigured(): boolean {
    return true;
  }

  send(_message: NotificationMessage, _recipient: Recipient): Promise<void> {
    return Promise.resolve();
  }
}
