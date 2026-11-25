import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { printFulfillmentCosts, printFulfillments } from '@/db/schema';
import { vendorSchema } from './contracts';
import { getEcbLuluRate } from './lulu-fx';

type NativeCost = { currency: string; amountExclTax: string };
type StoredCost = typeof printFulfillmentCosts.$inferSelect;

export async function recordLuluNativeCost(
  printRequestId: string,
  jobId: string,
  vendorUpdatedAt: Date,
  { currency, amountExclTax }: NativeCost,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ vendor: printFulfillments.vendor })
      .from(printFulfillments)
      .where(
        and(
          eq(printFulfillments.printRequestId, printRequestId),
          eq(printFulfillments.provider, 'lulu'),
          eq(printFulfillments.status, 'submitted'),
          eq(printFulfillments.updatedAt, vendorUpdatedAt),
        ),
      )
      .for('update');
    const vendor = vendorSchema.safeParse(row?.vendor).data;
    if (vendor?.environment !== 'production' || vendor.id !== jobId || !vendor.createdAt) return;

    const jobCreatedAt = new Date(vendor.createdAt);
    const jobDate = vendor.createdAt.slice(0, 10);
    const [existing] = await tx
      .select()
      .from(printFulfillmentCosts)
      .where(eq(printFulfillmentCosts.printRequestId, printRequestId))
      .for('update');
    if (
      existing &&
      (existing.luluJobId !== jobId || existing.jobCreatedAt.getTime() !== jobCreatedAt.getTime())
    )
      throw new Error('LULU_COST_JOB_MISMATCH');

    const sameCurrency = existing?.currency === currency;
    const fxRate = currency === 'EUR' ? '1' : sameCurrency ? existing.fxRate : null;
    const fxRateDate = currency === 'EUR' ? jobDate : sameCurrency ? existing.fxRateDate : null;
    const fields = {
      amountExclTax,
      currency,
      fxRate,
      fxRateDate,
      amountEur: fxRate ? sql`round(${amountExclTax}::numeric / ${fxRate}::numeric, 2)` : null,
      updatedAt: new Date(),
    };
    const [saved] = await tx
      .insert(printFulfillmentCosts)
      .values({ printRequestId, luluJobId: jobId, jobCreatedAt, ...fields })
      .onConflictDoUpdate({
        target: printFulfillmentCosts.printRequestId,
        set: fields,
        setWhere: sql`${printFulfillmentCosts.currency} IS DISTINCT FROM ${currency}
          OR ${printFulfillmentCosts.amountExclTax} IS DISTINCT FROM ${amountExclTax}::numeric`,
      })
      .returning();
    return saved ?? existing;
  });
}

export async function convertLuluCostToEur(cost: StoredCost) {
  if (cost.amountEur !== null) return;
  const jobDate = cost.jobCreatedAt.toISOString().slice(0, 10);
  // Wait until the UTC job date is complete to avoid selecting yesterday's rate before release.
  if (jobDate >= new Date().toISOString().slice(0, 10)) return;
  const observation = await getEcbLuluRate(cost.currency, jobDate);
  if (!observation) return;
  await db
    .update(printFulfillmentCosts)
    .set({
      fxRate: observation.rate,
      fxRateDate: observation.date,
      amountEur: sql`round(${printFulfillmentCosts.amountExclTax} / ${observation.rate}::numeric, 2)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(printFulfillmentCosts.printRequestId, cost.printRequestId),
        eq(printFulfillmentCosts.luluJobId, cost.luluJobId),
        eq(printFulfillmentCosts.currency, cost.currency),
        isNull(printFulfillmentCosts.amountEur),
      ),
    );
}
