import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    
    // Add additional debug information
    const debugInfo = {
      isAuthenticated: !!session,
      user: session?.user ? {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        nickname: session.user.nickname,
        picture: session.user.picture,
      } : null,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      auth0Domain: process.env.AUTH0_DOMAIN,
      hasAuth0Secret: !!process.env.AUTH0_SECRET,
      hasAuth0BaseUrl: !!process.env.AUTH0_BASE_URL,
      hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
      requestHeaders: {
        host: req.headers.get('host') || "unknown",
        userAgent: req.headers.get('user-agent') || "unknown"
      }    };

    console.log("[Auth Debug] Current authentication state:", {
      isAuthenticated: debugInfo.isAuthenticated,
      userId: session?.user?.sub || 'none',
      timestamp: debugInfo.timestamp
    });
    
    return NextResponse.json(debugInfo);  } catch (error) {
    console.error("[Auth Debug] Error getting authentication state:", error);
    return NextResponse.json(
      { 
        error: "Failed to get authentication state",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
