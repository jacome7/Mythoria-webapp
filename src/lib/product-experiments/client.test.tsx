/**
 * @jest-environment-options {"url":"https://mythoria.pt/pt-PT"}
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { getStoredConsent, CONSENT_UPDATED_EVENT } from '@/lib/consent';
import { ensureAnalyticsAttributionReceipt } from '@/lib/analytics/receipt-client';
import { productExperimentRelease } from './release';
import { useExperimentArm } from './client';
jest.mock('@/lib/consent', () => ({
  getStoredConsent: jest.fn(),
  CONSENT_UPDATED_EVENT: 'consent-updated',
}));
jest.mock('@/lib/analytics/receipt-client', () => ({
  ensureAnalyticsAttributionReceipt: jest.fn(),
}));

const originalFetch = global.fetch;
beforeEach(() => {
  (getStoredConsent as jest.Mock).mockReturnValue({ state: { analytics_storage: 'granted' } });
  (ensureAnalyticsAttributionReceipt as jest.Mock).mockResolvedValue(true);
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ arm: 'treatment' }) });
  productExperimentRelease.baselineReconciledAt = new Date(Date.now() - 1000).toISOString();
  productExperimentRelease.windows = {
    mobile_idea_entry: {
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 100000).toISOString(),
    },
  };
});
afterEach(() => {
  global.fetch = originalFetch;
  productExperimentRelease.baselineReconciledAt = null;
  productExperimentRelease.windows = {};
  jest.clearAllMocks();
});
it('requires current consent and a receipt, then sends only bounded fields and hides treatment on withdrawal', async () => {
  expect(location.origin).toBe('https://mythoria.pt');
  expect(document.visibilityState).toBe('visible');
  (getStoredConsent as jest.Mock).mockReturnValue(null);
  const { result } = renderHook(() => useExperimentArm('mobile_idea_entry'));
  expect(result.current).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
  (getStoredConsent as jest.Mock).mockReturnValue({ state: { analytics_storage: 'granted' } });
  (ensureAnalyticsAttributionReceipt as jest.Mock).mockResolvedValueOnce(false);
  await act(async () => {
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  });
  expect(global.fetch).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  });
  await waitFor(() => expect(result.current).toBe('treatment'));
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/product-experiments',
    expect.objectContaining({
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ action: 'assign', experiment: 'mobile_idea_entry' }),
    }),
  );
  (getStoredConsent as jest.Mock).mockReturnValue(null);
  act(() => {
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  });
  expect(result.current).toBeNull();
});
