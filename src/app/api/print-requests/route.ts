import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  addresses,
  analyticsOutbox,
  printRequests,
  printProviders,
  printFulfillments,
  stories,
} from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { printOrderRequestedOutboxEntry } from '@/lib/product-generation';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import { resolveAdContextSafely } from '@/lib/openai-ads/context';
import { conversions } from '@/lib/openai-ads/events';
import { enqueueAdConversion } from '@/lib/openai-ads/outbox';
import { checkoutSchema, startPrintCheckout } from '@/lib/print/checkout';
import { PrintError } from '@/lib/print/contracts';

const statuses = z.enum([
  'requested',
  'in_printing',
  'packing',
  'shipped',
  'delivered',
  'cancelled',
  'error',
]);
const checkoutEnvelope = z.object({ checkout: checkoutSchema });
const legacyCheckout = z.object({ storyId: z.string().uuid() });

export async function GET(request: NextRequest) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const filters = z
    .object({ storyId: z.string().uuid().nullable(), status: statuses.nullable() })
    .safeParse({ storyId: params.get('storyId'), status: params.get('status') });
  if (!filters.success)
    return NextResponse.json({ success: false, error: 'Invalid filters' }, { status: 400 });
  const { storyId, status } = filters.data;
  const requests = await db
    .select({
      id: printRequests.id,
      storyId: printRequests.storyId,
      status: printRequests.status,
      requestedAt: printRequests.requestedAt,
      printedAt: printRequests.printedAt,
      updatedAt: printRequests.updatedAt,
      provider: {
        id: printProviders.id,
        name: printProviders.name,
        companyName: printProviders.companyName,
        integration: printProviders.integration,
      },
      story: {
        id: stories.storyId,
        title: stories.title,
        authorId: stories.authorId,
      },
      shippingAddress: {
        id: addresses.addressId,
        line1: addresses.line1,
        line2: addresses.line2,
        city: addresses.city,
        postalCode: addresses.postalCode,
        country: addresses.country,
        phone: addresses.phone,
      },
    })
    .from(printRequests)
    .leftJoin(printProviders, eq(printRequests.printProviderId, printProviders.id))
    .leftJoin(printFulfillments, eq(printFulfillments.printRequestId, printRequests.id))
    .leftJoin(stories, eq(printRequests.storyId, stories.storyId))
    .leftJoin(
      addresses,
      and(
        eq(printRequests.shippingId, addresses.addressId),
        eq(addresses.authorId, author.authorId),
      ),
    )
    .where(
      and(
        eq(printRequests.authorId, author.authorId),
        sql`${printRequests.printingOptions}->>'staffProofRevision' is null`,
        or(isNull(printFulfillments.status), ne(printFulfillments.status, 'awaiting_ticket')),
        storyId ? eq(printRequests.storyId, storyId) : undefined,
        status ? eq(printRequests.status, status) : undefined,
      ),
    )
    .orderBy(desc(printRequests.requestedAt));
  return NextResponse.json(
    { success: true, requests },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body: unknown = await request.json();
    if (legacyCheckout.safeParse(body).success)
      throw new PrintError(
        'refresh_print_checkout',
        'This checkout has been updated. If you already submitted an order, check your email. Reload the page to start a new order.',
      );
    const { checkout: input } = checkoutEnvelope.parse(body);
    const order = await startPrintCheckout(input, author);
    const { id, storyId, status, requestedAt } = order.request;
    const adConversion = conversions.printOrderRequested(id, order.fulfillment.copies);
    try {
      const analytics = await resolveServerAnalyticsContext({
        browserContext: input.analyticsContext,
        attributionId: request.cookies.get('mythoria_attribution')?.value,
        authorId: author.authorId,
        storedConsentValue: request.cookies.get('mythoria_consent')?.value,
      });
      const entry = printOrderRequestedOutboxEntry({
        printRequestId: id,
        storyId,
        authorId: author.authorId,
        userId: author.clerkUserId,
        creditsSpent: order.fulfillment.creditsSpent,
        numberOfCopies: order.fulfillment.copies,
        occurredAt: requestedAt,
        attributionId: analytics.attributionId,
        analyticsContext: analytics.context,
        analyticsConsent: analytics.consent,
        primaryIntent: analytics.primaryIntent,
        landingSlug: analytics.landingSlug,
      });
      if (entry)
        await db
          .insert(analyticsOutbox)
          .values(entry)
          .onConflictDoNothing({ target: analyticsOutbox.dedupeKey });
    } catch {
      console.error('[PrintOrder] Could not persist order analytics', { orderId: id });
    }
    await enqueueAdConversion(db, {
      conversion: adConversion,
      authorId: author.authorId,
      occurredAt: requestedAt,
      adContext: await resolveAdContextSafely({
        headers: request.headers,
        cookies: request.cookies,
        authorId: author.authorId,
      }),
    });
    return NextResponse.json({
      success: true,
      request: { id, storyId, status, requestedAt },
      adEventId: adConversion.eventId,
    });
  } catch (error) {
    if (error instanceof PrintError)
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Invalid print order' }, { status: 400 });
    }
    console.error('[PrintOrder] Could not place order');
    return NextResponse.json(
      { success: false, error: 'Failed to create print request' },
      { status: 500 },
    );
  }
}
