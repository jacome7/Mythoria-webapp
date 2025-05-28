import { currentUser, auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getCurrentAuthor() {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  // Try to find the author in our database
  const [author] = await db
    .select()
    .from(authors)
    .where(eq(authors.clerkUserId, user.id))
    .limit(1);

  return author || null;
}

export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Authentication required');
  }
  
  return userId;
}

export async function requireCurrentAuthor() {
  const author = await getCurrentAuthor();
  
  if (!author) {
    throw new Error('Author not found in database');
  }
  
  return author;
}
