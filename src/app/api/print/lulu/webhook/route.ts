import { z } from 'zod';
import { verifyLuluWebhook } from '@/lib/lulu/client';
import { reconcileLuluWebhook } from '@/lib/print/fulfillment';

export const dynamic = 'force-dynamic';
const payload = z.object({
  topic: z.string(),
  data: z.object({
    id: z.union([z.string().min(1), z.number().int().positive()]).transform(String),
    external_id: z.string().optional().nullable(),
  }),
});

export async function POST(request: Request) {
  const signature = request.headers.get('lulu-hmac-sha256');
  if (!signature) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = Buffer.from(await request.arrayBuffer());
  if (!(await verifyLuluWebhook(raw, signature)))
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return Response.json({ error: 'Malformed webhook' }, { status: 400 });
  }
  const parsed = payload.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Malformed webhook' }, { status: 400 });
  const { id, external_id: externalId } = parsed.data.data;
  if (
    parsed.data.topic === 'PRINT_JOB_STATUS_CHANGED' &&
    z.string().uuid().safeParse(externalId).success
  ) {
    await reconcileLuluWebhook(id, externalId ?? undefined);
  }
  return new Response(null, { status: 204 });
}
