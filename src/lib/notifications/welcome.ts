// Deprecated: welcome notification sending has been removed. This module is kept as a stub to avoid import errors.
// Any usage should be deleted. Calling this will throw.

export interface SendWelcomeOptions {
  email: string;
  name: string;
  language?: string;
  source?: string;
  authorId?: string;
  storyId?: string;
}

export async function sendWelcomeNotification(_opts: SendWelcomeOptions): Promise<void> {
  throw new Error('sendWelcomeNotification has been removed. Implemented now in notification-engine. Remove this call.');
}
