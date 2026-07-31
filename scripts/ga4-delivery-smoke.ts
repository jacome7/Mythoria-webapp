import { GoogleAuth } from 'google-auth-library';

const DEFAULT_PROPERTY_ID = '490896080';
const DEFAULT_MEASUREMENT_ID = 'G-86D0QFW197';
const EVENT_NAME = 'analytics_delivery_probe';

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
            stringFilter: { matchType: 'EXACT', value: EVENT_NAME },
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
  const baseline = await getEventCount(propertyId, accessToken, fetchImpl);
  const sessionId = Math.floor(Date.now() / 1000);
  const clientId = `${Math.floor(Math.random() * 1_000_000_000)}.${sessionId}`;
  const delivery = await fetchImpl(
    `https://region1.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: EVENT_NAME,
            params: { session_id: sessionId, engagement_time_msec: 100 },
          },
        ],
      }),
    },
  );
  if (!delivery.ok) throw new Error(`Measurement Protocol returned HTTP ${delivery.status}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(pollMs);
    if ((await getEventCount(propertyId, accessToken, fetchImpl)) > baseline) return;
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
  const apiSecret = process.env.GOOGLE_ANALYTICS_API_SECRET?.trim();
  if (!apiSecret) throw new Error('GOOGLE_ANALYTICS_API_SECRET is required');
  await runGa4DeliveryProbe({
    propertyId: process.env.GA4_PROPERTY_ID || DEFAULT_PROPERTY_ID,
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID,
    apiSecret,
    accessToken: await getAccessToken(),
  });
  console.log(`GA4 Realtime confirmed ${EVENT_NAME}`);
}

if (process.env.NODE_ENV !== 'test') {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
