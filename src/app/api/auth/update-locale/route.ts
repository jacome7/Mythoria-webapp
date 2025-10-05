import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeLocale } from '@/utils/locale-utils';
import { authorService } from '@/db/services';

export async function POST(req: Request) {
  try {
    // Get the authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const preferredLocaleInput = body?.preferredLocale as string | undefined;
    const normalized = normalizeLocale(preferredLocaleInput);

    // (Implicit validation via normalization) If input was invalid we still coerce to 'en-US'.
    // If you want to reject unknown locales explicitly, add a guard here.

    // Try updating first (fast path)
    let [updatedAuthor] = await db
      .update(authors)
      .set({ preferredLocale: normalized })
      .where(eq(authors.clerkUserId, userId))
      .returning();

    if (!updatedAuthor) {
      // Likely race: author row not created yet. Attempt to create/sync then retry once.
      try {
        const clerkUser = await currentUser();
        if (!clerkUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        // This will create or sync existing author (with detected locale) if missing
        await authorService.syncUserOnSignIn(clerkUser);
        // Retry update with requested locale (overrides detected one)
        [updatedAuthor] = await db
          .update(authors)
          .set({ preferredLocale: normalized })
          .where(eq(authors.clerkUserId, userId))
          .returning();
      } catch (createErr) {
        console.warn('Fallback author creation failed in update-locale:', createErr);
      }
    }

    if (!updatedAuthor) {
      // Still no author; return 404 for transparency
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User locale updated:', userId, 'to locale:', normalized);

    return NextResponse.json({ success: true, preferredLocale: updatedAuthor.preferredLocale });
  } catch (error) {
    console.error('Error updating user locale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
