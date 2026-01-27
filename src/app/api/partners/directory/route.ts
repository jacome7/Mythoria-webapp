import { NextRequest, NextResponse } from 'next/server';
import { partnersService } from '@/db/services/partners';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const ALLOWED_TYPES = new Set(['printer', 'attraction', 'retail', 'other']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limitParam = Number(searchParams.get('limit'));
    const offsetParam = Number(searchParams.get('offset'));
    const countryCode = searchParams.get('countryCode') || undefined;
    const city = searchParams.get('city') || undefined;
    const locale = searchParams.get('locale') || undefined;
    const typeParam = searchParams.get('type') || 'printer';

    if (!ALLOWED_TYPES.has(typeParam)) {
      return NextResponse.json({ error: 'Invalid partner type' }, { status: 400 });
    }

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    const rows = await partnersService.listPublicPartners({
      type: typeParam as 'printer' | 'attraction' | 'retail' | 'other',
      countryCode,
      city,
      limit: limit + 1,
      offset,
      locale,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return NextResponse.json({
      success: true,
      items,
      nextOffset: hasMore ? offset + limit : null,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}
