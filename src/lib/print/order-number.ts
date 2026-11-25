import { randomUUID } from 'node:crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { db } from '@/db';
import { printRequests } from '@/db/schema';
import { PrintError } from './contracts';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const luluOrderNumberPattern = /^[0-9A-F]{8}$/;

export function printOrderNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export async function printOrderNumberInUse(tx: Transaction, number: string, exceptId?: string) {
  // Checkout and Lulu release share this lock. Keep the lookup in a separate
  // statement so it sees any order committed by the previous lock holder.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`print-order:${number}`}, 0))`,
  );
  const [conflict] = await tx
    .select({ conflictingPrintRequestId: printRequests.id })
    .from(printRequests)
    .where(
      and(
        eq(sql`left(${printRequests.id}::text, 8)`, number.toLowerCase()),
        exceptId ? ne(printRequests.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(conflict);
}

export async function allocatePrintRequestId(tx: Transaction) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomUUID();
    if (!(await printOrderNumberInUse(tx, printOrderNumber(id)))) return id;
  }
  throw new PrintError(
    'print_order_number_unavailable',
    'Could not assign a print order number.',
    503,
  );
}
