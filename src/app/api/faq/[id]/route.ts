import { NextRequest, NextResponse } from 'next/server';
import { faqService } from '@/db/services';

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en-US';

    // Validate locale
    const validLocales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be one of: en-US, pt-PT, es-ES, fr-FR, de-DE' },
        { status: 400 },
      );
    }

    const faqEntry = await faqService.getFaqEntryById(resolvedParams.id, locale);

    if (!faqEntry) {
      return NextResponse.json({ error: 'FAQ entry not found or not published' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        locale,
        entry: faqEntry,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching FAQ entry:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQ entry' }, { status: 500 });
  }
}
