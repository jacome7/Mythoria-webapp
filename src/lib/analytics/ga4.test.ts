import {
  buildMeasurementProtocolPayload,
  ga4Service,
  type MeasurementProtocolEventParams,
} from './ga4';

const event: MeasurementProtocolEventParams = {
  eventName: 'purchase',
  clientId: '123456789.1712345678',
  userId: 'user_clerk_1',
  sessionId: 1712345678,
  occurredAt: new Date('2026-07-17T12:00:00.000Z'),
  consent: {
    analyticsStorage: 'granted',
    adUserData: 'denied',
    adPersonalization: 'denied',
  },
  params: {
    transaction_id: 'order-123',
    currency: 'EUR',
    value: 35.85,
    tax: 2.15,
    credits_purchased: 400,
  },
};

describe('GA4 Measurement Protocol delivery', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.GOOGLE_ANALYTICS_API_SECRET = 'test-secret';
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  it('builds a timestamped, consent-aware payload', () => {
    expect(buildMeasurementProtocolPayload(event)).toEqual({
      client_id: event.clientId,
      user_id: event.userId,
      timestamp_micros: 1784289600000000,
      consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
      events: [
        {
          name: 'purchase',
          params: expect.objectContaining({
            transaction_id: 'order-123',
            session_id: 1712345678,
            engagement_time_msec: 100,
          }),
        },
      ],
    });
  });

  it('uses the EU production endpoint', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    await expect(ga4Service.sendEvent(event)).resolves.toEqual({ ok: true, errors: [] });
    expect(jest.mocked(fetch).mock.calls[0][0]).toBe(
      'https://region1.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=test-secret',
    );
  });

  it('uses the debug endpoint and enforces recommendations', async () => {
    jest.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ validationMessages: [] }),
    } as Response);
    await expect(ga4Service.validateEvent(event)).resolves.toEqual({ ok: true, errors: [] });
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(url).toContain('/debug/mp/collect');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      validation_behavior: 'ENFORCE_RECOMMENDATIONS',
    });
  });

  it('rejects malformed identifiers without a request', async () => {
    await expect(ga4Service.sendEvent({ ...event, clientId: ' ' })).resolves.toEqual({
      ok: false,
      errors: ['Invalid Measurement Protocol payload'],
    });
    await expect(ga4Service.sendEvent({ ...event, sessionId: 12.5 })).resolves.toEqual({
      ok: false,
      errors: ['Invalid Measurement Protocol payload'],
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
