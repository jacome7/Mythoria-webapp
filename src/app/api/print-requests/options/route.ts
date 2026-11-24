import { getPublicPrintOptions } from '@/lib/print/checkout';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getPublicPrintOptions(), { headers: { 'cache-control': 'no-store' } });
}
