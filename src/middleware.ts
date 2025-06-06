import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  // Enhanced Auth0 debugging and logging
  const isDebugMode = process.env.AUTH0_DEBUG === 'true';
  
  if (isDebugMode) {
    console.log('[Auth0 Middleware Debug] Request details:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      pathname: req.nextUrl.pathname,
      searchParams: req.nextUrl.searchParams.toString(),
      userAgent: req.headers.get('user-agent'),
      authHeaders: {
        authorization: req.headers.get('authorization') ? '[PRESENT]' : '[MISSING]',
        cookie: req.headers.get('cookie') ? '[PRESENT]' : '[MISSING]',
        sessionCookie: req.headers.get('cookie')?.includes('appSession') ? '[PRESENT]' : '[MISSING]',
      },
      isAuthRoute: req.nextUrl.pathname.includes('auth') || 
                   req.nextUrl.pathname.startsWith('/api/auth'),
      isApiRoute: req.nextUrl.pathname.startsWith('/api/'),
      isWebhookRoute: req.nextUrl.pathname.startsWith('/api/webhooks'),
    });
  }
  // Handle Auth0 authentication routes first
  if (req.nextUrl.pathname.startsWith("/auth")) {
    try {
      const authRes = await auth0.middleware(req);
      if (isDebugMode) {
        console.log('[Auth0 Middleware Debug] Auth route handled:', req.nextUrl.pathname);
      }
      return authRes;
    } catch (error) {
      console.error('[Auth0 Middleware Error] Error handling auth route:', {
        pathname: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
      });
      // For JWE errors, redirect to login to get a fresh session
      if (error instanceof Error && error.message.includes('JWE')) {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
      // For other errors, continue with the request
      return NextResponse.next();
    }
  }

  // Skip internationalization for API routes, admin portal, and test pages
  if (req.nextUrl.pathname.startsWith('/api/') || 
      req.nextUrl.pathname.startsWith('/portaldegestao') ||
      req.nextUrl.pathname.startsWith('/v1/') ||
      req.nextUrl.pathname.startsWith('/hello-world')) {    
    const response = NextResponse.next();
    
    // Add debug headers if in debug mode
    if (isDebugMode) {
      response.headers.set('x-auth0-debug', 'true');
      response.headers.set('x-auth0-middleware-processed', new Date().toISOString());
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
      response.headers.set('x-auth0-debug', 'true');
      response.headers.set('x-auth0-middleware-processed', new Date().toISOString());
      response.headers.set('x-intl-middleware-processed', 'true');
    }
    
    return response;
  }
  
  // If no response from intl middleware, create one and add the header
  const newResponse = NextResponse.next();
  newResponse.headers.set('x-pathname', req.nextUrl.pathname);
  
  // Add debug headers if in debug mode
  if (isDebugMode) {
    newResponse.headers.set('x-auth0-debug', 'true');
    newResponse.headers.set('x-auth0-middleware-processed', new Date().toISOString());
  }
  
  return newResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and auth routes
    "/((?!_next|auth|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|pdf|webmanifest)).*)",
    // Always run for API routes except auth
    "/api/((?!auth).*)",
    // Explicitly include auth routes for Auth0 middleware
    "/auth/(.*)",
  ],
};
