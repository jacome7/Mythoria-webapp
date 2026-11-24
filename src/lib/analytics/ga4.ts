import type { AnalyticsConsent } from '@/db/schema';
import { sanitizeAnalyticsPageUrl } from './page-context';
import { sanitizeAnalyticsEventParams } from './events';
import { getServerAnalyticsDestination, isGaClientId } from './destinations';

export interface MeasurementProtocolEventParams {
  eventName: string;
  clientId: string;
  userId?: string;
  sessionId?: number;
  requireSessionAttribution?: boolean;
  occurredAt?: Date;
  engagementTimeMsec?: number;
  pageLocation?: string;
  pageReferrer?: string;
  consent: AnalyticsConsent;
  params: Record<string, unknown>;
}

export interface MeasurementProtocolPayload {
  client_id: string;
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
  if (!isGaClientId(clientId) || event.consent.analyticsStorage !== 'granted') return null;
  if (
    event.sessionId !== undefined &&
    (!Number.isSafeInteger(event.sessionId) || event.sessionId <= 0)
  ) {
    return null;
  }
  if (event.requireSessionAttribution && !event.sessionId) return null;
  if (!Number.isSafeInteger(event.engagementTimeMsec) || (event.engagementTimeMsec ?? 0) <= 0) {
    return null;
  }
  const pageLocation = sanitizeAnalyticsPageUrl(event.pageLocation);
  const pageReferrer = sanitizeAnalyticsPageUrl(event.pageReferrer);
  const contractedParams = sanitizeAnalyticsEventParams(event.eventName, event.params);
  if (!contractedParams) return null;
  return {
    client_id: clientId,
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
          ...contractedParams,
          ...(pageLocation ? { page_location: pageLocation } : {}),
          ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
          ...(event.sessionId ? { session_id: event.sessionId } : {}),
          engagement_time_msec: event.engagementTimeMsec!,
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
  const destination = getServerAnalyticsDestination();
  if (!destination) return { ok: false, errors: ['GA4 destination is disabled'] };
  const { measurementId, apiSecret } = destination;

  const payload = buildMeasurementProtocolPayload(event, validate);
  if (!payload) return { ok: false, errors: ['Invalid Measurement Protocol payload'] };

  const path = validate ? 'debug/mp/collect' : 'mp/collect';
  const url = `https://region1.google-analytics.com/${path}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(6_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { ok: false, errors: [`HTTP ${response.status} ${response.statusText}`] };
    }
    if (!validate) return { ok: true, errors: [] };

    const body = (await response.json()) as ValidationResponse;
    const errors = (body.validationMessages || []).map(
      (message) => message.validationCode || 'GA4 rejected a field',
    );
    return { ok: errors.length === 0, errors };
  } catch {
    return { ok: false, errors: ['GA4 network request failed'] };
  }
}

export const ga4Service = {
  sendEvent: (event: MeasurementProtocolEventParams) => sendEvent(event, false),
  validateEvent: (event: MeasurementProtocolEventParams) => sendEvent(event, true),
};
