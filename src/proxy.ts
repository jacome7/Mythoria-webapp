import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { getLandingPageIntentContext } from '@/content/landing-pages';
import { getCanonicalRedirectPath } from '@/lib/seo';
import { INTENT_CONTEXT_COOKIE, INTENT_CONTEXT_MAX_AGE } from '@/types/intent-context';

const intlMiddleware = createMiddleware(routing);

function applyLandingPageIntentCookie(req: NextRequest, response: NextResponse): NextResponse {
  const [locale, lpSegment, slug, ...rest] = req.nextUrl.pathname.split('/').filter(Boolean);
  if (lpSegment !== 'lp' || !slug || rest.length > 0) return response;

  const intentContext = getLandingPageIntentContext(locale, slug);
  if (!intentContext) return response;

  response.cookies.set(INTENT_CONTEXT_COOKIE, JSON.stringify(intentContext), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: INTENT_CONTEXT_MAX_AGE,
    path: '/',
  });

  return response;
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

    const canonicalPath = getCanonicalRedirectPath(pathname);
    if (canonicalPath) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = canonicalPath;
      return NextResponse.redirect(redirectUrl, 308);
    }

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
      return applyLandingPageIntentCookie(req, response);
    }

    // If no response from intl middleware, create one and add the header
    const newResponse = NextResponse.next();
    newResponse.headers.set('x-pathname', req.nextUrl.pathname);
    return applyLandingPageIntentCookie(req, newResponse);
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
