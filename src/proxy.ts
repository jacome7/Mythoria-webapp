import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getLandingPageIntentContext } from '@/content/landing-pages';
import {
  BASE_URL,
  PUBLIC_HOST_ALIASES,
  getCanonicalRedirectPath,
  resolveFileBackedPublicSeoPath,
} from '@/lib/seo';
import { INTENT_CONTEXT_COOKIE, INTENT_CONTEXT_MAX_AGE } from '@/types/intent-context';
import {
  buildPublicRedirectSearch,
  getValidatedIntent,
  parseIntentContext,
  serializeIntentContext,
} from '@/lib/campaign-context';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { resolveDynamicPublicSeoPath } from '@/lib/public-seo-resolver';

const intlMiddleware = createMiddleware(routing);

function firstForwardedValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null;
}

export function getCanonicalRequestRedirect(
  req: NextRequest,
  resolvedPath?: string,
  sanitizePublicQuery = false,
): URL | null {
  const forwardedHost = firstForwardedValue(req.headers.get('x-forwarded-host'));
  const requestHost = forwardedHost || req.headers.get('host') || req.nextUrl.host;
  const hostname = requestHost.split(':')[0].toLowerCase();
  const forwardedProtocol = firstForwardedValue(req.headers.get('x-forwarded-proto'));
  const requestProtocol = forwardedProtocol || req.nextUrl.protocol.replace(':', '');
  const isPublicHost = PUBLIC_HOST_ALIASES.has(hostname);
  const canonicalPath = resolvedPath ?? getCanonicalRedirectPath(req.nextUrl.pathname);

  const source = new URL(
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
    `${requestProtocol}://${requestHost}`,
  );

  const destination = new URL(source);
  if (canonicalPath) destination.pathname = canonicalPath;
  if (sanitizePublicQuery) {
    destination.search = buildPublicRedirectSearch(req.nextUrl.searchParams).toString();
  }

  if (isPublicHost) {
    const canonicalOrigin = new URL(BASE_URL);
    destination.protocol = canonicalOrigin.protocol;
    destination.hostname = canonicalOrigin.hostname;
    destination.port = canonicalOrigin.port;
  }

  return destination.toString() === source.toString() ? null : destination;
}

export function getCanonicalRedirectResponse(req: NextRequest): NextResponse | null {
  const destination = getCanonicalRequestRedirect(req);
  return destination ? NextResponse.redirect(destination, 308) : null;
}

export async function getPublicSeoResponse(req: NextRequest): Promise<NextResponse | null> {
  const fileResolution = resolveFileBackedPublicSeoPath(req.nextUrl.pathname);
  const resolution =
    fileResolution.type === 'unmatched'
      ? await resolveDynamicPublicSeoPath(req.nextUrl.pathname)
      : fileResolution;

  if (resolution.type === 'notFound') {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' },
    });
  }

  if (resolution.type === 'unmatched') return null;

  const redirectRequired = getCanonicalRequestRedirect(req, resolution.pathname);
  if (!redirectRequired) return null;

  const destination = getCanonicalRequestRedirect(req, resolution.pathname, true);
  return NextResponse.redirect(destination ?? redirectRequired, 308);
}

function applyLandingPageIntentCookie(req: NextRequest, response: NextResponse): NextResponse {
  const [locale, lpSegment, slug, ...rest] = req.nextUrl.pathname.split('/').filter(Boolean);
  if (lpSegment !== 'lp' || !slug || rest.length > 0) return response;

  const intentContext = getLandingPageIntentContext(locale, slug);
  if (!intentContext) return response;

  response.cookies.set(INTENT_CONTEXT_COOKIE, serializeIntentContext(intentContext), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INTENT_CONTEXT_MAX_AGE,
    path: '/',
  });

  return response;
}

function applyHomepageIntentCookie(req: NextRequest, response: NextResponse): NextResponse {
  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  if (segments.length !== 1 || !SUPPORTED_LOCALES.includes(segments[0])) return response;

  const intent = getValidatedIntent(req.nextUrl.searchParams.get('intent'));
  if (!intent) return response;

  const existing = parseIntentContext(req.cookies.get(INTENT_CONTEXT_COOKIE)?.value);
  response.cookies.set(INTENT_CONTEXT_COOKIE, serializeIntentContext({ ...existing, intent }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INTENT_CONTEXT_MAX_AGE,
    path: '/',
  });
  return response;
}

function applyPublicContextCookies(req: NextRequest, response: NextResponse): NextResponse {
  return applyHomepageIntentCookie(req, applyLandingPageIntentCookie(req, response));
}

export const proxy = clerkMiddleware(
  async (auth, req: NextRequest) => {
    const pathname = req.nextUrl.pathname;

    // Allow service worker, manifest, and well-known assets to bypass i18n/auth so they stay at the root scope
    if (
      pathname === '/sw.js' ||
      pathname.startsWith('/workbox-') ||
      pathname === '/manifest.webmanifest' ||
      pathname.startsWith('/.well-known/')
    ) {
      return NextResponse.next();
    }

    const publicSeoResponse = await getPublicSeoResponse(req);
    if (publicSeoResponse) return publicSeoResponse;

    const canonicalRedirect = getCanonicalRedirectResponse(req);
    if (canonicalRedirect) return canonicalRedirect;

    // Allow the PWA offline fallback route to remain at root without locale prefix.
    // We skip the i18n middleware so it doesn't redirect /offline -> /en-US/offline (which 404s)
    // Also allow /i/ intent detection routes to bypass both i18n and auth
    if (
      pathname === '/offline' ||
      pathname.startsWith('/SampleBooks/') ||
      pathname.startsWith('/sample-books/') ||
      pathname.startsWith('/i/')
    ) {
      const res = NextResponse.next();
      res.headers.set('x-pathname', pathname);
      return res;
    }

    // Handle the internationalization first for root auth routes
    if (pathname === '/sign-in' || pathname === '/sign-up') {
      return intlMiddleware(req);
    }
    // Skip clerk middleware for certain routes, but keep internationalization for auth routes
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/portaldegestao') ||
      pathname.startsWith('/v1/') ||
      pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/p\//)
    ) {
      // Only public story routes are excluded

      const response = NextResponse.next();
      response.headers.set('x-clerk-clock-skew-seconds', '600');
      return response;
    }
    // Run the internationalization middleware for non-API routes (including base /sign-in and /sign-up)
    const response = intlMiddleware(req);

    // Add the pathname to headers so we can access it in the root layout
    if (response) {
      response.headers.set('x-pathname', req.nextUrl.pathname);
      return applyPublicContextCookies(req, response);
    }

    // If no response from intl middleware, create one and add the header
    const newResponse = NextResponse.next();
    newResponse.headers.set('x-pathname', req.nextUrl.pathname);
    return applyPublicContextCookies(req, newResponse);
  },
  {
    // Add clock skew tolerance to Clerk configuration
    clockSkewInMs: 600000, // 600 seconds in milliseconds
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|manifest|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|mp3|m4a|wav|ogg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|pdf|webmanifest|xml)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
