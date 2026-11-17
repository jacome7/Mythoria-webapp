import { sanitizeAdContext } from './types';

const CAPTURED_AT = '2026-11-16T10:00:00.000Z';

describe('sanitizeAdContext', () => {
  it('keeps identifiers when advertising consent is granted', () => {
    expect(
      sanitizeAdContext({
        adConsent: 'granted',
        oppref: ' ref-123 ',
        obref: 'browser-1',
        ipAddress: '203.0.113.7',
        userAgent: 'Mozilla/5.0',
        sourceUrl: 'https://mythoria.pt/en-US/buy-credits?oppref=ref-123',
        capturedAt: CAPTURED_AT,
        extra: 'dropped',
      }),
    ).toEqual({
      adConsent: 'granted',
      oppref: 'ref-123',
      obref: 'browser-1',
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0',
      sourceUrl: 'https://mythoria.pt/en-US/buy-credits?oppref=ref-123',
      capturedAt: CAPTURED_AT,
    });
  });

  it('strips every identifier when consent is denied', () => {
    expect(
      sanitizeAdContext({
        adConsent: 'denied',
        oppref: 'ref-123',
        obref: 'browser-1',
        ipAddress: '203.0.113.7',
        userAgent: 'Mozilla/5.0',
        sourceUrl: 'https://mythoria.pt/en-US/buy-credits?utm_source=x&oppref=ref-123',
        capturedAt: CAPTURED_AT,
      }),
    ).toEqual({
      adConsent: 'denied',
      sourceUrl: 'https://mythoria.pt/en-US/buy-credits?utm_source=x',
      capturedAt: CAPTURED_AT,
    });
  });

  it('omits empty, non-string and oversized identifiers', () => {
    expect(
      sanitizeAdContext({
        adConsent: 'granted',
        oppref: 'x'.repeat(513),
        obref: '  ',
        ipAddress: 42,
        sourceUrl: 'https://mythoria.pt/',
        capturedAt: '2026-11-16T10:00:00Z',
      }),
    ).toEqual({
      adConsent: 'granted',
      sourceUrl: 'https://mythoria.pt/',
      capturedAt: CAPTURED_AT,
    });
  });

  it('caps the source URL length', () => {
    const context = sanitizeAdContext({
      adConsent: 'granted',
      sourceUrl: `https://mythoria.pt/?q=${'a'.repeat(3000)}`,
      capturedAt: CAPTURED_AT,
    });
    expect(context?.sourceUrl).toHaveLength(2048);
  });

  it('rejects values that are not a usable context', () => {
    const valid = {
      adConsent: 'denied',
      sourceUrl: 'https://mythoria.pt/',
      capturedAt: CAPTURED_AT,
    };
    expect(sanitizeAdContext(valid)).toEqual(valid);
    expect(sanitizeAdContext(null)).toBeUndefined();
    expect(sanitizeAdContext('granted')).toBeUndefined();
    expect(sanitizeAdContext([valid])).toBeUndefined();
    expect(sanitizeAdContext({ ...valid, adConsent: 'unknown' })).toBeUndefined();
    expect(sanitizeAdContext({ ...valid, sourceUrl: '' })).toBeUndefined();
    expect(sanitizeAdContext({ ...valid, sourceUrl: undefined })).toBeUndefined();
    expect(sanitizeAdContext({ ...valid, capturedAt: 'yesterday-ish' })).toBeUndefined();
    expect(sanitizeAdContext({ ...valid, capturedAt: undefined })).toBeUndefined();
  });
});
