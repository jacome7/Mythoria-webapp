import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { creationDraftOpens } from '@/db/schema';
import { creationOption } from '@/lib/growth/creation';
import { activeReceipt, requestAnalyticsReceipt } from '@/lib/growth/measurement-server';

const input = z.object({
  draftRef: z.string().uuid(),
  option: creationOption,
  entryKind: z.enum(['wizard', 'direct_template']),
});

export async function POST(request: NextRequest) {
  const receiptId = requestAnalyticsReceipt(request);
  if (!receiptId || request.headers.get('sec-fetch-site') === 'cross-site') {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    await db.transaction(async (tx) => {
      if (!(await activeReceipt(tx, receiptId))) return;
      await tx
        .insert(creationDraftOpens)
        .values({ ...parsed.data, receiptId })
        .onConflictDoNothing();
    });
  }
  return new NextResponse(null, { status: 204 });
}
