"use client";

// Auth Client Utils - Client-side authentication utilities for NextAuth.js
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "next-auth";

// -----------------------------------------------------------------------------
// Client-Side Authentication Utilities
// -----------------------------------------------------------------------------

/**
 * Custom hook for client session management
 * @returns Enhanced session data and utilities
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const user = session?.user || null;

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
    // Session data
    session,
    user,
    isLoading,
    isAuthenticated,
    status,
    
    // Authentication methods
    signInWithGoogle,
    signOut: signOutUser,
    requireAuth,
    updateSession,
  };
}

/**
 * Custom hook for author data management
 * @returns Author data and utilities
 */
export function useAuthor() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [author, setAuthor] = useState<any>(null);
  const [isLoadingAuthor, setIsLoadingAuthor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthor = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
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
  }, [isAuthenticated, user?.id]);

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
 * @returns Access control utilities
 */
export function useRoleAccess(requiredRole?: string) {
  const { author } = useAuthor();
  const { requireAuth, isAuthenticated } = useAuth();

  const hasRole = requiredRole ? author?.role === requiredRole : true;
  const isAdmin = author?.role === 'admin';
  const canAccess = isAuthenticated && hasRole;

  const requireRole = useCallback(() => {
    if (!isAuthenticated) {
      requireAuth();
      return false;
    }
    
    if (requiredRole && !hasRole) {
      // Could redirect to unauthorized page or show error
      console.warn(`Access denied. Required role: ${requiredRole}, user role: ${author?.role}`);
      return false;
    }
    
    return true;
  }, [isAuthenticated, hasRole, requiredRole, author?.role, requireAuth]);

  return {
    hasRole,
    isAdmin,
    canAccess,
    requireRole,
    userRole: author?.role || null,
  };
}

/**
 * Custom hook for protected routes
 * Automatically redirects if not authenticated
 * @param options - Configuration options
 */
export function useProtectedRoute(options: {
  redirectTo?: string;
  requireRole?: string;
  onUnauthorized?: () => void;
} = {}) {
  const { isAuthenticated, isLoading, requireAuth } = useAuth();
  const { hasRole, author } = useRoleAccess(options.requireRole);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
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
    isAuthenticated, 
    isLoading, 
    hasRole, 
    options.requireRole, 
    options.redirectTo,
    options.onUnauthorized,
    requireAuth,
    router
  ]);

  return {
    isAuthenticated,
    isLoading,
    hasAccess: isAuthenticated && (options.requireRole ? hasRole : true),
    user: author,
  };
}

/**
 * Custom hook for session status
 * @returns Detailed session status information
 */
export function useSessionStatus() {
  const { status, session } = useSession();

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
 * @param session - Optional session object
 * @returns boolean indicating authentication status
 */
export function isClientAuthenticated(session?: Session | null): boolean {
  return !!session?.user?.id;
}

/**
 * Get user ID from session (client-side)
 * @param session - Optional session object
 * @returns User ID or null
 */
export function getClientUserId(session?: Session | null): string | null {
  return session?.user?.id || null;
}

/**
 * Format user display name (client-side)
 * @param user - User object
 * @returns Formatted display name
 */
export function formatUserDisplayName(user: Session["user"]): string {
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type ClientUser = Session["user"] | null;
