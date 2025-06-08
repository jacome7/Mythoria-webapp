import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema/auth";
import { authors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorService } from "@/db/services";
import type { DefaultSession, Session } from "next-auth";

// -----------------------------------------------------------------------------
// NextAuth.js Configuration
// Based on the official example and Drizzle adapter
// https://github.com/nextauthjs/next-auth-example
// -----------------------------------------------------------------------------

// Extend NextAuth types to include custom user data
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    email: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === "development",
  
  // Configure Drizzle adapter with existing schema
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  // Configure providers - starting with Google only
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  // Session configuration - use database sessions
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Configure callbacks for user data handling
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow sign in
      return true;
    },

    async session({ session, user }) {
      // Send properties to the client
      if (session.user && user) {
        session.user.id = user.id;
        session.user.email = user.email!;
        session.user.name = user.name;
        session.user.image = user.image;
      }
      return session;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.sub = user.id;
        token.email = user.email!;
      }
      return token;
    },
  },

  // Pages configuration
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },

  // Events for debugging and user sync
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email}`);
      
      // Sync user to authors table
      if (user.id && user.email) {
        await syncUserToAuthor(user.id, user.email, user.name, user.image);
      }
    },
    
    async signOut({ session, token }) {
      console.log("User signed out");
    },
  },
});

// -----------------------------------------------------------------------------
// Helper Functions for Author Management
// -----------------------------------------------------------------------------

/**
 * Sync NextAuth user to the authors table
 */
async function syncUserToAuthor(
  userId: string,
  email: string,
  name?: string | null,
  image?: string | null
) {
  try {
    // Check if author already exists
    const [existingAuthor] = await db
      .select()
      .from(authors)
      .where(eq(authors.userId, userId))
      .limit(1);

    if (existingAuthor) {
      // Update existing author
      await db
        .update(authors)
        .set({
          email,
          displayName: name || email.split('@')[0],
          lastLoginAt: new Date(),
        })
        .where(eq(authors.userId, userId));
      
      return existingAuthor;
    } else {
      // Create new author
      const [newAuthor] = await db
        .insert(authors)
        .values({
          userId,
          email,
          displayName: name || email.split('@')[0],
          lastLoginAt: new Date(),
        })
        .returning();

      return newAuthor;
    }
  } catch (error) {
    console.error("Error syncing user to author:", error);
    throw error;
  }
}

/**
 * Get the current authenticated user from NextAuth session
 */
export async function getCurrentUser(): Promise<Session["user"] | null> {
  const session = await auth();
  return session?.user || null;
}

/**
 * Get the current author from the database
 * Compatible with existing code structure
 */
export async function getCurrentAuthor() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  try {
    // Find the author in our database
    const [author] = await db
      .select()
      .from(authors)
      .where(eq(authors.userId, user.id))
      .limit(1);

    return author || null;
  } catch (error) {
    console.error("Error getting current author:", error);
    return null;
  }
}

/**
 * Require authentication and return user ID
 * Compatible with existing code structure
 */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  return session.user.id;
}

/**
 * Require authentication and return current author
 * Compatible with existing code structure
 */
export async function requireCurrentAuthor() {
  const author = await getCurrentAuthor();
  
  if (!author) {
    throw new Error('Author not found in database');
  }
  
  return author;
}
