import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { listOpenEntitlementsForAuthor } from '@/db/services/survey-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in author's open gifts (eligible, chosen or retryable), for the My Stories banner. */
export async function GET() {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const entitlements = await listOpenEntitlementsForAuthor(author.authorId);
    return NextResponse.json(
      { entitlements },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Error listing survey rewards:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
