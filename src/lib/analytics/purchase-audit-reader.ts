import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type {
  AuditAttribution,
  AuditOrder,
  AuditOutbox,
  AuditPaymentEvent,
  AuditSnapshot,
} from './purchase-audit';

/** A snapshot, not a reconciler: PostgreSQL rejects any accidental business write. */
export async function readPurchaseAuditSnapshot(toExclusive: Date): Promise<AuditSnapshot> {
  return db.transaction(
    async (tx) => {
      const guard = await tx.execute<{ readonly: string }>(
        sql`select current_setting('transaction_read_only') as readonly`,
      );
      if (guard.rows[0]?.readonly !== 'on')
        throw new Error('Purchase audit requires a READ ONLY transaction.');
      await tx.execute(sql`set local statement_timeout = '60s'`);
      const orders = await tx.execute<AuditOrder>(sql`
      select order_id as "orderId", author_id as "authorId", amount, currency, status,
        created_at as "createdAt", updated_at as "updatedAt",
        jsonb_build_object(
          'stripe', jsonb_build_object(
            'amountTotal', metadata->'stripe'->'amountTotal',
            'totalDetails', metadata->'stripe'->'totalDetails',
            'livemode', metadata->'stripe'->'livemode'),
          'analytics', jsonb_build_object('analytics_storage', metadata->'analytics'->'analytics_storage')
        ) as metadata
      from payment_orders where created_at < ${toExclusive}
      order by created_at, order_id`);
      const events = await tx.execute<AuditPaymentEvent>(sql`
      select e.event_id as "eventId", e.order_id as "orderId", e.event_type as "eventType", e.created_at as "createdAt",
        jsonb_build_object('stripeEventId', e.data->'stripeEventId', 'livemode', e.data->'livemode',
          'session', jsonb_build_object('livemode', e.data->'session'->'livemode'),
          'charge', jsonb_build_object('livemode', e.data->'charge'->'livemode', 'refunds', e.data->'charge'->'refunds')) as data
      from payment_events e join payment_orders o on o.order_id = e.order_id
      where o.created_at < ${toExclusive}
        and e.event_type in ('payment_completed', 'refund_completed', 'webhook_received')
      order by e.created_at, e.event_id`);
      const outbox = await tx.execute<AuditOutbox>(sql`
      select a.dedupe_key as "dedupeKey", a.event_name as "eventName", a.attribution_id as "attributionId",
        coalesce(length(a.client_id) > 0, false) as "hasClientId", coalesce(a.session_id > 0, false) as "hasSessionId",
        a.consent, jsonb_build_object('transaction_id', a.params->'transaction_id', 'value', a.params->'value',
          'tax', a.params->'tax', 'shipping', a.params->'shipping', 'currency', a.params->'currency',
          'customer_type', a.params->'customer_type') as params,
        a.occurred_at as "occurredAt", a.delivered_at as "deliveredAt", a.skipped_at as "skippedAt"
      from analytics_outbox a
      where a.event_name in ('purchase', 'refund') and exists (
        select 1 from payment_orders o where o.created_at < ${toExclusive}
        and (a.params->>'transaction_id' = o.order_id::text or a.dedupe_key = 'purchase:' || o.order_id::text))`);
      const attributions = await tx.execute<AuditAttribution>(sql`
      select a.attribution_id as "attributionId", a.consent, a.created_at as "createdAt", a.expires_at as "expiresAt"
      from analytics_attributions a where exists (
        select 1 from analytics_outbox ob where ob.attribution_id = a.attribution_id
        and ob.event_name in ('purchase', 'refund'))`);
      return {
        orders: orders.rows,
        events: events.rows,
        outbox: outbox.rows,
        attributions: attributions.rows,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}

export async function closePurchaseAuditConnection(): Promise<void> {
  const client = (db as unknown as { $client: { end: () => Promise<void> } }).$client;
  await client.end();
}
