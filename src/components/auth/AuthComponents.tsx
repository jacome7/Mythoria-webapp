"use client";

// Auth Components - NextAuth.js replacements for Clerk components
import React from 'react';
import { useAuth } from '@/lib/auth-hooks';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// -----------------------------------------------------------------------------
// Session Check Components (replacing SignedIn/SignedOut)
// -----------------------------------------------------------------------------

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Replacement for Clerk's SignedIn component
 * Only renders children when user is authenticated
 */
export function SignedIn({ children, fallback }: AuthWrapperProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return fallback || null;
  }

  return isSignedIn ? <>{children}</> : (fallback || null);
}

/**
 * Replacement for Clerk's SignedOut component
 * Only renders children when user is NOT authenticated
 */
export function SignedOut({ children, fallback }: AuthWrapperProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return fallback || null;
  }

  return !isSignedIn ? <>{children}</> : (fallback || null);
}

/**
 * Replacement for Clerk's RedirectToSignIn component
 * Redirects unauthenticated users to sign-in page
 */
export function RedirectToSignIn({ 
  returnBackUrl,
  afterSignInUrl,
}: {
  returnBackUrl?: string;
  afterSignInUrl?: string;
} = {}) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const callbackUrl = afterSignInUrl || returnBackUrl || window.location.href;
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [isLoaded, isSignedIn, afterSignInUrl, returnBackUrl, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p>Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return null;
}

// -----------------------------------------------------------------------------
// Authentication Button Components
// -----------------------------------------------------------------------------

interface AuthButtonProps {
  mode?: 'redirect' | 'modal';
  redirectUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Sign In Button component
 * Replacement for Clerk's SignInButton
 */
export function SignInButton({ 
  mode = 'redirect',
  redirectUrl,
  className = "btn btn-primary",
  children = "Sign In"
}: AuthButtonProps) {
  const handleSignIn = async () => {
    const callbackUrl = redirectUrl || window.location.href;
    await signIn('google', { callbackUrl });
  };

  return (
    <button 
      onClick={handleSignIn}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * Sign Up Button component  
 * Replacement for Clerk's SignUpButton
 */
export function SignUpButton({ 
  mode = 'redirect',
  redirectUrl,
  className = "btn btn-secondary",
  children = "Sign Up"
}: AuthButtonProps) {
  const handleSignUp = async () => {
    const callbackUrl = redirectUrl || window.location.href;
    await signIn('google', { callbackUrl });
  };

  return (
    <button 
      onClick={handleSignUp}
      className={className}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// User Menu Component (replacing UserButton)
// -----------------------------------------------------------------------------

interface UserButtonProps {
  afterSignOutUrl?: string;
  appearance?: {
    elements?: Record<string, string>;
  };
  showName?: boolean;
  userProfileMode?: 'navigation' | 'modal';
}

/**
 * User Button component
 * Replacement for Clerk's UserButton with dropdown menu
 */
export function UserButton({ 
  afterSignOutUrl = "/",
  showName = false,
  appearance,
}: UserButtonProps) {
  const { user, signOut, isSignedIn } = useAuth();
  const router = useRouter();

  if (!isSignedIn || !user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push(afterSignOutUrl);
  };

  const userInitials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U';

  const displayName = user.name || user.email?.split('@')[0] || 'User';

  return (
    <div className="dropdown dropdown-end">
      <div 
        tabIndex={0} 
        role="button" 
        className="btn btn-ghost btn-circle avatar"
        style={appearance?.elements?.userButtonTrigger}
      >
        <div className="w-10 rounded-full">
          {user.image ? (
            <img 
              alt={displayName}
              src={user.image}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold">
              {userInitials}
            </div>
          )}
        </div>
      </div>
      <ul 
        tabIndex={0} 
        className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
      >
        <li className="menu-title">
          <span className="text-sm font-semibold">{displayName}</span>
          {user.email && (
            <span className="text-xs text-base-content/60">{user.email}</span>
          )}
        </li>
        <li><a href="/profile" className="justify-between">Profile</a></li>
        <li><a href="/my-stories">My Stories</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><hr className="my-1" /></li>
        <li>
          <button onClick={handleSignOut} className="text-error">
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Loading Components
// -----------------------------------------------------------------------------

/**
 * Authentication loading component
 */
export function AuthLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg mb-4"></div>
        <p className="text-base-content/60">{message}</p>
      </div>
    </div>
  );
}

/**
 * Protect component that requires authentication
 */
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = "/api/auth/signin"
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const callbackUrl = window.location.href;
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [isLoaded, isSignedIn, redirectTo, router]);

  if (!isLoaded) {
    return fallback || <AuthLoading message="Checking authentication..." />;
  }

  if (!isSignedIn) {
    return fallback || <AuthLoading message="Redirecting to sign in..." />;
  }

  return <>{children}</>;
}
