/** @jest-environment node */

import { runGa4DeliveryProbe } from './ga4-delivery-smoke';

it('fails when Measurement Protocol returns 2xx but Realtime never ingests the event', async () => {
  const fetchMock = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('analyticsdata.googleapis.com')) {
      return new Response(JSON.stringify({ rows: [] }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  });

  await expect(
    runGa4DeliveryProbe({
      propertyId: '490896080',
      measurementId: 'G-test',
      apiSecret: 'invalid',
      accessToken: 'token',
      timeoutMs: 1,
      pollMs: 1,
      fetchImpl: fetchMock as typeof fetch,
      sleep: async () => undefined,
    }),
  ).rejects.toThrow('accepted the transport request');
});
