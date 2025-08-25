import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizePreferredLocale } from '@/utils/locale-utils';

export async function POST(req: Request) {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
  const body = await req.json();
  const preferredLocaleInput = body?.preferredLocale as string | undefined;
  const normalized = normalizePreferredLocale(preferredLocaleInput);

  // (Implicit validation via normalization) If input was invalid we still coerce to 'en-US'.
  // If you want to reject unknown locales explicitly, add a guard here.

    // Update user's preferred locale in the database
    const [updatedAuthor] = await db
      .update(authors)
      .set({
  preferredLocale: normalized,
      })
      .where(eq(authors.clerkUserId, userId))
      .returning();

    if (!updatedAuthor) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

  console.log('User locale updated:', userId, 'to locale:', normalized);

    return NextResponse.json({
      success: true,
  preferredLocale: updatedAuthor.preferredLocale
    });

  } catch (error) {
    console.error('Error updating user locale:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
