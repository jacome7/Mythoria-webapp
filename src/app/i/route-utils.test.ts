import { NextRequest } from 'next/server';
import { buildLegacyIntentResponse, detectLegacyIntentLocale } from './route-utils';

describe('legacy intent compatibility route', () => {
  it('uses validated explicit locale before cookie and browser language', () => {
    const request = new NextRequest('https://mythoria.pt/i/romance?locale=pt-pt', {
      headers: {
        cookie: 'NEXT_LOCALE=de-DE',
        'accept-language': 'fr-FR,fr;q=0.9',
      },
    });
    expect(detectLegacyIntentLocale(request)).toBe('pt-PT');
  });

  it('falls back through NEXT_LOCALE, Accept-Language and the default', () => {
    expect(
      detectLegacyIntentLocale(
        new NextRequest('https://mythoria.pt/i/romance', {
          headers: { cookie: 'NEXT_LOCALE=es-ES', 'accept-language': 'fr-FR' },
        }),
      ),
    ).toBe('es-ES');
    expect(
      detectLegacyIntentLocale(
        new NextRequest('https://mythoria.pt/i/romance', {
          headers: { 'accept-language': 'pt,en;q=0.8' },
        }),
      ),
    ).toBe('pt-PT');
    expect(detectLegacyIntentLocale(new NextRequest('https://mythoria.pt/i/romance'))).toBe(
      'en-US',
    );
  });

  it('returns one 308 with locale, valid intent and safe attribution only', () => {
    const response = buildLegacyIntentResponse(
      new NextRequest(
        'http://0.0.0.0:3000/i/romance?locale=pt-PT&utm_source=google&gclid=click-1&email=private%40example.com&state=secret',
      ),
      'Romance',
    );
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://mythoria.pt/pt-PT?utm_source=google&gclid=click-1&intent=romance',
    );
    expect(response.headers.get('set-cookie')).toContain('mythoria_intent_context=');
  });

  it('does not persist or forward an invalid intent', () => {
    const response = buildLegacyIntentResponse(
      new NextRequest('https://mythoria.pt/i/not-real?utm_campaign=test'),
      'not-real',
    );
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://mythoria.pt/en-US?utm_campaign=test');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
