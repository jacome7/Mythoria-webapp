jest.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: (handler: unknown) => handler }));
jest.mock('next-intl/middleware', () => ({ __esModule: true, default: () => jest.fn() }));
jest.mock('@/content/landing-pages', () => ({
  getLandingPageIntentContext: jest.fn(),
  getLandingPageBySlug: (slug: string) =>
    slug === 'livro-personalizado-para-casais'
      ? { locale: 'pt-PT', slug }
      : slug === 'historias-de-apoio'
        ? { locale: 'pt-PT', slug }
        : undefined,
}));
jest.mock('@/lib/public-seo-resolver', () => ({
  resolveDynamicPublicSeoPath: jest.fn().mockResolvedValue({ type: 'unmatched' }),
}));
jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
    defaultLocale: 'en-US',
  },
}));

import { NextRequest } from 'next/server';
import {
  getCanonicalRedirectResponse,
  getCanonicalRequestRedirect,
  getPublicSeoResponse,
} from './proxy';

describe('proxy canonical redirects', () => {
  it.each([
    ['https://mythoria.pt/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/aboutUs', 'https://mythoria.pt/en-US/aboutUs'],
    ['https://mythoria.pt/en-US/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/en-us/', 'https://mythoria.pt/en-US'],
    ['https://mythoria.pt/pt-PT/lp/', 'https://mythoria.pt/pt-PT/lp'],
    [
      'https://mythoria.pt/lp/livro-personalizado-para-casais?utm_source=partner',
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais?utm_source=partner',
    ],
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

  it('compares forwarded public and run.app requests against their external URL', () => {
    const publicRequest = new NextRequest('http://localhost:3000/api/health', {
      headers: {
        host: 'localhost:3000',
        'x-forwarded-host': 'mythoria.pt',
        'x-forwarded-proto': 'https',
      },
    });
    const runAppRequest = new NextRequest('http://localhost:3000/api/health', {
      headers: {
        host: 'localhost:3000',
        'x-forwarded-host': 'mythoria-webapp.example.a.run.app',
        'x-forwarded-proto': 'https',
      },
    });

    expect(getCanonicalRequestRedirect(publicRequest)).toBeNull();
    expect(getCanonicalRequestRedirect(runAppRequest)).toBeNull();
  });

  it.each([
    [
      'https://www.mythoria.pt//lp/livro-personalizado-para-casais/?utm_source=partner&email=private%40example.com&code=secret',
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais?utm_source=partner',
    ],
    [
      'http://mythoria.pt/en-us/?intent=Romance&gclid=click-1&state=secret',
      'https://mythoria.pt/en-US?gclid=click-1&intent=romance',
    ],
    [
      'https://mythoria.pt/guias/como-criar-uma-historia-de-apoio-para-uma-mudanca?utm_campaign=support',
      'https://mythoria.pt/pt-PT/guias/como-criar-uma-historia-de-apoio-para-uma-mudanca?utm_campaign=support',
    ],
    [
      'https://mythoria.pt/sample-books/duas-chavenas-uma-vida?ref=guide',
      'https://mythoria.pt/pt-PT/sample-books/duas-chavenas-uma-vida?ref=guide',
    ],
  ])('returns one sanitized 308 from %s to %s', async (source, expected) => {
    const response = await getPublicSeoResponse(new NextRequest(source));
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(expected);
    expect(await getPublicSeoResponse(new NextRequest(expected))).toBeNull();
  });

  it('returns 404 for a missing public landing entity', async () => {
    const response = await getPublicSeoResponse(
      new NextRequest('https://mythoria.pt/lp/not-a-real-page'),
    );
    expect(response?.status).toBe(404);
  });
});
