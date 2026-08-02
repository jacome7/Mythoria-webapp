/** @jest-environment node */

import { runGa4DeliveryProbe } from './ga4-delivery-smoke';

const baseOptions = {
  propertyId: '490896080',
  measurementId: 'G-test',
  apiSecret: 'secret',
  accessToken: 'token',
  timeoutMs: 10,
  pollMs: 1,
  sleep: async () => undefined,
};

it('passes only after Realtime reports a new ingested probe', async () => {
  let realtimeCalls = 0;
  const fetchMock = jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('analyticsdata.googleapis.com')) {
      realtimeCalls += 1;
      const count = realtimeCalls >= 2 ? '1' : '0';
      return new Response(JSON.stringify({ rows: [{ metricValues: [{ value: count }] }] }), {
        status: 200,
      });
    }
    return new Response(null, { status: 204 });
  });

  await expect(
    runGa4DeliveryProbe({
      ...baseOptions,
      fetchImpl: fetchMock as typeof fetch,
    }),
  ).resolves.toBeUndefined();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/mp/collect?measurement_id=G-test&api_secret=secret'),
    expect.objectContaining({ method: 'POST' }),
  );
});

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
      ...baseOptions,
      apiSecret: 'invalid',
      timeoutMs: 1,
      fetchImpl: fetchMock as typeof fetch,
    }),
  ).rejects.toThrow('accepted the transport request');
});

it('fails immediately when the Realtime verifier cannot read the property', async () => {
  const fetchMock = jest.fn(async () => new Response(null, { status: 403 }));

  await expect(
    runGa4DeliveryProbe({
      ...baseOptions,
      fetchImpl: fetchMock as typeof fetch,
    }),
  ).rejects.toThrow('GA4 Realtime Data API returned HTTP 403');
});
