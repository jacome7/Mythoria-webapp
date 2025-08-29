import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';

export async function GET() {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const balance = await creditService.getAuthorCreditBalance(author.authorId);
    return NextResponse.json({ balance });
  } catch (e) {
    console.error('Credit balance error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
