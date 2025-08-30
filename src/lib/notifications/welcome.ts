import { pricingService } from '@/db/services';
import { notificationFetch } from '@/lib/notification-client';

export interface SendWelcomeOptions {
  email: string;
  name: string;
  /** Override language if needed; otherwise it is detected. */
  language?: string;
  /** Optional source metadata tag (defaults to 'user_signup' or 'manual_test'). */
  source?: string;
  /** Optional author identifier (enables idempotency / scoping on notification engine). */
  authorId?: string;
  /** Optional story identifier for story-scoped templates (not typically used for welcome). */
  storyId?: string;
}

/**
 * Send welcome notification through Notification Engine using the email template API.
 * Throws on hard failures (HTTP !ok). Silent no-op if NOTIFICATION_ENGINE_URL is missing.
 */
export async function sendWelcomeNotification(opts: SendWelcomeOptions): Promise<void> {
  const { email, name, source, authorId, storyId } = opts;
  const notificationEngineUrl = process.env.NOTIFICATION_ENGINE_URL;

  if (!notificationEngineUrl) {
    console.warn('[welcome] NOTIFICATION_ENGINE_URL not configured, skipping welcome notification');
    throw new Error(`NOTIFICATION_ENGINE_URL not configured!`);
  }

  try {
    const storyCredits = await pricingService.getInitialAuthorCredits();
    const language = opts.language || 'en-US';

  const notificationPayload: Record<string, any> = {
      templateId: 'welcome',
      recipients: [
        {
          email,
          name,
          language,
        },
      ],
      variables: {
        name,
        storyCredits,
        currentDate: new Date().toISOString(),
      },
      priority: 'normal',
      metadata: {
        source: source || 'user_signup',
        userEmail: email,
      },
    };

  // Conditionally include entity identifiers per updated API contract
  if (authorId) notificationPayload.authorId = authorId;
  if (storyId) notificationPayload.storyId = storyId;

    console.log('[welcome] Sending welcome notification', { email, language, storyCredits, source: notificationPayload.metadata.source });
    const response = await notificationFetch(`${notificationEngineUrl}/email/template`, {
      method: 'POST',
      body: JSON.stringify(notificationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notification API responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[welcome] Welcome notification sent successfully', { email, result });
  } catch (error) {
    console.error('[welcome] Error sending welcome notification', { email, error });
    throw error;
  }
}
