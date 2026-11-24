import { randomUUID } from 'node:crypto';
import { luluConfigured } from '@/lib/lulu/client';
import { isDeepStrictEqual } from 'node:util';
import { getEnvironmentConfig } from '@/config/environment';
import { and, asc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  addresses,
  authorCreditBalances,
  creditLedger,
  pricing,
  printFulfillments,
  printFulfillmentSettings,
  printProviders,
  printRequests,
  stories,
} from '@/db/schema';
import { normalizeLocale } from '@/utils/locale-utils';
import {
  luluPackageConfigured,
  luluPackageId,
  PrintError,
  shippingSchema,
  validateLuluShipping,
} from './contracts';

export const checkoutSchema = z.object({
  storyId: z.string().uuid(),
  shippingId: z.string().uuid(),
  intentId: z.string().uuid(),
  printingOption: z.object({
    serviceCode: z.enum(['printedSoftCover', 'printedHardCover']),
  }),
  totalCost: z.number().int().positive(),
  numberOfCopies: z.number().int().min(1).max(10).default(1),
  analyticsContext: z.unknown().optional(),
  recipient: z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(255),
      phone_number: z.string().trim().min(1).max(30),
      recipient_tax_id: z.string().trim().max(40).optional(),
    })
    .optional(),
});

export async function getPublicPrintOptions() {
  const { defaultProvider, hardcoverCredits } = await getPrintSettings();
  return {
    luluDefault: defaultProvider === 'lulu',
    hardcoverAvailable:
      defaultProvider === 'lulu' && hardcoverCredits !== null && luluPackageConfigured('hardcover'),
  };
}

const settingsId = 'global';

export async function getPrintSettings(reader: Pick<typeof db, 'select'> = db) {
  const [row] = await reader
    .select()
    .from(printFulfillmentSettings)
    .where(eq(printFulfillmentSettings.id, settingsId));
  const [hardcover] = await reader
    .select({ credits: pricing.credits, active: pricing.isActive })
    .from(pricing)
    .where(and(eq(pricing.serviceCode, 'printedHardCover'), gte(pricing.credits, 1)));
  return {
    hardcoverCredits: hardcover?.active ? hardcover.credits : null,
    savedHardcoverCredits: hardcover?.credits ?? null,
    defaultProvider: row?.defaultProvider === 'lulu' ? ('lulu' as const) : ('none' as const),
    maxEurPerCopy: Number(row?.maxEurPerCopy ?? 0),
  };
}

export async function setPrintSettings(
  config: {
    defaultProvider: 'none' | 'lulu';
    maxEurPerCopy: number;
    hardcoverCredits?: number | null;
  },
  actor: string,
) {
  if (
    config.defaultProvider === 'lulu' &&
    (!luluConfigured() || config.maxEurPerCopy <= 0 || !luluPackageConfigured('paperback'))
  ) {
    throw new PrintError(
      'lulu_not_configured',
      'Set the Lulu credentials, contact email, paperback product and positive per-copy ceiling before selecting Lulu.',
    );
  }
  if (config.defaultProvider === 'lulu' && config.hardcoverCredits) luluPackageId('hardcover');
  const values = {
    defaultProvider: config.defaultProvider,
    maxEurPerCopy: config.maxEurPerCopy.toFixed(2),
    updatedBy: actor,
    updatedAt: new Date(),
  };
  return db.transaction(async (tx) => {
    await tx
      .insert(printFulfillmentSettings)
      .values({ id: settingsId, ...values })
      .onConflictDoUpdate({ target: printFulfillmentSettings.id, set: values });
    if (config.hardcoverCredits === null) {
      await tx
        .update(pricing)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(pricing.serviceCode, 'printedHardCover'));
    } else if (config.hardcoverCredits !== undefined) {
      const hardcover = { credits: config.hardcoverCredits, isActive: true, updatedAt: new Date() };
      await tx
        .insert(pricing)
        .values({ serviceCode: 'printedHardCover', ...hardcover })
        .onConflictDoUpdate({ target: pricing.serviceCode, set: hardcover });
    }
    return getPrintSettings(tx);
  });
}

async function reservePrintCheckout(
  input: z.infer<typeof checkoutSchema>,
  author: {
    authorId: string;
    email: string;
    displayName: string;
    mobilePhone?: string | null;
    preferredLocale?: string | null;
  },
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${author.authorId}))`);
    const [previous] = await tx
      .select({ fulfillment: printFulfillments, request: printRequests })
      .from(printFulfillments)
      .innerJoin(printRequests, eq(printRequests.id, printFulfillments.printRequestId))
      .where(
        and(
          eq(printFulfillments.authorId, author.authorId),
          eq(printFulfillments.intentId, input.intentId),
        ),
      );
    if (previous) {
      if (
        previous.request.storyId !== input.storyId ||
        (previous.fulfillment.shippingSnapshot as { addressId?: string }).addressId !==
          input.shippingId ||
        !isDeepStrictEqual(
          (previous.fulfillment.shippingSnapshot as { buyerRecipient?: unknown }).buyerRecipient ??
            null,
          input.recipient ?? null,
        ) ||
        previous.fulfillment.copies !== input.numberOfCopies ||
        previous.fulfillment.creditsSpent !== input.totalCost ||
        previous.fulfillment.binding !==
          (input.printingOption.serviceCode === 'printedHardCover' ? 'hardcover' : 'paperback')
      ) {
        throw new PrintError(
          'print_intent_conflict',
          'This order reference already belongs to a different request.',
        );
      }
      return { ...previous, duplicate: true };
    }
    requirePrintReady();
    const [story] = await tx
      .select()
      .from(stories)
      .where(
        and(
          eq(stories.storyId, input.storyId),
          eq(stories.status, 'published'),
          or(eq(stories.isPublic, true), eq(stories.authorId, author.authorId)),
        ),
      );
    if (!story)
      throw new PrintError('story_unavailable', 'The published story is unavailable.', 404);
    const [address] = await tx
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.addressId, input.shippingId), eq(addresses.authorId, author.authorId)),
      );
    if (!address)
      throw new PrintError('address_unavailable', 'The shipping address is unavailable.', 404);
    const country = address.country.toUpperCase();
    const availableProviders = await tx
      .select()
      .from(printProviders)
      .where(eq(printProviders.isActive, true))
      .orderBy(asc(printProviders.createdAt), asc(printProviders.id));
    const provider = availableProviders.find(
      (candidate) =>
        Array.isArray(candidate.availableCountries) &&
        candidate.availableCountries.includes(country),
    );
    if (!provider)
      throw new PrintError('country_unsupported', 'Printing is unavailable for this country.', 404);
    const serviceCode = input.printingOption.serviceCode;
    const [setting] = await tx
      .select()
      .from(printFulfillmentSettings)
      .where(eq(printFulfillmentSettings.id, settingsId));
    const providerMode = setting?.defaultProvider === 'lulu' ? 'lulu' : 'manual';
    const binding = serviceCode === 'printedHardCover' ? 'hardcover' : 'paperback';
    if (binding === 'hardcover' && providerMode !== 'lulu') {
      throw new PrintError('hardcover_unavailable', 'Hardcover printing is unavailable.', 400);
    }
    if (providerMode === 'lulu') {
      luluPackageId(binding);
      if (!luluConfigured())
        throw new PrintError(
          'lulu_not_configured',
          'Print checkout is temporarily unavailable.',
          503,
        );
    }
    const services = await tx
      .select()
      .from(pricing)
      .where(
        and(
          eq(pricing.isActive, true),
          inArray(pricing.serviceCode, [
            serviceCode,
            'extraBookCopy',
            'extraChapterCost',
            'shippingCost',
          ]),
        ),
      );
    const costs = new Map(services.map((service) => [service.serviceCode, service.credits]));
    const base = costs.get(serviceCode);
    if (!base || base < 0)
      throw new PrintError('printing_option_unavailable', 'This print option is unavailable.', 400);
    const extraChapters = Math.max(0, story.chapterCount - 4);
    const totalCost =
      base +
      (costs.get('extraBookCopy') ?? 0) * (input.numberOfCopies - 1) +
      (costs.get('extraChapterCost') ?? 0) * extraChapters * input.numberOfCopies +
      (costs.get('shippingCost') ?? 0);
    if (totalCost !== input.totalCost)
      throw new PrintError(
        'pricing_changed',
        'Print pricing changed. Refresh the checkout and confirm the new price.',
      );
    const shipping = shippingSchema.parse({
      name: input.recipient?.name ?? author.displayName,
      street1: address.line1,
      street2: address.line2 ?? undefined,
      city: address.city,
      postcode: address.postalCode ?? '',
      country_code: country,
      state_code: address.stateRegion ?? undefined,
      phone_number: input.recipient?.phone_number ?? address.phone ?? author.mobilePhone ?? '',
      email: input.recipient?.email ?? author.email,
      recipient_tax_id: input.recipient?.recipient_tax_id || undefined,
    });
    if (providerMode === 'lulu') {
      if (!input.recipient)
        throw new PrintError(
          'shipping_details_required',
          'Complete the required shipping details.',
          400,
        );
      validateLuluShipping(shipping);
    }
    const [balance] = await tx
      .select({ credits: authorCreditBalances.totalCredits })
      .from(authorCreditBalances)
      .where(
        and(
          eq(authorCreditBalances.authorId, author.authorId),
          gte(authorCreditBalances.totalCredits, totalCost),
        ),
      );
    if (!balance) throw new PrintError('insufficient_credits', 'Insufficient credits.', 402);
    const orderId = randomUUID();
    const [request] = await tx
      .insert(printRequests)
      .values({
        id: orderId,
        authorId: author.authorId,
        storyId: story.storyId,
        pdfUrl: '',
        printProviderId: provider.id,
        shippingId: address.addressId,
        printingOptions: {
          serviceCode,
          credits: base,
          chapterCount: story.chapterCount,
          totalCost,
          extraChapters,
          numberOfCopies: input.numberOfCopies,
        },
      })
      .returning();
    const [fulfillment] = await tx
      .insert(printFulfillments)
      .values({
        printRequestId: orderId,
        authorId: author.authorId,
        intentId: input.intentId,
        provider: providerMode,
        status: 'awaiting_ticket',
        runId: randomUUID(),
        binding,
        copies: input.numberOfCopies,
        creditsSpent: totalCost,
        shippingSnapshot: {
          ...shipping,
          addressId: address.addressId,
          buyerRecipient: input.recipient,
        },
        updatedAt: new Date(),
        emailVariables: {
          name: author.displayName,
          email: author.email,
          OrderNumber: orderId.slice(0, 8).toUpperCase(),
          OrderDate: request.requestedAt.toISOString().slice(0, 10),
          CreditCost: totalCost,
          numberOfCopies: input.numberOfCopies,
          storyTitle: story.title,
          CoverImageURL: story.featureImageUri ?? '',
          line1: address.line1,
          line2: address.line2 ?? '',
          city: address.city,
          stateRegion: address.stateRegion ?? '',
          postalCode: shipping.postcode,
          country,
          phone: shipping.phone_number,
          listenURL: `https://mythoria.pt/stories/listen/${story.storyId}`,
          contactURL: 'https://mythoria.pt/contactUs',
          language: normalizeLocale(author.preferredLocale ?? undefined),
        },
      })
      .returning();
    return { request, fulfillment, duplicate: false };
  });
}

type CheckoutOrder = Awaited<ReturnType<typeof reservePrintCheckout>>;

async function createOrderTicket(order: CheckoutOrder) {
  const config = getEnvironmentConfig();
  try {
    const response = await fetch(new URL('/api/tickets/paid-print', config.admin.apiUrl), {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json', 'x-api-key': config.admin.apiKey },
      body: JSON.stringify({
        category: 'print_request',
        userId: order.fulfillment.authorId,
        storyId: order.request.storyId,
        shippingAddress: order.request.shippingId ? { addressId: order.request.shippingId } : null,
        printFormat: order.fulfillment.binding,
        numberOfCopies: order.fulfillment.copies,
        orderDetails: { fulfillmentVersion: 1, printRequestId: order.request.id },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const ticket = z
        .object({
          id: z.string().uuid(),
          metadata: z.object({ printRequestId: z.string().uuid() }),
        })
        .parse(await response.json());
      if (ticket.metadata.printRequestId === order.request.id) return ticket.id;
    }
  } catch {
    // The Admin ticket endpoint reconciles lost responses by printRequestId.
  }
  throw new PrintError(
    'print_ticket_pending',
    'The order could not be confirmed. Please retry to check its status.',
    503,
  );
}

export async function startPrintCheckout(
  input: Parameters<typeof reservePrintCheckout>[0],
  author: Parameters<typeof reservePrintCheckout>[1],
) {
  const order = await reservePrintCheckout(input, author);
  if (order.fulfillment.status !== 'awaiting_ticket') return order;
  requirePrintReady();
  const ticketId = await createOrderTicket(order);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${author.authorId}))`);
    const [current] = await tx
      .select()
      .from(printFulfillments)
      .where(eq(printFulfillments.printRequestId, order.request.id));
    if (!current)
      throw new PrintError('order_unavailable', 'The print order could not be confirmed.', 503);
    if (current.status !== 'awaiting_ticket')
      return { ...order, fulfillment: current, duplicate: true };
    const [balance] = await tx
      .update(authorCreditBalances)
      .set({
        totalCredits: sql`${authorCreditBalances.totalCredits} - ${current.creditsSpent}`,
        lastUpdated: new Date(),
      })
      .where(
        and(
          eq(authorCreditBalances.authorId, author.authorId),
          gte(authorCreditBalances.totalCredits, current.creditsSpent),
        ),
      )
      .returning();
    if (!balance) throw new PrintError('insufficient_credits', 'Insufficient credits.', 402);
    await tx.insert(creditLedger).values({
      authorId: author.authorId,
      amount: -current.creditsSpent,
      creditEventType: 'printOrder',
      storyId: order.request.storyId,
      idempotencyKey: `print_order:${order.request.id}`,
    });
    const [fulfillment] = await tx
      .update(printFulfillments)
      .set({ ticketId, status: 'pending', updatedAt: new Date() })
      .where(eq(printFulfillments.printRequestId, order.request.id))
      .returning();
    return { ...order, fulfillment, duplicate: false };
  });
}

function requirePrintReady() {
  const config = getEnvironmentConfig();
  if (
    !process.env.PRINT_PROOF_BUCKET?.trim() ||
    !process.env.PRINT_INTERNAL_AUDIENCE?.trim() ||
    !process.env.PRINT_ADMIN_SERVICE_ACCOUNT?.trim() ||
    !process.env.PRINT_SCHEDULER_SERVICE_ACCOUNT?.trim() ||
    !config.admin.apiKey ||
    !config.storyGeneration.apiKey ||
    !config.notification.apiKey
  ) {
    throw new PrintError(
      'print_checkout_unavailable',
      'Print checkout is temporarily unavailable.',
      503,
    );
  }
}
