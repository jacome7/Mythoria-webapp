import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware((auth, req: NextRequest) => {
  // Handle redirects from old localized auth routes to new non-localized ones
  if (req.nextUrl.pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/sign-in/)) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in' + req.nextUrl.pathname.replace(/^\/[a-z]{2}-[A-Z]{2}\/sign-in/, '');
    return NextResponse.redirect(url, 301);
  }
  
  if (req.nextUrl.pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/sign-up/)) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-up' + req.nextUrl.pathname.replace(/^\/[a-z]{2}-[A-Z]{2}\/sign-up/, '');
    return NextResponse.redirect(url, 301);
  }
  // Skip internationalization for API routes, admin portal, auth pages, and test pages
  if (req.nextUrl.pathname.startsWith('/api/') || 
      req.nextUrl.pathname.startsWith('/portaldegestao') ||
      req.nextUrl.pathname.startsWith('/clerk-test') ||
      req.nextUrl.pathname.startsWith('/clerk-debug') ||
      req.nextUrl.pathname.startsWith('/hello-world') ||
      req.nextUrl.pathname.startsWith('/sign-in') ||
      req.nextUrl.pathname.startsWith('/sign-up')) {
    return NextResponse.next();
  }
  
  // Run the internationalization middleware for non-API routes
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
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
