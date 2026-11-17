jest.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: (handler: unknown) => handler }));
jest.mock('next-intl/middleware', () => ({ __esModule: true, default: () => jest.fn() }));
jest.mock('@/content/landing-pages', () => ({
  getLandingPageIntentContext: jest.fn(),
  getLandingPage: (locale: string, slug: string) =>
    locale === 'pt-PT' && ['livro-personalizado-para-casais', 'historias-de-apoio'].includes(slug)
      ? { locale, slug }
      : undefined,
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

import { NextRequest, NextResponse } from 'next/server';
import { getLandingPageIntentContext } from '@/content/landing-pages';
import { parseIntentContext } from '@/lib/campaign-context';
import { INTENT_CONTEXT_COOKIE } from '@/types/intent-context';
import {
  applyPublicContextCookies,
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

  it('redirects the retired dashboard and directly rejects malformed story placeholders', async () => {
    const dashboard = await getPublicSeoResponse(
      new NextRequest('https://mythoria.pt/pt-PT/dashboard'),
    );
    expect(dashboard?.status).toBe(308);
    expect(dashboard?.headers.get('location')).toBe('https://mythoria.pt/pt-PT/my-stories');

    const malformedStory = await getPublicSeoResponse(
      new NextRequest('https://mythoria.pt/undefined/p/undefined'),
    );
    expect(malformedStory?.status).toBe(404);
  });
});

describe('campaign intent cookie', () => {
  function applyCookie(path: string, headers?: HeadersInit) {
    const request = new NextRequest(`https://mythoria.pt${path}`, { headers });
    const response = applyPublicContextCookies(request, NextResponse.next());
    return parseIntentContext(response.cookies.get(INTENT_CONTEXT_COOKIE)?.value);
  }

  it('preserves the recipient when an explicit homepage intent changes', () => {
    const existing = encodeURIComponent('{"intent":"romance","recipient":"child"}');
    const headers = { cookie: `${INTENT_CONTEXT_COOKIE}=${existing}` };
    expect(applyCookie('/pt-PT?intent=Christmas', headers)).toEqual({
      intent: 'christmas',
      recipient: 'child',
    });
    expect(applyCookie('/pt-PT?intent=kids', headers)).toEqual({
      intent: 'kids',
      recipient: 'child',
    });
    expect(applyCookie('/pt-PT?intent=unknown', headers)).toBeNull();
    expect(applyCookie('/pt-PT', headers)).toBeNull();
  });

  it('lets explicit intent override the intent of a localized landing page', () => {
    jest.mocked(getLandingPageIntentContext).mockReturnValue({
      intent: 'romance',
    });
    const path = '/pt-PT/lp/livro-personalizado-para-casais';
    expect(applyCookie(path)).toEqual({ intent: 'romance' });
    expect(applyCookie(`${path}?intent=unknown`)).toEqual({ intent: 'romance' });
    expect(applyCookie(`${path}?intent=christmas`)).toEqual({ intent: 'christmas' });
    expect(applyCookie(path, { 'next-router-prefetch': '1' })).toBeNull();
  });

  it('leaves other route query parameters scoped to their own pages', () => {
    expect(applyCookie('/de-DE/aboutUs?intent=kids')).toBeNull();
  });
});
