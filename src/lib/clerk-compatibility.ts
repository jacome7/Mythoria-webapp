/**
 * Clerk Compatibility Exports
 * 
 * This file provides direct replacements for Clerk imports to make migration seamless.
 * Simply replace your Clerk imports with these equivalents.
 * 
 * Migration Examples:
 * 
 * Before:
 * import { useUser, useAuth } from '@clerk/nextjs';
 * 
 * After:
 * import { useUser, useAuth } from '@/lib/clerk-compatibility';
 * 
 */

// Direct replacements for Clerk hooks
export { useUser, useAuth } from './auth-hooks';

// Additional hooks for enhanced functionality
export { 
  useAuthor, 
  useRoleAccess, 
  useProtectedRoute, 
  useSessionStatus 
} from './auth-hooks';

// Utility functions
export { 
  isClientAuthenticated, 
  getClientUserId, 
  formatUserDisplayName 
} from './auth-hooks';

// Types
export type { 
  AuthStatus, 
  ClientUser, 
  ClerkUser, 
  ClerkAuth, 
  ClerkUserHook 
} from './auth-hooks';

/**
 * Migration Notes:
 * 
 * 1. useUser() - Direct replacement for Clerk's useUser
 *    - Returns: { user, isLoaded, isSignedIn, isLoading }
 * 
 * 2. useAuth() - Enhanced replacement for Clerk's useAuth
 *    - Returns: { session, user, status, isLoaded, isSignedIn, isLoading, signIn, signOut, requireAuth, updateSession }
 * 
 * 3. useAuthor() - Custom hook for author data
 *    - Returns: { author, isLoadingAuthor, error, fetchAuthor, updateAuthor, hasAuthor }
 * 
 * 4. Components that need updating:
 *    - Replace <SignedIn> with custom SignedIn from @/components/auth/AuthComponents
 *    - Replace <SignedOut> with custom SignedOut from @/components/auth/AuthComponents
 *    - Replace <UserButton> with custom UserButton from @/components/auth/AuthComponents
 *    - Replace <SignInButton> with custom SignInButton from @/components/auth/AuthComponents
 */
