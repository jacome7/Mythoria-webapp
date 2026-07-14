import {
  buildMeasurementProtocolPurchasePayload,
  ga4Service,
  type MeasurementProtocolPurchaseParams,
} from './ga4';

const purchase: MeasurementProtocolPurchaseParams = {
  client_id: '123456789.1712345678',
  user_id: 'user_clerk_1',
  session_id: 1712345678,
  consent: {
    adUserData: 'denied',
    adPersonalization: 'denied',
  },
  transaction_id: 'order-123',
  currency: 'EUR',
  value: 35.85,
  gross_value: 38,
  tax: 2.15,
  credits_purchased: 400,
  payment_type: 'card',
  items: [
    {
      item_id: 'credit_package_starter',
      item_name: '100 Mythoria Credits',
      item_brand: 'Mythoria',
      item_category: 'Credits',
      price: 9.435,
      gross_unit_price: 10,
      quantity: 2,
    },
  ],
};

describe('GA4 Measurement Protocol purchase delivery', () => {
  const previousMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const previousSecret = process.env.GOOGLE_ANALYTICS_API_SECRET;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.GOOGLE_ANALYTICS_API_SECRET = 'test-secret';
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  afterAll(() => {
    if (previousMeasurementId === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previousMeasurementId;

    if (previousSecret === undefined) delete process.env.GOOGLE_ANALYTICS_API_SECRET;
    else process.env.GOOGLE_ANALYTICS_API_SECRET = previousSecret;
  });

  it('builds the full purchase with canonical user, numeric session, and explicit ad consent', () => {
    expect(buildMeasurementProtocolPurchasePayload(purchase)).toEqual({
      client_id: '123456789.1712345678',
      user_id: 'user_clerk_1',
      consent: {
        ad_user_data: 'DENIED',
        ad_personalization: 'DENIED',
      },
      events: [
        {
          name: 'purchase',
          params: expect.objectContaining({
            transaction_id: 'order-123',
            value: 35.85,
            gross_value: 38,
            tax: 2.15,
            session_id: 1712345678,
            engagement_time_msec: 100,
            items: purchase.items,
          }),
        },
      ],
    });
  });

  it('uses the EU endpoint and JSON content type', async () => {
    const fetchMock = jest.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true } as Response);

    await expect(ga4Service.sendPurchaseEvent(purchase)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://region1.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=test-secret',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toEqual(
      expect.objectContaining({ client_id: purchase.client_id, user_id: 'user_clerk_1' }),
    );
  });

  it('does not fabricate a client ID or accept a malformed session ID', async () => {
    const fetchMock = jest.mocked(fetch);

    await expect(ga4Service.sendPurchaseEvent({ ...purchase, client_id: ' ' })).resolves.toBe(
      false,
    );
    await expect(ga4Service.sendPurchaseEvent({ ...purchase, session_id: 12.5 })).resolves.toBe(
      false,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false rather than breaking order completion on network failure', async () => {
    jest.mocked(fetch).mockRejectedValue(new Error('network unavailable'));

    await expect(ga4Service.sendPurchaseEvent(purchase)).resolves.toBe(false);
  });
});
