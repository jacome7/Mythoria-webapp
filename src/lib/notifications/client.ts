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

export interface CampaignAttributionRecipient {
  id: string;
  campaignId: string;
  recipientType: 'user' | 'lead';
  recipientId: string;
  email: string;
  language: string;
  clickedAt: string | null;
}

class NotificationClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:3002';
    this.apiKey = process.env.NOTIFICATION_ENGINE_API_KEY || '';
  }

  private async campaignRequest<T>(path: string, init: RequestInit): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          ...(init.headers || {}),
        },
        cache: 'no-store',
      });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch (error) {
      console.error('[EmailCampaignAttribution] Notification Engine request failed:', error);
      return null;
    }
  }

  async recordCampaignOpen(recipientRecordId: string): Promise<void> {
    await this.campaignRequest(`/internal/campaigns/recipients/${recipientRecordId}/open`, {
      method: 'POST',
      body: '{}',
    });
  }

  async recordCampaignClick(
    recipientRecordId: string,
    linkId: string,
  ): Promise<CampaignAttributionRecipient | null> {
    const result = await this.campaignRequest<{
      recipient: CampaignAttributionRecipient | null;
    }>(`/internal/campaigns/recipients/${recipientRecordId}/click`, {
      method: 'POST',
      body: JSON.stringify({ linkId }),
    });
    return result?.recipient ?? null;
  }

  async resolveCampaignAttribution(
    recipientRecordId: string,
  ): Promise<CampaignAttributionRecipient | null> {
    const result = await this.campaignRequest<{
      recipient: CampaignAttributionRecipient | null;
    }>(`/internal/campaigns/recipients/${recipientRecordId}/attribution`, {
      method: 'GET',
    });
    return result?.recipient ?? null;
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
    source?: string; // e.g. 'voucher', 'stripe'
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
