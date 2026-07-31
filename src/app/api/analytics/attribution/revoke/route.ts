import { eq, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const attributionId = request.cookies.get('mythoria_attribution')?.value;
  const author = await getCurrentAuthor();
  const revokeFilter =
    attributionId && author
      ? or(
          eq(analyticsAttributions.attributionId, attributionId),
          eq(analyticsAttributions.authorId, author.authorId),
        )
      : attributionId
        ? eq(analyticsAttributions.attributionId, attributionId)
        : author
          ? eq(analyticsAttributions.authorId, author.authorId)
          : undefined;
  if (revokeFilter) {
    await db.update(analyticsAttributions).set({ expiresAt: new Date() }).where(revokeFilter);
  }
  const response = NextResponse.json({ revoked: true });
  response.cookies.set('mythoria_attribution', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
