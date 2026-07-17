import type { AnalyticsConsent } from '@/db/schema';

export interface MeasurementProtocolEventParams {
  eventName: string;
  clientId: string;
  userId?: string;
  sessionId?: number;
  occurredAt?: Date;
  engagementTimeMsec?: number;
  consent: AnalyticsConsent;
  params: Record<string, unknown>;
}

export interface MeasurementProtocolPayload {
  client_id: string;
  user_id?: string;
  timestamp_micros?: number;
  consent: {
    ad_user_data: 'GRANTED' | 'DENIED';
    ad_personalization: 'GRANTED' | 'DENIED';
  };
  validation_behavior?: 'ENFORCE_RECOMMENDATIONS';
  events: Array<{
    name: string;
    params: Record<string, unknown> & {
      engagement_time_msec: number;
      session_id?: number;
    };
  }>;
}

const toProtocolConsent = (value: 'granted' | 'denied'): 'GRANTED' | 'DENIED' =>
  value === 'granted' ? 'GRANTED' : 'DENIED';

export function buildMeasurementProtocolPayload(
  event: MeasurementProtocolEventParams,
  validate = false,
): MeasurementProtocolPayload | null {
  const clientId = event.clientId.trim();
  if (!clientId || !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(event.eventName)) return null;
  if (
    event.sessionId !== undefined &&
    (!Number.isSafeInteger(event.sessionId) || event.sessionId <= 0)
  ) {
    return null;
  }

  return {
    client_id: clientId,
    ...(event.userId ? { user_id: event.userId } : {}),
    ...(event.occurredAt ? { timestamp_micros: event.occurredAt.getTime() * 1000 } : {}),
    consent: {
      ad_user_data: toProtocolConsent(event.consent.adUserData),
      ad_personalization: toProtocolConsent(event.consent.adPersonalization),
    },
    ...(validate ? { validation_behavior: 'ENFORCE_RECOMMENDATIONS' as const } : {}),
    events: [
      {
        name: event.eventName,
        params: {
          ...event.params,
          ...(event.sessionId ? { session_id: event.sessionId } : {}),
          engagement_time_msec: event.engagementTimeMsec || 100,
        },
      },
    ],
  };
}

interface ValidationResponse {
  validationMessages?: Array<{ description?: string; validationCode?: string }>;
}

async function sendEvent(
  event: MeasurementProtocolEventParams,
  validate: boolean,
): Promise<{ ok: boolean; errors: string[] }> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const apiSecret = process.env.GOOGLE_ANALYTICS_API_SECRET;
  if (!measurementId || !apiSecret) {
    return { ok: false, errors: ['GA4 credentials are missing'] };
  }

  const payload = buildMeasurementProtocolPayload(event, validate);
  if (!payload) return { ok: false, errors: ['Invalid Measurement Protocol payload'] };

  const path = validate ? 'debug/mp/collect' : 'mp/collect';
  const url = `https://region1.google-analytics.com/${path}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false, errors: [`HTTP ${response.status} ${response.statusText}`] };
    }
    if (!validate) return { ok: true, errors: [] };

    const body = (await response.json()) as ValidationResponse;
    const errors = (body.validationMessages || []).map(
      (message) => message.description || message.validationCode || 'Unknown validation error',
    );
    return { ok: errors.length === 0, errors };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

export const ga4Service = {
  sendEvent: (event: MeasurementProtocolEventParams) => sendEvent(event, false),
  validateEvent: (event: MeasurementProtocolEventParams) => sendEvent(event, true),
};
