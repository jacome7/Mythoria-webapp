import { ensureConfiguredLuluWebhook } from '@/lib/lulu/client';
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
  const webhookPromise = ensureConfiguredLuluWebhook()
    .then(() => true)
    .catch((error: unknown) => {
      console.warn('[PrintOrder] Lulu webhook registration check deferred', {
        code: error instanceof Error ? error.message : 'unknown',
      });
      return false;
    });
  const [orders, polled, costs, webhookEnsured] = await Promise.all([
    pendingPrintOrders(),
    pollLuluOrders(),
    pollLuluCosts(),
    webhookPromise,
  ]);
  const results = await Promise.allSettled(orders.map(({ id }) => processPrintProof(id)));
  return Response.json({
    webhookEnsured,
    vendorOrdersScanned: polled.length,
    vendorCostsScanned: costs.length,
    scanned: results.length,
    processed: results.filter((result) => result.status === 'fulfilled').length,
  });
}
