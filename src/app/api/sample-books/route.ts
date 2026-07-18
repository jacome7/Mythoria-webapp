import { NextResponse } from 'next/server';
import { getSampleBooksCatalog } from '@/lib/sample-books/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const books = await getSampleBooksCatalog();
    return NextResponse.json(books, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Unable to build the sample book catalog', error);
    return NextResponse.json({ error: 'Unable to load sample books.' }, { status: 500 });
  }
}
