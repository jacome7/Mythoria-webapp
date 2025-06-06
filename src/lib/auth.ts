import { auth0 } from './auth0';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authorService } from '@/db/services';

export async function getCurrentAuthor() {
  const session = await auth0.getSession();
  
  if (!session?.user) {
    return null;
  }

  const auth0UserId = session.user.sub;
    // Try to find the author in our database
  let [author] = await db
    .select()
    .from(authors)
    .where(eq(authors.clerkUserId, auth0UserId)) // Field name will be migrated later
    .limit(1);
  // If author doesn't exist, create them
  if (!author) {
    // Create a mock user object compatible with the existing sync function
    const mockUser = {
      id: auth0UserId,
      emailAddresses: session.user.email ? [{ 
        id: 'primary', 
        emailAddress: session.user.email 
      }] : [],
      firstName: session.user.given_name || null,
      lastName: session.user.family_name || null,
      username: session.user.nickname || null,
    };
    author = await authorService.syncUserOnSignIn(mockUser);
  } else {
    // Update last login time for existing users
    const currentTime = new Date();
    [author] = await db
      .update(authors)
      .set({ lastLoginAt: currentTime })
      .where(eq(authors.clerkUserId, auth0UserId))
      .returning();
  }

  return author || null;
}

export async function requireAuth() {
  const session = await auth0.getSession();
  
  if (!session?.user?.sub) {
    throw new Error('Authentication required');
  }
  
  return session.user.sub;
}

export async function requireCurrentAuthor() {
  const author = await getCurrentAuthor();
  
  if (!author) {
    throw new Error('Author not found in database');
  }
  
  return author;
}
