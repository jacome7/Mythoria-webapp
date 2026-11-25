const PRODUCTION_ORIGIN = 'https://mythoria.pt';
const PRODUCTION_MEASUREMENT_ID = 'G-86D0QFW197';
export const ANALYTICS_TAG_READY_EVENT = 'mythoria:analytics-tag-ready';

export function analyticsPrivacyPaused(): boolean {
  return (
    process.env.ANALYTICS_PRIVACY_PAUSE === 'true' ||
    (typeof document !== 'undefined' && document.body?.dataset.analyticsPrivacyPaused === 'true')
  );
}

function configuredOrigin(value?: string): string | undefined {
  try {
    const url = new URL(value || '');
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      return undefined;
    }
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Release 1 keeps browser tags out of production. An isolated audit host must use its own GA
 * destination and cannot use the production origin or stream.
 */
export function getAuditBrowserMeasurementId(origin: string): string | undefined {
  if (analyticsPrivacyPaused()) return undefined;
  const auditOrigin = configuredOrigin(process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN);
  const measurementId = process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_MEASUREMENT_ID;
  if (
    auditOrigin &&
    ![PRODUCTION_ORIGIN, 'https://www.mythoria.pt'].includes(auditOrigin) &&
    origin === auditOrigin &&
    measurementId !== PRODUCTION_MEASUREMENT_ID &&
    measurementId &&
    /^G-[A-Z0-9]+$/.test(measurementId)
  ) {
    return measurementId;
  }
  return undefined;
}

export function getServerAnalyticsDestination():
  { measurementId: string; apiSecret: string } | undefined {
  if (analyticsPrivacyPaused()) return undefined;
  const target = process.env.ANALYTICS_DELIVERY_TARGET;
  const origin = configuredOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  if (target === 'production' && origin === PRODUCTION_ORIGIN) {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
    const apiSecret = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim();
    if (measurementId === PRODUCTION_MEASUREMENT_ID && apiSecret)
      return { measurementId, apiSecret };
  }
  if (target === 'audit' && origin) {
    const measurementId = getAuditBrowserMeasurementId(origin);
    const apiSecret = process.env.ANALYTICS_AUDIT_API_SECRET?.trim();
    if (measurementId && apiSecret) return { measurementId, apiSecret };
  }
  return undefined;
}

export function isGaClientId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,20}\.\d{1,20}$/.test(value);
}
