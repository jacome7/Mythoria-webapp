// Auth Server Utils - Server-side authentication utilities for NextAuth.js
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { authors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

// -----------------------------------------------------------------------------
// Server-Side Authentication Utilities
// -----------------------------------------------------------------------------

/**
 * Get the current session on the server
 * @returns The NextAuth session or null
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

/**
 * Get the current authenticated user from server session
 * @returns User data or null if not authenticated
 */
export async function getServerUser() {
  const session = await getServerSession();
  return session?.user || null;
}

/**
 * Get the current author from the database (server-side)
 * @returns Author data or null if not found
 */
export async function getServerAuthor() {
  const user = await getServerUser();
  
  if (!user?.id) {
    return null;
  }

  try {
    const [author] = await db
      .select()
      .from(authors)
      .where(eq(authors.userId, user.id))
      .limit(1);

    return author || null;
  } catch (error) {
    console.error("Error getting server author:", error);
    return null;
  }
}

/**
 * Require authentication on the server
 * Redirects to sign-in if not authenticated
 * @param redirectTo - Optional custom redirect URL after sign-in
 * @returns User ID
 */
export async function requireServerAuth(redirectTo?: string): Promise<string> {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    const callbackUrl = redirectTo || "/";
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  
  return session.user.id;
}

/**
 * Require author authentication on the server
 * Redirects to sign-in if not authenticated or author not found
 * @param redirectTo - Optional custom redirect URL after sign-in
 * @returns Author data
 */
export async function requireServerAuthor(redirectTo?: string) {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    const callbackUrl = redirectTo || "/";
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const author = await getServerAuthor();
  
  if (!author) {
    throw new Error('Author not found in database. Please contact support.');
  }
  
  return author;
}

/**
 * Check if user is authenticated (server-side)
 * @returns boolean indicating authentication status
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user?.id;
}

/**
 * Check if user has a specific role (server-side)
 * @param role - The role to check for
 * @returns boolean indicating if user has the role
 */
export async function hasServerRole(role: string): Promise<boolean> {
  const author = await getServerAuthor();
  return author?.role === role;
}

/**
 * Check if user is admin (server-side)
 * @returns boolean indicating admin status
 */
export async function isServerAdmin(): Promise<boolean> {
  return await hasServerRole('admin');
}

/**
 * Require admin role on the server
 * Redirects to unauthorized page if not admin
 * @returns Author data
 */
export async function requireServerAdmin() {
  const author = await requireServerAuthor();
  
  if (author.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return author;
}

// -----------------------------------------------------------------------------
// Types and Exports
// -----------------------------------------------------------------------------

export type ServerUser = Awaited<ReturnType<typeof getServerUser>>;
export type ServerAuthor = Awaited<ReturnType<typeof getServerAuthor>>;
