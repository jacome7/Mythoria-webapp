import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const newEmail = (body.newEmail as string | undefined)?.trim().toLowerCase();
    if (!newEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail))
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });

    // Check uniqueness
    const existing = await db.select().from(authors).where(eq(authors.email, newEmail));
    if (existing.length) {
      return NextResponse.json(
        {
          error:
            'There is already an account using that email. If this is yours, try signing in or resetting your password.',
        },
        { status: 409 },
      );
    }
    const [updated] = await db
      .update(authors)
      .set({ email: newEmail })
      .where(eq(authors.clerkUserId, userId))
      .returning();
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, email: updated.email });
  } catch (e) {
    console.error('change-email error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
