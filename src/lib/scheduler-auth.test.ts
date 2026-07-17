import { getSchedulerAudience } from './scheduler-auth';

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    url,
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] || null,
    },
  } as Request;
}

describe('getSchedulerAudience', () => {
  it('uses the public Cloud Run origin from forwarded headers', () => {
    const request = makeRequest('http://0.0.0.0:3000/api/internal/analytics/drain', {
      host: '0.0.0.0:3000',
      'x-forwarded-host': 'mythoria-webapp-803421888801.europe-west9.run.app',
      'x-forwarded-proto': 'https',
    });

    expect(getSchedulerAudience(request)).toBe(
      'https://mythoria-webapp-803421888801.europe-west9.run.app',
    );
  });

  it('falls back to the request origin outside a proxy', () => {
    const request = makeRequest('https://mythoria.pt/api/internal/analytics/drain');

    expect(getSchedulerAudience(request)).toBe('https://mythoria.pt');
  });
});
