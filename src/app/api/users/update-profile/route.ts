import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    // Get the current authenticated user
    const currentAuthor = await getCurrentAuthor();
    
    if (!currentAuthor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse the request body
    const { displayName, email, mobilePhone } = await request.json();

    // Validate required fields
    if (!displayName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Display name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email.trim() !== currentAuthor.email) {
      const existingUser = await db
        .select()
        .from(authors)
        .where(eq(authors.email, email.trim()))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].authorId !== currentAuthor.authorId) {
        return NextResponse.json(
          { error: 'This email address is already in use by another account' },
          { status: 409 }
        );
      }
    }

    // Update the author's profile
    const [updatedAuthor] = await db
      .update(authors)
      .set({
        displayName: displayName.trim(),
        email: email.trim(),
        mobilePhone: mobilePhone?.trim() || null,
      })
      .where(eq(authors.authorId, currentAuthor.authorId))
      .returning();

    return NextResponse.json({
      success: true,
      author: {
        authorId: updatedAuthor.authorId,
        displayName: updatedAuthor.displayName,
        email: updatedAuthor.email,
        mobilePhone: updatedAuthor.mobilePhone,
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
