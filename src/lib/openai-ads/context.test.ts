/** @jest-environment node */
const mockLimit = jest.fn();
const mockWhere = jest.fn();
jest.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => {
          mockWhere(...args);
          return { orderBy: () => ({ limit: mockLimit }) };
        },
      }),
    }),
  },
}));

import {
  clientIpAddress,
  readAdvertisingConsent,
  resolveAdContext,
  resolveAdContextSafely,
} from './context';

const now = new Date('2026-11-16T10:00:00.000Z');

function consentCookie(advertising: boolean, encoded = true): string {
  const value = JSON.stringify({
    version: 3,
    state: {
      ad_storage: advertising ? 'granted' : 'denied',
      ad_user_data: advertising ? 'granted' : 'denied',
      ad_personalization: advertising ? 'granted' : 'denied',
      analytics_storage: 'granted',
    },
    preferences: { analytics: true, advertising },
    timestamp: 1,
  });
  return encoded ? encodeURIComponent(value) : value;
}

function cookieJar(values: Record<string, string>) {
  return {
    get: (name: string) => (name in values ? { value: values[name] } : undefined),
  };
}

describe('readAdvertisingConsent', () => {
  it('is granted from preferences.advertising or state.ad_user_data', () => {
    expect(readAdvertisingConsent(consentCookie(true))).toBe('granted');
    expect(readAdvertisingConsent(consentCookie(true, false))).toBe('granted');
    expect(readAdvertisingConsent(JSON.stringify({ state: { ad_user_data: 'granted' } }))).toBe(
      'granted',
    );
    expect(readAdvertisingConsent(JSON.stringify({ preferences: { advertising: true } }))).toBe(
      'granted',
    );
  });

  it('is denied when missing, malformed or not granted (independent of analytics)', () => {
    expect(readAdvertisingConsent(undefined)).toBe('denied');
    expect(readAdvertisingConsent('')).toBe('denied');
    expect(readAdvertisingConsent('not-json')).toBe('denied');
    expect(readAdvertisingConsent('null')).toBe('denied');
    expect(readAdvertisingConsent(consentCookie(false))).toBe('denied');
  });
});

describe('clientIpAddress', () => {
  it('uses the first valid x-forwarded-for hop, then x-real-ip', () => {
    expect(clientIpAddress(new Headers({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1' }))).toBe(
      '203.0.113.7',
    );
    expect(clientIpAddress(new Headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(
      clientIpAddress(new Headers({ 'x-forwarded-for': 'garbage', 'x-real-ip': '198.51.100.2' })),
    ).toBe('198.51.100.2');
    expect(clientIpAddress(new Headers({ 'x-real-ip': 'nope' }))).toBeUndefined();
  });
});

describe('resolveAdContext', () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockReset();
  });

  const grantedHeaders = new Headers({
    'x-forwarded-for': '203.0.113.7, 10.0.0.1',
    'user-agent': 'Mozilla/5.0 Test',
    referer: 'https://mythoria.pt/en-US/tell-your-story/step-2?oppref=abc&utm_source=x',
  });

  it('captures identifiers from cookies and headers when advertising is granted', async () => {
    const context = await resolveAdContext({
      headers: grantedHeaders,
      cookies: cookieJar({
        mythoria_consent: consentCookie(true),
        __oppref: 'opp-123',
        __obref: 'ob-456',
      }),
      authorId: 'author-1',
      now,
    });
    expect(context).toEqual({
      adConsent: 'granted',
      oppref: 'opp-123',
      obref: 'ob-456',
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0 Test',
      sourceUrl: 'https://mythoria.pt/en-US/tell-your-story/step-2',
      capturedAt: now.toISOString(),
    });
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('falls back to the stored 30-day oppref for the author when the cookie is missing', async () => {
    mockLimit.mockResolvedValue([{ oppref: 'stored-opp', obref: 'stored-ob' }]);
    const context = await resolveAdContext({
      headers: new Headers(),
      cookies: cookieJar({ mythoria_consent: consentCookie(true) }),
      authorId: 'author-1',
      now,
    });
    expect(context).toMatchObject({
      adConsent: 'granted',
      oppref: 'stored-opp',
      obref: 'stored-ob',
      sourceUrl: 'https://mythoria.pt',
    });
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it('keeps a cookie obref over a stored one and survives a failed lookup', async () => {
    mockLimit.mockRejectedValue(new Error('db down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const context = await resolveAdContext({
      headers: new Headers(),
      cookies: cookieJar({ mythoria_consent: consentCookie(true), __obref: 'ob-cookie' }),
      authorId: 'author-1',
      now,
    });
    expect(context).toEqual({
      adConsent: 'granted',
      obref: 'ob-cookie',
      sourceUrl: 'https://mythoria.pt',
      capturedAt: now.toISOString(),
    });
    warn.mockRestore();
  });

  it('carries no identifiers when advertising is denied', async () => {
    const context = await resolveAdContext({
      headers: grantedHeaders,
      cookies: cookieJar({
        mythoria_consent: consentCookie(false),
        __oppref: 'opp-123',
        __obref: 'ob-456',
      }),
      authorId: 'author-1',
      now,
    });
    expect(context).toEqual({
      adConsent: 'denied',
      sourceUrl: 'https://mythoria.pt/en-US/tell-your-story/step-2',
      capturedAt: now.toISOString(),
    });
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('prefers an explicit source URL, redacts ids and rejects foreign origins', async () => {
    const explicit = await resolveAdContext({
      headers: grantedHeaders,
      cookies: cookieJar({}),
      sourceUrl: '/en-US/stories/00000000-0000-4000-8000-000000000001?x=1',
      now,
    });
    expect(explicit.sourceUrl).toBe('https://mythoria.pt/en-US/stories/:id');

    const foreign = await resolveAdContext({
      headers: new Headers({ referer: 'https://evil.example/en-US/pricing' }),
      cookies: cookieJar({}),
      now,
    });
    expect(foreign.sourceUrl).toBe('https://mythoria.pt');
  });

  it('resolveAdContextSafely falls back to a denied context when capture throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const context = await resolveAdContextSafely({
      headers: new Headers(),
      cookies: {
        get: () => {
          throw new Error('boom');
        },
      },
      now,
    });
    expect(context).toEqual({
      adConsent: 'denied',
      sourceUrl: 'https://mythoria.pt',
      capturedAt: now.toISOString(),
    });
    warn.mockRestore();
  });
});
