import { createHash } from 'node:crypto';
import { and, eq, or, lte, isNull } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '@/db';
import { paymentProviderEvents } from '@/db/schema/referrals';
import { ReferralError } from './policy';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonicalJson(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

export async function claimPaymentEvent(event: Stripe.Event): Promise<boolean> {
  const object = event.data.object as { id?: string };
  const payloadHash = createHash('sha256').update(canonicalJson(event.data.object)).digest('hex');
  return db.transaction(async (tx) => {
    await tx
      .insert(paymentProviderEvents)
      .values({
        providerEventId: event.id,
        eventType: event.type,
        providerObjectId: object.id || event.id,
        payloadHash,
      })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(paymentProviderEvents)
      .where(eq(paymentProviderEvents.providerEventId, event.id))
      .for('update');
    if (row.payloadHash !== payloadHash) throw new ReferralError('provider_payload_conflict', 409);
    if (row.processingStatus === 'processed') return false;
    if (row.leaseUntil && row.leaseUntil > new Date())
      throw new ReferralError('provider_event_in_progress', 409);
    await tx
      .update(paymentProviderEvents)
      .set({
        processingStatus: 'processing',
        attempts: row.attempts + 1,
        leaseUntil: new Date(Date.now() + 300000),
      })
      .where(eq(paymentProviderEvents.paymentProviderEventId, row.paymentProviderEventId));
    return true;
  });
}
export async function finishPaymentEvent(eventId: string, success: boolean) {
  await db
    .update(paymentProviderEvents)
    .set({
      processingStatus: success ? 'processed' : 'failed',
      processedAt: success ? new Date() : null,
      leaseUntil: null,
      lastError: success ? null : 'processing_failed',
    })
    .where(eq(paymentProviderEvents.providerEventId, eventId));
}
export async function retryablePaymentEvents() {
  return db
    .select()
    .from(paymentProviderEvents)
    .where(
      and(
        or(
          eq(paymentProviderEvents.processingStatus, 'failed'),
          eq(paymentProviderEvents.processingStatus, 'pending'),
          eq(paymentProviderEvents.processingStatus, 'processing'),
        ),
        or(
          isNull(paymentProviderEvents.leaseUntil),
          lte(paymentProviderEvents.leaseUntil, new Date()),
        ),
      ),
    )
    .limit(50);
}
