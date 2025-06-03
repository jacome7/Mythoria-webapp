import { NextResponse } from "next/server";

export async function GET() {
  const envCheck = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    
    // Database
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      hasPassword: !!process.env.DB_PASSWORD,
    },
    
    // Clerk Configuration
    clerk: {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + "...",
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 8) + "...",
      
      // Webhook secrets (both variations)
      hasWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasWebhookSigningSecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      webhookSecretPrefix: process.env.CLERK_WEBHOOK_SECRET?.substring(0, 10) + "..." || 
                          process.env.CLERK_WEBHOOK_SIGNING_SECRET?.substring(0, 10) + "...",
      
      // Environment-specific settings
      isDevelopment: process.env.NEXT_PUBLIC_CLERK_IS_DEVELOPMENT,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    },
    
    // Legacy Auth (should be removed)
    legacyAuth: {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL,
    },
    
    // App Configuration
    app: {
      initialUserCredits: process.env.INITIAL_USER_CREDITS,
      showSoonPage: process.env.NEXT_PUBLIC_SHOW_SOON_PAGE,
    },
    
    // Google Cloud (existing)
    googleCloud: {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      hasVertexAi: false, // Simplified for now
    },
      // Environment Variables Issues
    issues: [] as string[],
  };
  
  // Check for common issues
  const issues: string[] = [];
  
  if (!process.env.CLERK_SECRET_KEY) {
    issues.push("❌ CLERK_SECRET_KEY is missing");
  } else if (!process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
    issues.push("⚠️ CLERK_SECRET_KEY doesn't start with 'sk_' - might be invalid");
  }
  
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    issues.push("❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing");
  } else if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')) {
    issues.push("⚠️ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY doesn't start with 'pk_' - might be invalid");
  }
  
  if (!process.env.CLERK_WEBHOOK_SECRET && !process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    issues.push("❌ Neither CLERK_WEBHOOK_SECRET nor CLERK_WEBHOOK_SIGNING_SECRET is set");
  } else if (process.env.CLERK_WEBHOOK_SIGNING_SECRET && !process.env.CLERK_WEBHOOK_SECRET) {
    issues.push("⚠️ Using CLERK_WEBHOOK_SIGNING_SECRET instead of CLERK_WEBHOOK_SECRET (should rename)");
  }
  
  if (process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_URL) {
    issues.push("⚠️ Legacy NextAuth environment variables detected - should be removed");
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CLERK_IS_DEVELOPMENT === 'true') {
    issues.push("❌ Production environment but CLERK_IS_DEVELOPMENT is true");
  }
  
  envCheck.issues = issues;
  
  return NextResponse.json(envCheck, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
