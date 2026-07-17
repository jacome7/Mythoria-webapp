import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';

/**
 * Story-generation credits must be charged atomically by /api/stories/complete.
 * Keeping this explicit response protects users running an older cached client.
 */
export async function POST(_request?: Request) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(
    {
      error: 'This endpoint has been retired. Refresh the page to start generation safely.',
      code: 'ATOMIC_GENERATION_REQUIRED',
    },
    { status: 410 },
  );
}
