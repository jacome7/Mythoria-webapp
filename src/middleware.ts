import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Enhanced Clerk debugging and logging
  const isDebugMode = process.env.CLERK_DEBUG === 'true';
  const logLevel = process.env.CLERK_LOG_LEVEL;
  
  if (isDebugMode || logLevel === 'debug') {
    console.log('[Clerk Middleware Debug] Request details:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      pathname: req.nextUrl.pathname,
      searchParams: req.nextUrl.searchParams.toString(),
      userAgent: req.headers.get('user-agent'),
      clerkHeaders: {
        authorization: req.headers.get('authorization') ? '[PRESENT]' : '[MISSING]',
        cookie: req.headers.get('cookie') ? '[PRESENT]' : '[MISSING]',
        clerkDbJwt: req.headers.get('cookie')?.includes('__clerk_db_jwt') ? '[PRESENT]' : '[MISSING]',
        sessionCookie: req.headers.get('cookie')?.includes('__session') ? '[PRESENT]' : '[MISSING]',
        clientUat: req.headers.get('cookie')?.includes('__client_uat') ? '[PRESENT]' : '[MISSING]',
      },
      isClerkRoute: req.nextUrl.pathname.includes('clerk') || 
                   req.nextUrl.pathname.startsWith('/sign-in') || 
                   req.nextUrl.pathname.startsWith('/sign-up'),
      isApiRoute: req.nextUrl.pathname.startsWith('/api/'),
      isWebhookRoute: req.nextUrl.pathname.startsWith('/api/webhooks'),
    });    // Log auth state if available
    try {
      const authState = await auth();
      console.log('[Clerk Middleware Debug] Auth state:', {
        userId: authState.userId || '[NONE]',
        sessionId: authState.sessionId || '[NONE]',
        orgId: authState.orgId || '[NONE]',
        has: typeof authState.has === 'function' ? 'function available' : 'no has function',
      });
    } catch (error) {
      console.log('[Clerk Middleware Debug] Auth state error:', error);
    }
  }

  // Skip internationalization for API routes, admin portal, auth pages, and test pages
  if (req.nextUrl.pathname.startsWith('/api/') || 
      req.nextUrl.pathname.startsWith('/portaldegestao') ||
      req.nextUrl.pathname.startsWith('/v1/') ||
      req.nextUrl.pathname.startsWith('/clerk-test') ||
      req.nextUrl.pathname.startsWith('/clerk-debug') ||
      req.nextUrl.pathname.startsWith('/hello-world') ||
      req.nextUrl.pathname.startsWith('/sign-in') ||
      req.nextUrl.pathname.startsWith('/sign-up')) {
    
    const response = NextResponse.next();
    
    // Add debug headers if in debug mode
    if (isDebugMode) {
      response.headers.set('x-clerk-debug', 'true');
      response.headers.set('x-clerk-middleware-processed', new Date().toISOString());
    }
    
    return response;
  }
  
  // Run the internationalization middleware for non-API routes
  const response = intlMiddleware(req);
  
  // Add the pathname to headers so we can access it in the root layout
  if (response) {
    response.headers.set('x-pathname', req.nextUrl.pathname);
    
    // Add debug headers if in debug mode
    if (isDebugMode) {
      response.headers.set('x-clerk-debug', 'true');
      response.headers.set('x-clerk-middleware-processed', new Date().toISOString());
      response.headers.set('x-intl-middleware-processed', 'true');
    }
    
    return response;
  }
  
  // If no response from intl middleware, create one and add the header
  const newResponse = NextResponse.next();
  newResponse.headers.set('x-pathname', req.nextUrl.pathname);
  
  // Add debug headers if in debug mode
  if (isDebugMode) {
    newResponse.headers.set('x-clerk-debug', 'true');
    newResponse.headers.set('x-clerk-middleware-processed', new Date().toISOString());
  }
  
  return newResponse;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|pdf|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
