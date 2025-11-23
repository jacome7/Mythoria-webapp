export interface NotificationPayload {
  recipients: string[];
  template: string;
  variables: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class NotificationClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3002';
    this.apiKey = process.env.NOTIFICATION_ENGINE_API_KEY || '';
  }

  /**
   * Send email notification through the notification engine
   */
  async sendEmail(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          correlationId: `webapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          data: {
            correlationId: `webapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            recipients: payload.recipients,
            template: payload.template,
            type: 'email',
            variables: payload.variables,
            priority: payload.priority || 'normal',
            metadata: payload.metadata,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Notification engine error:', errorText);
        return {
          success: false,
          error: `Notification engine returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.messageId || result.correlationId,
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a templated email via /email/template endpoint
   */
  async sendTemplatedEmail(args: {
    templateId: string;
    recipients: { email: string; name?: string; language?: string }[];
    variables?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, unknown>;
    authorId?: string;
    entityId?: string;
  }): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/email/template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          templateId: args.templateId,
          recipients: args.recipients.map((r) => ({
            email: r.email,
            ...(r.name ? { name: r.name } : {}),
            ...(r.language ? { language: r.language } : {}),
          })),
          ...(args.variables ? { variables: args.variables } : {}),
          ...(args.priority ? { priority: args.priority } : {}),
          ...(args.metadata ? { metadata: args.metadata } : {}),
          ...(args.authorId ? { authorId: args.authorId } : {}),
          ...(args.entityId ? { entityId: args.entityId } : {}),
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Template send failed ${response.status}: ${errorText}` };
      }
      const json = await response.json();
      return { success: true, messageId: (json as { data?: { id?: string } }).data?.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  /**
   * Send credits added notification
   */
  async sendCreditsAddedNotification(params: {
    email: string;
    name: string;
    credits: number;
    preferredLocale?: string | null;
    authorId?: string;
    source?: string; // e.g. 'voucher', 'mbway', 'revolut'
    entityId?: string;
  }): Promise<NotificationResponse> {
    const language = this.mapLocale(params.preferredLocale);
    return this.sendTemplatedEmail({
      templateId: 'credits-added',
      recipients: [{ email: params.email, name: params.name, language }],
      variables: {
        name: params.name,
        credits: params.credits,
      },
      priority: 'normal',
      metadata: {
        notificationType: 'credits-added',
        creditEventType: 'credit_added',
        source: params.source,
      },
      authorId: params.authorId,
      entityId: params.entityId,
    });
  }

  private mapLocale(locale?: string | null): string {
    if (!locale) return 'en-US';
    const lower = locale.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-PT';
    if (lower.startsWith('es')) return 'es-ES';
    if (lower.startsWith('fr')) return 'fr-FR';
    if (lower.startsWith('de')) return 'de-DE';
    return 'en-US';
  }
}

export const notificationClient = new NotificationClient();
