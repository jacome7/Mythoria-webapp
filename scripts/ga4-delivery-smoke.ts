import { randomBytes } from 'node:crypto';
import { getServerAnalyticsDestination } from '../src/lib/analytics/destinations';
import { GoogleAuth } from 'google-auth-library';

const PRODUCTION_PROPERTY_ID = '490896080';

interface ProbeOptions {
  propertyId: string;
  measurementId: string;
  apiSecret: string;
  accessToken: string;
  timeoutMs?: number;
  pollMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

async function getEventCount(
  propertyId: string,
  eventName: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<number> {
  const response = await fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: eventName },
          },
        },
        limit: 1,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`GA4 Realtime Data API returned HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };
  return Number(body.rows?.[0]?.metricValues?.[0]?.value || 0);
}

export async function runGa4DeliveryProbe({
  propertyId,
  measurementId,
  apiSecret,
  accessToken,
  timeoutMs = 120_000,
  pollMs = 5_000,
  fetchImpl = fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: ProbeOptions): Promise<void> {
  if (propertyId === PRODUCTION_PROPERTY_ID || measurementId === 'G-86D0QFW197') {
    throw new Error('The smoke probe requires the isolated audit property and stream');
  }
  const eventName = `analytics_delivery_probe_${randomBytes(6).toString('hex')}`;
  // A unique event name correlates transport and Realtime without a custom dimension.
  await getEventCount(propertyId, eventName, accessToken, fetchImpl);
  const sessionId = Math.floor(Date.now() / 1000);
  const clientId = `${Math.floor(Math.random() * 1_000_000_000)}.${sessionId}`;
  const url = (path: string) =>
    `https://region1.google-analytics.com/${path}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const send = (path: string, validate = false) =>
    fetchImpl(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        client_id: clientId,
        ...(validate ? { validation_behavior: 'ENFORCE_RECOMMENDATIONS' } : {}),
        events: [{ name: eventName, params: { session_id: sessionId, engagement_time_msec: 100 } }],
      }),
    });
  const validation = await send('debug/mp/collect', true);
  if (!validation.ok)
    throw new Error(`Measurement Protocol validation returned HTTP ${validation.status}`);
  const validated = (await validation.json()) as { validationMessages?: unknown[] };
  if (validated.validationMessages?.length)
    throw new Error('Measurement Protocol rejected the probe schema');
  const delivery = await send('mp/collect');
  if (!delivery.ok) throw new Error(`Measurement Protocol returned HTTP ${delivery.status}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    if ((await getEventCount(propertyId, eventName, accessToken, fetchImpl)) > 0) return;
  }
  throw new Error(
    'GA4 accepted the transport request but the probe was not confirmed by Realtime Data API',
  );
}

async function getAccessToken(): Promise<string> {
  if (process.env.GA4_ACCESS_TOKEN) return process.env.GA4_ACCESS_TOKEN;
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Unable to obtain a GA4 Data API access token');
  return token;
}

async function main(): Promise<void> {
  const propertyId = process.env.GA4_AUDIT_PROPERTY_ID?.trim();
  const destination = getServerAnalyticsDestination();
  if (
    process.env.ANALYTICS_DELIVERY_TARGET !== 'audit' ||
    !propertyId ||
    propertyId === PRODUCTION_PROPERTY_ID ||
    !destination
  )
    throw new Error('Configure the isolated audit property and stream before running the probe');
  await runGa4DeliveryProbe({ ...destination, propertyId, accessToken: await getAccessToken() });
  console.log('Audit GA4 Realtime confirmed the synthetic delivery probe');
}

if (process.env.NODE_ENV !== 'test') {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
