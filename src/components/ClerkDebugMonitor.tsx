'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';

interface ClerkDebugInfo {
  timestamp: string;
  auth: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null | undefined;
    sessionId: string | null | undefined;
    orgId: string | null | undefined;
    actor: Record<string, unknown> | null | undefined;
    orgRole: string | null | undefined;
    orgSlug: string | null | undefined;
    has: string;
  };  user: {
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    user: Record<string, unknown> | null;
  };
  environment: {
    publishableKey: string;
    signInUrl: string;
    signUpUrl: string;
    afterSignInUrl: string;
    afterSignUpUrl: string;
    telemetryDisabled: string;
    telemetryDebug: string;
  };
  cookies: {
    document: string;
  };  localStorage: {
    clerkData: Record<string, string | null>;
  };
}

export default function ClerkDebugMonitor() {
  const auth = useAuth();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const [debugInfo, setDebugInfo] = useState<ClerkDebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Check if debug mode is enabled
  const isDebugMode = typeof window !== 'undefined' && 
    (window.location.search.includes('clerk_debug=true') || 
     localStorage.getItem('clerk_debug_enabled') === 'true');
  const collectDebugInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const info: ClerkDebugInfo = {
        timestamp: new Date().toISOString(),auth: {
          isLoaded: auth.isLoaded,
          isSignedIn: auth.isSignedIn ?? false,
          userId: auth.userId,
          sessionId: auth.sessionId,
          orgId: auth.orgId,
          actor: auth.actor,
          orgRole: auth.orgRole,
          orgSlug: auth.orgSlug,
          has: auth.has ? 'function available' : 'not available',
        },        user: {
          isLoaded: userLoaded,
          isSignedIn: isSignedIn ?? false,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddresses: user.emailAddresses?.map(e => ({
              id: e.id,
              emailAddress: e.emailAddress,
              verification: e.verification?.status
            })),
            primaryEmailAddressId: user.primaryEmailAddressId,
            username: user.username,
            createdAt: user.createdAt,
            lastSignInAt: user.lastSignInAt,
            imageUrl: user.imageUrl,
          } : null,
        },
        environment: {
          publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...' || '[MISSING]',
          signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '[NOT SET]',
          signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '[NOT SET]',
          afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '[NOT SET]',
          afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '[NOT SET]',
          telemetryDisabled: process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED || '[NOT SET]',
          telemetryDebug: process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG || '[NOT SET]',
        },
        cookies: {
          document: document.cookie,
        },
        localStorage: {          clerkData: Object.keys(localStorage)
            .filter(key => key.includes('clerk'))
            .reduce((acc, key) => {
              acc[key] = localStorage.getItem(key);
              return acc;
            }, {} as Record<string, string | null>),
        },
      };

      setDebugInfo(info);

      // Send debug info to server endpoint
      fetch('/api/clerk-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client_debug_info',
          data: info,
        }),
      }).catch(err => console.warn('Failed to send debug info to server:', err));    } catch (error) {
      console.error('Error collecting Clerk debug info:', error);
    }
  }, [auth, userLoaded, isSignedIn, user]);
  useEffect(() => {
    if (isDebugMode) {
      collectDebugInfo();
    }
  }, [isDebugMode, collectDebugInfo]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && isDebugMode) {
      interval = setInterval(collectDebugInfo, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isDebugMode, collectDebugInfo]);

  // Keyboard shortcut to toggle debug panel
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(!isVisible);
        localStorage.setItem('clerk_debug_enabled', 'true');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isDebugMode && !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded shadow-lg hover:bg-blue-700 text-sm"
        >
          🔍 Clerk Debug
        </button>
      ) : (
        <div className="bg-white border shadow-xl rounded-lg max-w-2xl max-h-96 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
            <h3 className="font-semibold">Clerk Debug Monitor</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2 py-1 text-xs rounded ${
                  autoRefresh ? 'bg-green-500' : 'bg-gray-500'
                }`}
              >
                Auto Refresh
              </button>
              <button
                onClick={collectDebugInfo}
                className="px-2 py-1 text-xs bg-yellow-500 rounded hover:bg-yellow-400"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="px-2 py-1 text-xs bg-red-500 rounded hover:bg-red-400"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-80">
            {debugInfo ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Auth State</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.auth, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">User State</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.user, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Environment</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.environment, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">
                    Cookies ({debugInfo.cookies.document.split(';').length})
                  </h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {debugInfo.cookies.document}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm text-gray-700">LocalStorage (Clerk)</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.localStorage.clerkData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">Loading debug info...</div>
            )}
          </div>
          
          <div className="border-t px-4 py-2 bg-gray-50 text-xs text-gray-600">
            <div>Press Ctrl+Shift+D to toggle</div>
            <div>Last updated: {debugInfo?.timestamp}</div>
          </div>
        </div>
      )}
    </div>
  );
}
