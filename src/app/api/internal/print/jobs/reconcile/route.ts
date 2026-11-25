import {
  pendingPrintOrders,
  pollLuluCosts,
  pollLuluOrders,
  processPrintProof,
} from '@/lib/print/fulfillment';
import { verifyPrintIdentity } from '@/lib/print/oidc';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await verifyPrintIdentity(request, 'scheduler');
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [orders, polled, costs] = await Promise.all([
    pendingPrintOrders(),
    pollLuluOrders(),
    pollLuluCosts(),
  ]);
  const results = await Promise.allSettled(orders.map(({ id }) => processPrintProof(id)));
  return Response.json({
    vendorOrdersScanned: polled.length,
    vendorCostsScanned: costs.length,
    scanned: results.length,
    processed: results.filter((result) => result.status === 'fulfilled').length,
  });
}
