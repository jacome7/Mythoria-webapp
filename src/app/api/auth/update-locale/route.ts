import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    const { preferredLocale } = await req.json();
    
    // Validate locale
    const validLocales = ['en-US', 'pt-PT']; // Add more as needed
    if (!preferredLocale || !validLocales.includes(preferredLocale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be one of: ' + validLocales.join(', ') },
        { status: 400 }
      );
    }

    // Update user's preferred locale in the database
    const [updatedAuthor] = await db
      .update(authors)
      .set({
        preferredLocale: preferredLocale,
      })
      .where(eq(authors.clerkUserId, userId))
      .returning();

    if (!updatedAuthor) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User locale updated:', userId, 'to locale:', preferredLocale);

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
