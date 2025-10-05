import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware(
  async (auth, req: NextRequest) => {
    const pathname = req.nextUrl.pathname;

    // Allow the PWA offline fallback route to remain at root without locale prefix.
    // We skip the i18n middleware so it doesn't redirect /offline -> /en-US/offline (which 404s)
    if (pathname === '/offline') {
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
      return response;
    }

    // If no response from intl middleware, create one and add the header
    const newResponse = NextResponse.next();
    newResponse.headers.set('x-pathname', req.nextUrl.pathname);
    return newResponse;
  },
  {
    // Add clock skew tolerance to Clerk configuration
    clockSkewInMs: 600000, // 600 seconds in milliseconds
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|manifest|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|pdf|webmanifest|xml)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
