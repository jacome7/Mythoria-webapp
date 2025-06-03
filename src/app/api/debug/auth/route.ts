import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authData = auth();
    
    // Add additional debug information
    const debugInfo = {
      ...authData,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + "...",
      hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasWebhookSigningSecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      requestHeaders: {
        host: process.env.NEXTAUTH_URL || "unknown",
        userAgent: "server-side"
      }
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
