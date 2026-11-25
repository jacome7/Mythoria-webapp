'use client';

import { getStoredConsent } from '@/lib/consent';
import { analyticsPrivacyPaused } from './destinations';

let pending: Promise<boolean> | undefined;
let readyUntil = 0;

function canCaptureReceipt() {
  return !analyticsPrivacyPaused() && getStoredConsent()?.state.analytics_storage === 'granted';
}

export function clearAnalyticsAttributionReceipt(): void {
  readyUntil = 0;
}

export function ensureAnalyticsAttributionReceipt(): Promise<boolean> {
  if (!canCaptureReceipt()) return Promise.resolve(false);
  if (readyUntil > Date.now()) return Promise.resolve(true);
  if (pending) return pending;
  return captureAnalyticsAttribution({});
}

export async function captureAnalyticsAttribution(
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (pending) await pending;
  if (!canCaptureReceipt()) return false;

  const request = fetch('/api/analytics/attribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(async (response) => {
      const result = (await response.json()) as { captured?: boolean };
      if (!response.ok || !result.captured) return false;
      if (getStoredConsent()?.state.analytics_storage !== 'granted') {
        // An already-started response can set an HttpOnly cookie after withdrawal.
        await fetch('/api/analytics/attribution/revoke', { method: 'POST', keepalive: true });
        return false;
      }
      readyUntil = Date.now() + 60_000;
      return true;
    })
    .catch(() => false);
  pending = request;
  try {
    return await request;
  } finally {
    if (pending === request) pending = undefined;
  }
}
