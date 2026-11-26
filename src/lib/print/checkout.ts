import { randomUUID } from 'node:crypto';
import { luluConfigured } from '@/lib/lulu/client';
import { isDeepStrictEqual } from 'node:util';
import { getEnvironmentConfig } from '@/config/environment';
import { and, asc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  addresses,
  authorCreditBalances,
  authors,
  creditLedger,
  pricing,
  printFulfillments,
  printFulfillmentSettings,
  printProviders,
  printRequests,
  stories,
} from '@/db/schema';
import { normalizeLocale } from '@/utils/locale-utils';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { allocatePrintRequestId, printOrderNumber } from './order-number';
import {
  luluPackageConfigured,
  luluPackageId,
  PrintError,
  shippingSchema,
  validateLuluShipping,
} from './contracts';
import {
  approvedSquareSupplier,
  getPublishedSquareEdition,
  getSquareLuluCustomerCountries,
  readSquareEdition,
  squarePrintApproved,
} from './premium-edition';

export const checkoutSchema = z.object({
  storyId: z.string().uuid(),
  shippingId: z.string().uuid(),
  intentId: z.string().uuid(),
  printingOption: z.object({
    serviceCode: z.enum(['printedSoftCover', 'printedHardCover']),
    editionRevision: z.uuid().optional(),
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

function purchasableStory(storyId: string, authorId: string) {
  return and(
    eq(stories.storyId, storyId),
    eq(stories.status, 'published'),
    or(eq(stories.isPublic, true), eq(stories.authorId, authorId)),
  );
}

const squarePriceLines = ['shippingCost', 'extraBookCopy'] as const;

function squareLuluPilotCountries(maxEurPerCopy: number) {
  return maxEurPerCopy > 0 ? getSquareLuluCustomerCountries() : [];
}

function servesPrintCountry(provider: { availableCountries: unknown }, country: string) {
  return (
    Array.isArray(provider.availableCountries) && provider.availableCountries.includes(country)
  );
}

function squareCheckoutMode(defaultProvider: string | undefined, maxEurPerCopy: number) {
  if (defaultProvider === 'lulu') {
    const supplier = approvedSquareSupplier();
    return supplier && maxEurPerCopy > 0 ? { supplier } : null;
  }
  const luluEnvironment = process.env.LULU_PRINT_ENVIRONMENT;
  const matchingLuluApproval =
    (luluEnvironment === 'sandbox' || luluEnvironment === 'production') &&
    squarePrintApproved(luluEnvironment);
  return squarePrintApproved('manual') || matchingLuluApproval ? { supplier: null } : null;
}

export async function getPurchasableSquareSupplier(
  settings?: Awaited<ReturnType<typeof getPrintSettings>>,
) {
  const { hardcoverCredits, maxEurPerCopy, defaultProvider } =
    settings ?? (await getPrintSettings());
  const mode = squareCheckoutMode(defaultProvider, maxEurPerCopy);
  if (!mode || hardcoverCredits === null) return null;
  const feeLines = await db
    .select({ serviceCode: pricing.serviceCode })
    .from(pricing)
    .where(
      and(
        eq(pricing.isActive, true),
        inArray(pricing.serviceCode, squarePriceLines),
        gte(pricing.credits, 0),
      ),
    );
  return feeLines.length === squarePriceLines.length ? mode : null;
}

export async function getPublicPrintOptions(selection?: { storyId: string; authorId: string }) {
  const settings = await getPrintSettings();
  const { defaultProvider, hardcoverCredits } = settings;
  if (selection) {
    const [story] = await db
      .select({ storyId: stories.storyId, authorId: stories.authorId, features: stories.features })
      .from(stories)
      .where(purchasableStory(selection.storyId, selection.authorId));
    if (!story)
      throw new PrintError('story_unavailable', 'The published story is unavailable.', 404);
    if (hasPremiumBookMarker(story.features)) {
      const mode = await getPurchasableSquareSupplier(settings);
      const squareEditionRevision = mode
        ? (await getPublishedSquareEdition(story, mode.supplier))?.edition.premiumBook.revision
        : undefined;
      const pilotCountries = squareEditionRevision
        ? squareLuluPilotCountries(settings.maxEurPerCopy)
        : [];
      const activeProviders = pilotCountries.length
        ? await db
            .select({ availableCountries: printProviders.availableCountries })
            .from(printProviders)
            .where(eq(printProviders.isActive, true))
        : [];
      return {
        paperbackAvailable: false,
        hardcoverAvailable: Boolean(squareEditionRevision),
        luluDefault: defaultProvider === 'lulu',
        squareEditionRevision,
        squareLuluCustomerCountries: pilotCountries.filter((country) =>
          activeProviders.some((provider) => servesPrintCountry(provider, country)),
        ),
      };
    }
  }
  return {
    paperbackAvailable: true,
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

function normalizeAddressName(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
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
      const edition = readSquareEdition(previous.request.printingOptions);
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
        (edition
          ? ((previous.request.printingOptions as { originalEditionRevision?: string })
              .originalEditionRevision ?? edition.premiumBook.revision)
          : undefined) !== input.printingOption.editionRevision ||
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
      .where(purchasableStory(input.storyId, author.authorId))
      .for('share');
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
    const street = normalizeAddressName(address.line1);
    if (
      address.line2?.trim() &&
      street &&
      [input.recipient?.name, author.displayName].some(
        (name) => name && normalizeAddressName(name) === street,
      )
    ) {
      throw new PrintError(
        'shipping_address_review_required',
        'Enter the street and house number on the first address line.',
        400,
      );
    }
    const country = address.country.toUpperCase();
    const availableProviders = await tx
      .select()
      .from(printProviders)
      .where(eq(printProviders.isActive, true))
      .orderBy(asc(printProviders.createdAt), asc(printProviders.id));
    const provider = availableProviders.find((candidate) => servesPrintCountry(candidate, country));
    if (!provider)
      throw new PrintError('country_unsupported', 'Printing is unavailable for this country.', 404);
    const serviceCode = input.printingOption.serviceCode;
    const binding = serviceCode === 'printedHardCover' ? 'hardcover' : 'paperback';
    const [setting] = await tx
      .select()
      .from(printFulfillmentSettings)
      .where(eq(printFulfillmentSettings.id, settingsId));
    const wantsSquare = hasPremiumBookMarker(story.features);
    const squareMode = wantsSquare
      ? squareCheckoutMode(setting?.defaultProvider, Number(setting?.maxEurPerCopy ?? 0))
      : null;
    if (wantsSquare && (!squareMode || binding !== 'hardcover')) {
      throw new PrintError(
        'square_print_unavailable',
        'Square hardcover printing is unavailable.',
        400,
      );
    }
    const premiumEdition =
      squareMode && (await getPublishedSquareEdition(story, squareMode.supplier))?.edition;
    if (
      (wantsSquare && !premiumEdition) ||
      premiumEdition?.premiumBook.revision !== input.printingOption.editionRevision
    ) {
      throw new PrintError(
        'print_edition_changed',
        'Refresh the checkout to confirm the current print edition.',
      );
    }
    const providerMode = setting?.defaultProvider === 'lulu' ? 'lulu' : 'manual';
    const squareLuluEligible = Boolean(
      premiumEdition &&
      squareLuluPilotCountries(Number(setting?.maxEurPerCopy ?? 0)).includes(country),
    );
    if (premiumEdition && providerMode === 'lulu' && !squareLuluEligible) {
      throw new PrintError(
        'square_lulu_country_unavailable',
        'Square hardcover shipping is unavailable for this destination.',
        400,
      );
    }
    if (!premiumEdition && binding === 'hardcover' && providerMode !== 'lulu') {
      throw new PrintError('hardcover_unavailable', 'Hardcover printing is unavailable.', 400);
    }
    if (providerMode === 'lulu') {
      if (!premiumEdition) luluPackageId(binding);
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
    if (
      !base ||
      base < 0 ||
      (premiumEdition && squarePriceLines.some((line) => (costs.get(line) ?? -1) < 0))
    )
      throw new PrintError('printing_option_unavailable', 'This print option is unavailable.', 400);
    const extraChapters = premiumEdition ? 0 : Math.max(0, story.chapterCount - 4);
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
    if (providerMode === 'lulu' || squareLuluEligible) {
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
    const orderId = await allocatePrintRequestId(tx);
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
          ...(premiumEdition
            ? { premiumEdition, originalEditionRevision: premiumEdition.premiumBook.revision }
            : {}),
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
          OrderNumber: printOrderNumber(orderId),
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
    const candidatePhone = shipping.phone_number.trim();
    if (candidatePhone) {
      await tx
        .update(authors)
        .set({ mobilePhone: candidatePhone })
        .where(
          and(
            eq(authors.authorId, author.authorId),
            or(isNull(authors.mobilePhone), sql`btrim(${authors.mobilePhone}) = ''`),
          ),
        );
    }
    return { request, fulfillment, duplicate: false };
  });
}

type CheckoutOrder = Awaited<ReturnType<typeof reservePrintCheckout>>;

export async function createOrderTicket(
  order: Pick<CheckoutOrder, 'request' | 'fulfillment'>,
  proofOnly?: { revision: string; requestedBy: string },
) {
  const config = getEnvironmentConfig();
  try {
    const endpoint = proofOnly ? '/api/tickets/staff-print' : '/api/tickets/paid-print';
    const response = await fetch(new URL(endpoint, config.admin.apiUrl), {
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
        orderDetails: { fulfillmentVersion: 1, printRequestId: order.request.id, proofOnly },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const ticket = z
        .object({
          id: z.string().uuid(),
          metadata: z.object({
            printRequestId: z.string().uuid(),
            staffProofRevision: z.uuid().optional(),
          }),
        })
        .parse(await response.json());
      if (
        ticket.metadata.printRequestId === order.request.id &&
        ticket.metadata.staffProofRevision === proofOnly?.revision
      )
        return ticket.id;
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
