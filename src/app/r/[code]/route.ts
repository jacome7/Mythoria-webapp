import { NextRequest, NextResponse } from 'next/server';
import { referralCodeSchema, referralFlags } from '@/lib/referrals/policy';
import { normalizeLocale } from '@/utils/locale-utils';
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const locale = normalizeLocale(
    request.cookies.get('NEXT_LOCALE')?.value ||
      request.headers.get('accept-language')?.split(',')[0],
  );
  const destination = new URL(`/${locale}`, request.url);
  const parsed = referralCodeSchema.safeParse((await params).code);
  if (parsed.success && referralFlags().program && referralFlags().capture)
    destination.searchParams.set('referral', parsed.data);
  // A relative Location preserves the browser's origin, including local/LAN hosts.
  // Next.js may reconstruct request.url using the 0.0.0.0 listening address.
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: `${destination.pathname}${destination.search}`,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'same-origin',
    },
  });
}
