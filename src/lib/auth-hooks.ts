"use client";

// Auth Hooks - NextAuth.js hooks that replace Clerk hooks
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "next-auth";

// -----------------------------------------------------------------------------
// Main Auth Hook (replaces Clerk's useAuth and useUser)
// -----------------------------------------------------------------------------

/**
 * Main authentication hook that replaces both Clerk's useAuth and useUser
 * Provides a unified interface for authentication state and methods
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Session state
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated" && !!session?.user;
  const user = session?.user || null;

  // Legacy compatibility properties (matching Clerk's interface)
  const isLoading = status === "loading";
  const isAuthenticated = isSignedIn;

  // Authentication methods
  const signInWithGoogle = useCallback(async (callbackUrl?: string) => {
    try {
      await signIn("google", { 
        callbackUrl: callbackUrl || window.location.href 
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async (callbackUrl?: string) => {
    try {
      await signOut({ 
        callbackUrl: callbackUrl || "/" 
      });
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  const requireAuth = useCallback((redirectTo?: string) => {
    if (!isLoading && !isAuthenticated) {
      const callbackUrl = redirectTo || window.location.href;
      signIn("google", { callbackUrl });
    }
  }, [isLoading, isAuthenticated]);

  const updateSession = useCallback(async (data: Partial<Session>) => {
    try {
      await update(data);
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  }, [update]);

  return {
    // Session data (NextAuth.js style)
    session,
    user,
    status,
    
    // Clerk-compatible properties
    isLoaded,
    isSignedIn,
    isLoading,
    isAuthenticated,
    
    // Authentication methods
    signIn: signInWithGoogle,
    signOut: signOutUser,
    requireAuth,
    updateSession,
  };
}

/**
 * User-specific hook (replaces Clerk's useUser)
 * Provides user data and loading states
 */
export function useUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user || null,
    isLoaded: status !== "loading",
    isSignedIn: status === "authenticated" && !!session?.user,
    isLoading: status === "loading",
  };
}

/**
 * Custom hook for author data management
 * Fetches and manages author-specific data from the database
 */
export function useAuthor() {
  const { user, isSignedIn, isLoading } = useUser();
  const [author, setAuthor] = useState<any>(null);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthor = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      setAuthor(null);
      return;
    }

    setIsLoadingAuthor(true);
    setError(null);

    try {
      const response = await fetch('/api/author/current');
      
      if (!response.ok) {
        throw new Error('Failed to fetch author data');
      }

      const authorData = await response.json();
      setAuthor(authorData);
    } catch (err) {
      console.error("Error fetching author:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAuthor(null);
    } finally {
      setIsLoadingAuthor(false);
    }
  }, [isSignedIn, user?.id]);

  // Fetch author data when user changes
  useEffect(() => {
    fetchAuthor();
  }, [fetchAuthor]);

  const updateAuthor = useCallback(async (updates: Partial<any>) => {
    if (!author) return;

    try {
      const response = await fetch('/api/author/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update author');
      }

      const updatedAuthor = await response.json();
      setAuthor(updatedAuthor);
      return updatedAuthor;
    } catch (err) {
      console.error("Error updating author:", err);
      throw err;
    }
  }, [author]);

  return {
    author,
    isLoadingAuthor: isLoadingAuthor || isLoading,
    error,
    fetchAuthor,
    updateAuthor,
    hasAuthor: !!author,
  };
}

/**
 * Custom hook for role-based access control
 * @param requiredRole - The role required to access content
 */
export function useRoleAccess(requiredRole?: string) {
  const { author } = useAuthor();
  const { requireAuth, isSignedIn } = useAuth();

  const hasRole = requiredRole ? author?.role === requiredRole : true;
  const isAdmin = author?.role === 'admin';
  const canAccess = isSignedIn && hasRole;

  const requireRole = useCallback(() => {
    if (!isSignedIn) {
      requireAuth();
      return false;
    }
    
    if (requiredRole && !hasRole) {
      console.warn(`Access denied. Required role: ${requiredRole}, user role: ${author?.role}`);
      return false;
    }
    
    return true;
  }, [isSignedIn, hasRole, requiredRole, author?.role, requireAuth]);
  return {
    hasRole,
    isAdmin,
    canAccess,
    requireRole,
    userRole: author?.role || null,
    author,
  };
}

/**
 * Custom hook for protected routes
 * Automatically redirects if not authenticated
 */
export function useProtectedRoute(options: {
  redirectTo?: string;
  requireRole?: string;
  onUnauthorized?: () => void;
} = {}) {
  const { isSignedIn, isLoading, requireAuth } = useAuth();
  const { hasRole, author } = useRoleAccess(options.requireRole);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isSignedIn) {
      requireAuth(options.redirectTo);
      return;
    }

    if (options.requireRole && !hasRole) {
      if (options.onUnauthorized) {
        options.onUnauthorized();
      } else {
        router.push('/unauthorized');
      }
      return;
    }
  }, [
    isSignedIn, 
    isLoading, 
    hasRole, 
    options.requireRole, 
    options.redirectTo,
    options.onUnauthorized,
    requireAuth,
    router
  ]);

  return {
    isAuthenticated: isSignedIn,
    isLoading,
    hasAccess: isSignedIn && (options.requireRole ? hasRole : true),
    user: author,
  };
}

/**
 * Custom hook for session status
 */
export function useSessionStatus() {
  const { status, data: session } = useSession();

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
    hasSession: !!session,
    status,
  };
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Check if user is authenticated (client-side)
 */
export function isClientAuthenticated(session?: Session | null): boolean {
  return !!session?.user?.id;
}

/**
 * Get user ID from session (client-side)
 */
export function getClientUserId(session?: Session | null): string | null {
  return session?.user?.id || null;
}

/**
 * Format user display name (client-side)
 */
export function formatUserDisplayName(user: Session["user"]): string {
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

// -----------------------------------------------------------------------------
// Clerk Compatibility Layer
// -----------------------------------------------------------------------------

/**
 * Direct replacement for Clerk's useUser hook
 * Provides the exact same interface for seamless migration
 */
export function useClerkUser() {
  const { user, isLoaded, isSignedIn, isLoading } = useUser();
  
  return {
    user: user ? {
      id: user.id!,
      name: user.name,
      email: user.email,
      image: user.image,
      // Add any other Clerk user properties that might be used
      firstName: user.name?.split(' ')[0] || null,
      lastName: user.name?.split(' ').slice(1).join(' ') || null,
      emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
    } : null,
    isLoaded,
    isSignedIn,
    isLoading,
  };
}

/**
 * Direct replacement for Clerk's useAuth hook
 * Provides the exact same interface for seamless migration
 */
export function useClerkAuth() {
  const auth = useAuth();
  
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    userId: auth.user?.id || null,
    signOut: auth.signOut,
    // Add any other Clerk auth properties that might be used
  };
}

// Re-export for backward compatibility - components can import useUser directly
export { useUser as useClerkCompatibleUser };
export { useAuth as useClerkCompatibleAuth };

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type ClientUser = Session["user"] | null;

// Legacy Clerk-compatible types
export interface ClerkUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface ClerkAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ClerkUser | null;
}

export interface ClerkUserHook {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ClerkUser | null;
}