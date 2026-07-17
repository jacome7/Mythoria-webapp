jest.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: (handler: unknown) => handler }));
jest.mock('next-intl/middleware', () => ({ __esModule: true, default: () => jest.fn() }));
jest.mock('@/content/landing-pages', () => ({ getLandingPageIntentContext: jest.fn() }));
jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import { NextRequest } from 'next/server';
import { getCanonicalRedirectResponse, getCanonicalRequestRedirect } from './proxy';

describe('proxy canonical redirects', () => {
  it.each([
    ['https://mythoria.pt/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/en-US/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/en-us/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/pt-PT/lp/', 'https://mythoria.pt/pt-PT/lp'],
    [
      'https://mythoria.pt/en-US/blog/fathers-day-2026/?ref=test',
      'https://mythoria.pt/en-US/blog/fathers-day-2026?ref=test',
    ],
    ['http://mythoria.pt/en-US', 'https://mythoria.pt/en-US'],
    ['https://www.mythoria.pt/en-US', 'https://mythoria.pt/en-US'],
  ])('redirects %s once to %s', (source, expected) => {
    const request = new NextRequest(source);
    expect(getCanonicalRequestRedirect(request)?.toString()).toBe(expected);
    const response = getCanonicalRedirectResponse(request);
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(expected);
  });

  it('does not redirect canonical or development origins', () => {
    expect(getCanonicalRequestRedirect(new NextRequest('https://mythoria.pt/en-US'))).toBeNull();
    expect(getCanonicalRequestRedirect(new NextRequest('http://localhost:3000/en-US'))).toBeNull();
  });
});
