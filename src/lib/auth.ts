import { currentUser, auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authorService } from '@/db/services';

export async function getCurrentAuthor() {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  // Try to find the author in our database
  let [author] = await db
    .select()
    .from(authors)
    .where(eq(authors.clerkUserId, user.id))
    .limit(1);

  // If author doesn't exist, create them
  if (!author) {
    author = await authorService.syncUserOnSignIn(user);
  } else {
    // Update last login time for existing users
    const currentTime = new Date();
    [author] = await db
      .update(authors)
      .set({ lastLoginAt: currentTime })
      .where(eq(authors.clerkUserId, user.id))
      .returning();
  }

  return author || null;
}

export async function requireAuth(locale?: string) {
  // mark unused param as intentionally unused
  void locale;
  const { userId } = await auth();
  
  if (!userId) {
  throw new Error('Authentication required');
  }
  
  return userId;
}

export async function requireCurrentAuthor(locale?: string) {
  // mark unused param as intentionally unused
  void locale;
  const author = await getCurrentAuthor();
  
  if (!author) {
  throw new Error('Author not found');
  }
  
  return author;
}

export async function getAuthDebugInfo() {
  try {
    const authData = await auth();
    const user = await currentUser();
    
    return {
      auth: authData,
      user: user ? {
        id: user.id,
        emailAddresses: user.emailAddresses,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}
