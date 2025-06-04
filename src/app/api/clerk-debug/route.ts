import { NextRequest, NextResponse } from 'next/server';
import { getAuthDebugInfo } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Check if debug mode is enabled
    const isDebugMode = process.env.CLERK_DEBUG === 'true';
    const logLevel = process.env.CLERK_LOG_LEVEL;
    
    if (!isDebugMode && logLevel !== 'debug') {
      return NextResponse.json(
        { error: 'Debug endpoint is disabled. Set CLERK_DEBUG=true or CLERK_LOG_LEVEL=debug to enable.' },
        { status: 403 }
      );
    }

    console.log('[Clerk Debug API] Debug endpoint accessed');
    
    // Get comprehensive auth debug information
    const debugInfo = await getAuthDebugInfo();
    
    // Add additional server-side debug information
    const serverInfo = {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      requestHeaders: Object.fromEntries(req.headers.entries()),
      environmentVariables: {
        CLERK_DEBUG: process.env.CLERK_DEBUG,
        CLERK_LOG_LEVEL: process.env.CLERK_LOG_LEVEL,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? '[PRESENT]' : '[MISSING]',
        CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET ? '[PRESENT]' : '[MISSING]',
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
        NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED: process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED,
        NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG: process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG,
        CLERK_TELEMETRY_DISABLED: process.env.CLERK_TELEMETRY_DISABLED,
        CLERK_TELEMETRY_DEBUG: process.env.CLERK_TELEMETRY_DEBUG,
      },
      cookies: {
        hasSessionCookie: req.cookies.get('__session') ? true : false,
        hasClerkDbJwt: req.cookies.get('__clerk_db_jwt') ? true : false,
        hasClientUat: req.cookies.get('__client_uat') ? true : false,
        allCookieNames: Array.from(req.cookies.getAll()).map(cookie => cookie.name),
      }
    };

    const completeDebugInfo = {
      ...debugInfo,
      server: serverInfo,
    };

    console.log('[Clerk Debug API] Returning debug info:', JSON.stringify(completeDebugInfo, null, 2));

    return NextResponse.json(completeDebugInfo, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Clerk-Debug': 'true',
      },
    });
  } catch (error) {
    console.error('[Clerk Debug API] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const isDebugMode = process.env.CLERK_DEBUG === 'true';
    const logLevel = process.env.CLERK_LOG_LEVEL;
    
    if (!isDebugMode && logLevel !== 'debug') {
      return NextResponse.json(
        { error: 'Debug endpoint is disabled' },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('[Clerk Debug API] POST request received:', body);

    // Log custom debug information sent from client
    if (body.type === 'client_debug_info') {
      console.log('[Clerk Debug API] Client debug info:', JSON.stringify(body.data, null, 2));
      
      return NextResponse.json({
        received: true,
        timestamp: new Date().toISOString(),
        message: 'Debug information logged successfully',
      });
    }

    return NextResponse.json({
      error: 'Unknown POST request type',
      receivedBody: body,
    }, { status: 400 });

  } catch (error) {
    console.error('[Clerk Debug API] POST Error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
