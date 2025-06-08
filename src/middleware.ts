import { auth } from "@/lib/auth";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Define protected routes that require authentication
const protectedRoutes = [
  '/tell-your-story',
  '/profile',
  '/dashboard',
  '/my-stories',
  '/portaldegestao',
];

// Based on NextAuth.js official example: https://github.com/nextauthjs/next-auth-example/blob/main/middleware.ts
export default auth((req: any) => {
  const isDebugMode = process.env.NEXTAUTH_DEBUG === 'true';
  const { pathname } = req.nextUrl;
  
  if (isDebugMode) {
    console.log('[NextAuth Middleware Debug] Request details:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      pathname: pathname,
      searchParams: req.nextUrl.searchParams.toString(),
      userAgent: req.headers.get('user-agent'),
      isAuthRoute: pathname.startsWith('/api/auth'),
      isApiRoute: pathname.startsWith('/api/'),
      isProtectedRoute: protectedRoutes.some(route => pathname.includes(route)),
      session: req.auth ? 'authenticated' : 'not authenticated',
    });
  }

  // Skip internationalization for API routes, NextAuth routes, and admin portal
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/portaldegestao') ||
      pathname.startsWith('/v1/') ||
      pathname.startsWith('/hello-world')) {
    
    const response = NextResponse.next();
    
    if (isDebugMode) {
      response.headers.set('x-nextauth-debug', 'true');
      response.headers.set('x-nextauth-middleware-processed', new Date().toISOString());
    }
    
    return response;
  }

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.includes(route));
  
  if (isProtectedRoute && !req.auth) {
    if (isDebugMode) {
      console.log('[NextAuth Middleware Debug] Redirecting unauthenticated user to sign-in');
    }
    
    // Redirect to sign-in page while preserving the intended destination
    const signInUrl = new URL('/api/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Run the internationalization middleware for non-API routes
  const response = intlMiddleware(req as NextRequest);
  
  // Add the pathname to headers so we can access it in the root layout
  if (response) {
    response.headers.set('x-pathname', pathname);
    
    if (isDebugMode) {
      response.headers.set('x-nextauth-debug', 'true');
      response.headers.set('x-nextauth-middleware-processed', new Date().toISOString());
      response.headers.set('x-intl-middleware-processed', 'true');
    }
    
    return response;
  }
  
  // If no response from intl middleware, create one and add the header
  const newResponse = NextResponse.next();
  newResponse.headers.set('x-pathname', pathname);
  
  if (isDebugMode) {
    newResponse.headers.set('x-nextauth-debug', 'true');
    newResponse.headers.set('x-nextauth-middleware-processed', new Date().toISOString());
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
