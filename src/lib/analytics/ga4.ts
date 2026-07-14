import type { AnalyticsConsentStatus, GA4PurchasePayload } from './ecommerce';

export interface MeasurementProtocolPurchaseParams extends GA4PurchasePayload {
  client_id: string;
  user_id?: string;
  session_id?: number;
  engagement_time_msec?: number;
  consent: {
    adUserData: AnalyticsConsentStatus;
    adPersonalization: AnalyticsConsentStatus;
  };
}

export interface MeasurementProtocolPayload {
  client_id: string;
  user_id?: string;
  consent: {
    ad_user_data: 'GRANTED' | 'DENIED';
    ad_personalization: 'GRANTED' | 'DENIED';
  };
  events: Array<{
    name: 'purchase';
    params: GA4PurchasePayload & {
      engagement_time_msec: number;
      session_id?: number;
    };
  }>;
}

const toMeasurementProtocolConsent = (value: AnalyticsConsentStatus): 'GRANTED' | 'DENIED' =>
  value === 'granted' ? 'GRANTED' : 'DENIED';

export function buildMeasurementProtocolPurchasePayload(
  params: MeasurementProtocolPurchaseParams,
): MeasurementProtocolPayload | null {
  const clientId = params.client_id.trim();
  if (!clientId) return null;

  if (
    params.session_id !== undefined &&
    (!Number.isSafeInteger(params.session_id) || params.session_id <= 0)
  ) {
    return null;
  }

  const {
    client_id: _clientId,
    user_id: userId,
    session_id: sessionId,
    engagement_time_msec: engagementTime,
    consent,
    ...purchase
  } = params;

  return {
    client_id: clientId,
    ...(userId ? { user_id: userId } : {}),
    consent: {
      ad_user_data: toMeasurementProtocolConsent(consent.adUserData),
      ad_personalization: toMeasurementProtocolConsent(consent.adPersonalization),
    },
    events: [
      {
        name: 'purchase',
        params: {
          ...purchase,
          ...(sessionId ? { session_id: sessionId } : {}),
          engagement_time_msec: engagementTime || 100,
        },
      },
    ],
  };
}

export const ga4Service = {
  async sendPurchaseEvent(params: MeasurementProtocolPurchaseParams): Promise<boolean> {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const apiSecret = process.env.GOOGLE_ANALYTICS_API_SECRET;

    if (!measurementId || !apiSecret) {
      console.warn('GA4 credentials missing, skipping server-side event');
      return false;
    }

    const payload = buildMeasurementProtocolPurchasePayload(params);
    if (!payload) {
      console.warn('GA4 purchase requires a genuine client ID and a numeric session ID');
      return false;
    }

    try {
      const url = `https://region1.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`GA4 event failed: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending GA4 event:', error);
      return false;
    }
  },
};
