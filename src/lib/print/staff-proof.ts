import { createHash, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, isNotNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getEnvironmentConfig } from '@/config/environment';
import { db } from '@/db';
import { readPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { printFulfillments, printProviders, printRequests, stories } from '@/db/schema';
import { createOrderTicket, getPrintSettings } from './checkout';
import { allocatePrintRequestId, printOrderNumber } from './order-number';
import {
  luluPackageId,
  shippingSchema,
  PrintError,
  validateLuluShipping,
  type PrintBinding,
  type PrintProvider,
  type PrintShippingAddress,
} from './contracts';
import { getPublishedSquareEdition, squareLuluAuthorization } from './premium-edition';

type Order = {
  request: typeof printRequests.$inferSelect;
  fulfillment: typeof printFulfillments.$inferSelect;
};
type Reader = Pick<typeof db, 'select'>;
type CreationOptions = {
  adminPrintOrder?: boolean;
  orderKind?: AdminPrintOrderInput['orderKind'];
  bookFormat?: AdminPrintOrderInput['bookFormat'];
  legacyTicketId?: string;
  requestedBy?: string;
  staffProofRevision?: string;
  creationFingerprint?: string;
  creationRevision?: string;
  dedicatedStaffProof?: boolean;
};
type OrderMatch = {
  ticketId: string;
  printRequestId: string;
  purpose: 'paid' | 'admin_order' | 'staff_proof';
  countryCode: string;
  orderNumber: string;
  copies: number;
  bookFormat: AdminPrintOrderInput['bookFormat'];
};

export type AdminPrintOrderInput = {
  storyId: string;
  bookFormat: 'premium_square' | 'standard_a5';
  binding: PrintBinding;
  copies: number;
  orderKind: 'staff_proof' | 'admin_order';
  provider: PrintProvider;
  shippingAddress: PrintShippingAddress;
  legacyTicketId?: string;
  intentId?: string;
  revision?: string;
  allowRepeat?: boolean;
  confirmSeparateLegacyShipment?: boolean;
};

function creationFingerprint(input: AdminPrintOrderInput, revision = input.revision) {
  const entries = Object.entries(shippingSchema.parse(input.shippingAddress))
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([left], [right]) => left.localeCompare(right));
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.storyId,
        input.bookFormat,
        input.binding,
        input.copies,
        input.orderKind,
        input.provider,
        revision ?? null,
        input.legacyTicketId ?? null,
        entries,
      ]),
    )
    .digest('hex');
}

function creationOptions(order: Order) {
  return (order.request.printingOptions ?? {}) as CreationOptions;
}

function replay(order: Order, input: AdminPrintOrderInput) {
  const options = creationOptions(order);
  const revision = input.revision ?? options.creationRevision ?? options.staffProofRevision;
  const expected = creationFingerprint(input, revision);
  const shipping = shippingSchema.safeParse(order.fulfillment.shippingSnapshot);
  const recorded =
    options.creationFingerprint ??
    (shipping.success
      ? creationFingerprint(
          {
            storyId: order.request.storyId,
            bookFormat: options.bookFormat ?? 'premium_square',
            orderKind: options.orderKind ?? 'staff_proof',
            binding: order.fulfillment.binding as PrintBinding,
            copies: order.fulfillment.copies,
            provider: order.fulfillment.provider as PrintProvider,
            shippingAddress: shipping.data,
            legacyTicketId: options.legacyTicketId,
          },
          options.staffProofRevision,
        )
      : undefined);
  // Some historical rows predate the snapshot fingerprint. Compare their frozen values where available.
  if (order.request.storyId !== input.storyId || (recorded && recorded !== expected)) {
    throw new PrintError(
      'print_intent_conflict',
      'This print order already has different details. Open its ticket to review the existing request.',
    );
  }
  return order;
}

function readOrders(reader: Reader) {
  return reader
    .select({ request: printRequests, fulfillment: printFulfillments })
    .from(printRequests)
    .innerJoin(printFulfillments, eq(printRequests.id, printFulfillments.printRequestId));
}

function lockAdminIntent(tx: Pick<typeof db, 'execute'>, intentId: string) {
  return tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`admin-print-intent:${intentId}`}, 0))`,
  );
}

async function rememberIntentAlias(tx: Pick<typeof db, 'update'>, order: Order, intentId?: string) {
  if (!intentId || order.fulfillment.intentId === intentId) return;
  await tx
    .update(printRequests)
    .set({
      printingOptions: sql`jsonb_set(${printRequests.printingOptions}, '{creationIntentAliases}', coalesce(${printRequests.printingOptions}->'creationIntentAliases', '[]'::jsonb) || jsonb_build_array(${intentId}::text))`,
    })
    .where(eq(printRequests.id, order.request.id));
}

async function readAdminIntent(reader: Reader, intentId: string) {
  const [order] = await readOrders(reader)
    .where(
      and(
        sql`(${printRequests.printingOptions}->>'adminPrintOrder' = 'true' or ${printRequests.printingOptions}->>'staffProofRevision' is not null)`,
        sql`(${printFulfillments.intentId} = ${intentId}::uuid or coalesce(${printRequests.printingOptions}->'creationIntentAliases', '[]'::jsonb) ? ${intentId})`,
      ),
    )
    .limit(1);
  return order;
}

function orderMatch(order: Order, purpose: OrderMatch['purpose'], ticketId: string): OrderMatch {
  const shipping = order.fulfillment.shippingSnapshot as { country_code?: string };
  return {
    ticketId,
    printRequestId: order.request.id,
    orderNumber: printOrderNumber(order.request.id),
    purpose,
    countryCode: shipping.country_code ?? '',
    copies: order.fulfillment.copies,
    bookFormat:
      creationOptions(order).bookFormat ??
      ((order.request.printingOptions as { premiumEdition?: unknown } | null)?.premiumEdition
        ? 'premium_square'
        : 'standard_a5'),
  };
}

export async function findAdminPrintOrderMatches(
  storyId: string,
  requestedThrough?: Date,
  revision?: string,
  reader: Reader = db,
) {
  const orders = await readOrders(reader)
    .where(
      and(
        eq(printRequests.storyId, storyId),
        isNotNull(printFulfillments.ticketId),
        or(
          and(
            sql`${printRequests.printingOptions}->>'staffProofRevision' is null`,
            sql`${printRequests.printingOptions}->>'adminPrintOrder' is null`,
            requestedThrough ? lte(printRequests.requestedAt, requestedThrough) : undefined,
          ),
          revision
            ? sql`${printRequests.printingOptions}->>'staffProofRevision' = ${revision}`
            : undefined,
        ),
      ),
    )
    .orderBy(desc(printRequests.requestedAt))
    .limit(20);
  return orders.flatMap((order) => {
    const ticketId = order.fulfillment.ticketId;
    const purpose = creationOptions(order).staffProofRevision ? 'staff_proof' : 'paid';
    return ticketId ? [orderMatch(order, purpose, ticketId)] : [];
  });
}

export async function createStaffPrintProof(
  input: {
    storyId: string;
    revision: string;
    shippingAddress: PrintShippingAddress;
    intentId?: string;
  },
  actor: string,
) {
  const result = await createAdminPrintOrder(
    {
      ...input,
      bookFormat: 'premium_square',
      binding: 'hardcover',
      copies: 1,
      orderKind: 'staff_proof',
      provider: 'manual',
    },
    actor,
    true,
  );
  return { ticketId: 'status' in result ? result.matches[0].ticketId : result.ticketId };
}

async function createAdminOrderTicket(
  order: {
    request: { id: string; storyId: string };
    fulfillment: { authorId: string; binding: string; copies: number };
  },
  input: {
    bookFormat: AdminPrintOrderInput['bookFormat'];
    orderKind: AdminPrintOrderInput['orderKind'];
    requestedBy: string;
    legacyTicketId?: string;
    revision?: string;
  },
) {
  const config = getEnvironmentConfig();
  try {
    const response = await fetch(new URL('/api/tickets/admin-print', config.admin.apiUrl), {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json', 'x-api-key': config.admin.apiKey },
      body: JSON.stringify({
        category: 'print_request',
        userId: order.fulfillment.authorId,
        storyId: order.request.storyId,
        shippingAddress: null,
        printFormat: order.fulfillment.binding,
        numberOfCopies: order.fulfillment.copies,
        legacyTicketId: input.legacyTicketId,
        orderDetails: {
          fulfillmentVersion: 1,
          printRequestId: order.request.id,
          adminPrintOrder: true,
          orderKind: input.orderKind,
          bookFormat: input.bookFormat,
          requestedBy: input.requestedBy,
          ...(input.orderKind === 'staff_proof' && input.revision
            ? { proofOnly: { revision: input.revision, requestedBy: input.requestedBy } }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (input.legacyTicketId && response.status === 409) {
      throw legacyUpgradeConflict();
    }
    if (response.ok) {
      const ticket = z
        .object({
          id: z.string().uuid(),
          metadata: z.object({ printRequestId: z.string().uuid() }),
        })
        .parse(await response.json());
      if (
        ticket.metadata.printRequestId === order.request.id &&
        (!input.legacyTicketId || ticket.id === input.legacyTicketId)
      )
        return ticket.id;
    }
  } catch (error) {
    if (error instanceof PrintError) throw error;
    // Retry the frozen order to recover the link after a lost response.
  }
  throw new PrintError(
    'print_ticket_pending',
    'The admin print ticket could not be linked yet. Retry to finish linking.',
    503,
  );
}

export async function createAdminPrintOrder(
  input: AdminPrintOrderInput,
  actor: string,
  dedicatedStaffProof = false,
) {
  const squareProof = input.bookFormat === 'premium_square' && input.orderKind === 'staff_proof';
  const reservation = await db.transaction(async (tx) => {
    const lock = (key: string) =>
      tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    if (input.intentId) {
      await lockAdminIntent(tx, input.intentId);
      const previous = await readAdminIntent(tx, input.intentId);
      if (previous) return { order: replay(previous, input), reused: true };
    }
    if (input.legacyTicketId && input.orderKind === 'staff_proof') {
      throw new PrintError(
        'legacy_staff_proof',
        'Choose Print and ship to upgrade an outstanding legacy ticket.',
        400,
      );
    }
    if (input.legacyTicketId) {
      await lock(`admin-ticket:${input.legacyTicketId}`);
      const [previous] = await readOrders(tx)
        .where(sql`${printRequests.printingOptions}->>'legacyTicketId' = ${input.legacyTicketId}`)
        .limit(1);
      if (previous) {
        replay(previous, input);
        await rememberIntentAlias(tx, previous, input.intentId);
        return { order: previous, reused: true };
      }
      if (!input.confirmSeparateLegacyShipment) {
        const candidates = await findAdminPrintOrderMatches(
          input.storyId,
          undefined,
          undefined,
          tx,
        );
        if (candidates.length) return { knownMatches: candidates };
      }
    }
    // Lock the revision itself so both staff entry points share the same order.
    const previousProof = async (revision: string) => {
      await lock(`staff-proof:${input.storyId}:${revision}`);
      const [previous] = await readOrders(tx)
        .where(
          and(
            eq(printRequests.storyId, input.storyId),
            sql`${printRequests.printingOptions}->>'staffProofRevision' = ${revision}`,
          ),
        )
        .limit(1);
      if (!previous) return;
      try {
        replay(previous, input);
      } catch (error) {
        if (!(error instanceof PrintError) || error.code !== 'print_intent_conflict') throw error;
        return { matchedOrders: [previous], purpose: 'staff_proof' as const };
      }
      await rememberIntentAlias(tx, previous, input.intentId);
      return { order: previous, reused: true };
    };
    if (squareProof && input.revision) {
      const previous = await previousProof(input.revision);
      if (previous) return previous;
    }
    if (input.bookFormat === 'premium_square' && input.binding !== 'hardcover') {
      throw new PrintError(
        'square_binding_required',
        'Premium Square editions only support hardcover binding.',
        400,
      );
    }
    if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 10) {
      throw new PrintError('invalid_copy_count', 'Copies must be between 1 and 10.', 400);
    }
    if (input.orderKind === 'staff_proof' && input.copies !== 1) {
      throw new PrintError('staff_proof_single_copy', 'Staff proofs are limited to 1 copy.', 400);
    }
    const [story] = await tx
      .select()
      .from(stories)
      .where(and(eq(stories.storyId, input.storyId), eq(stories.status, 'published')))
      .for('share');
    if (!story) {
      throw new PrintError(
        'story_not_published',
        'A published story is required to create a print order.',
        400,
      );
    }
    const marker =
      input.bookFormat === 'premium_square' ? readPremiumBookMarker(story.features) : null;
    const revision = marker?.state === 'published' ? marker.revision : undefined;
    if (input.revision && input.revision !== revision) {
      throw new PrintError(
        'print_edition_changed',
        'Reload the current published edition before requesting a print order.',
      );
    }
    if (squareProof && revision && !input.revision) {
      const previous = await previousProof(revision);
      if (previous) return previous;
    }
    const fingerprint = creationFingerprint(input, revision);
    if (input.intentId && !input.legacyTicketId && input.orderKind === 'admin_order') {
      await lock(`admin-print-match:${fingerprint}`);
      if (!input.allowRepeat) {
        const matches = await readOrders(tx)
          .where(
            and(
              eq(printRequests.storyId, input.storyId),
              sql`${printRequests.printingOptions}->>'creationFingerprint' = ${fingerprint}`,
              sql`${printFulfillments.status} not in ('cancelled', 'error')`,
            ),
          )
          .orderBy(desc(printRequests.requestedAt))
          .limit(5);
        if (matches.length) return { matchedOrders: matches, purpose: 'admin_order' as const };
      }
    }
    const normalizedShipping =
      input.provider === 'lulu'
        ? validateLuluShipping(input.shippingAddress)
        : input.shippingAddress;
    if (input.bookFormat === 'standard_a5' && input.provider === 'lulu')
      luluPackageId(input.binding);
    const squareLulu = input.bookFormat === 'premium_square' && input.provider === 'lulu';
    const authorization = squareLulu
      ? squareLuluAuthorization(normalizedShipping.country_code, input.orderKind === 'staff_proof')
      : null;
    if (authorization?.error) throw authorization.error;
    if (squareLulu && (await getPrintSettings(tx)).maxEurPerCopy <= 0) {
      throw new PrintError('lulu_ceiling_unset', 'Set a positive landed EUR ceiling for Lulu.');
    }

    const published =
      input.bookFormat === 'premium_square'
        ? await getPublishedSquareEdition(story, authorization?.supplier)
        : null;
    if (input.bookFormat === 'premium_square' && !published) {
      throw new PrintError(
        'square_edition_unavailable',
        'A published Premium Square edition is required for this format.',
        400,
      );
    }

    const providers = await tx
      .select()
      .from(printProviders)
      .where(eq(printProviders.isActive, true))
      .orderBy(asc(printProviders.createdAt), asc(printProviders.id));
    const provider = providers.find(
      ({ availableCountries }) =>
        Array.isArray(availableCountries) &&
        availableCountries.includes(normalizedShipping.country_code),
    );
    if (!provider) {
      throw new PrintError(
        'country_unsupported',
        'Printing is unavailable for this destination.',
        400,
      );
    }

    const id = await allocatePrintRequestId(tx);
    const [request] = await tx
      .insert(printRequests)
      .values({
        id,
        storyId: input.storyId,
        authorId: story.authorId,
        pdfUrl: '',
        printProviderId: provider.id,
        printingOptions: {
          adminPrintOrder: true,
          creationFingerprint: fingerprint,
          ...(revision ? { creationRevision: revision } : {}),
          ...(dedicatedStaffProof ? { dedicatedStaffProof: true } : {}),
          orderKind: input.orderKind,
          bookFormat: input.bookFormat,
          requestedBy: actor,
          ...(input.legacyTicketId ? { legacyTicketId: input.legacyTicketId } : {}),
          ...(input.orderKind === 'staff_proof' && published
            ? { staffProofRevision: published.edition.premiumBook.revision }
            : {}),
          ...(published ? { premiumEdition: published.edition } : {}),
        },
      })
      .returning();

    const [fulfillment] = await tx
      .insert(printFulfillments)
      .values({
        printRequestId: id,
        authorId: story.authorId,
        intentId: input.intentId ?? id,
        binding: input.binding,
        provider: input.provider,
        status: 'awaiting_ticket',
        runId: randomUUID(),
        copies: input.copies,
        creditsSpent: 0,
        shippingSnapshot: normalizedShipping,
        emailVariables: {
          email: normalizedShipping.email,
          name: normalizedShipping.name,
          storyTitle:
            input.orderKind === 'staff_proof' ? `${story.title} (staff proof)` : story.title,
          OrderNumber: printOrderNumber(id),
          OrderDate: request.requestedAt.toISOString().slice(0, 10),
          CreditCost: 0,
          numberOfCopies: input.copies,
          CoverImageURL: story.featureImageUri ?? '',
          line1: normalizedShipping.street1,
          line2: normalizedShipping.street2 ?? '',
          city: normalizedShipping.city,
          stateRegion: normalizedShipping.state_code ?? '',
          postalCode: normalizedShipping.postcode,
          country: normalizedShipping.country_code,
          phone: normalizedShipping.phone_number,
          listenURL: `https://mythoria.pt/stories/listen/${story.storyId}`,
          contactURL: 'https://mythoria.pt/contactUs',
          language: 'en-US',
        },
      })
      .returning();

    return { order: { request, fulfillment }, reused: false };
  });
  if ('knownMatches' in reservation && reservation.knownMatches) {
    return { status: 'possible_match' as const, matches: reservation.knownMatches };
  }
  if ('matchedOrders' in reservation && reservation.matchedOrders) {
    const matches = await Promise.all(
      reservation.matchedOrders.map(async (order) => {
        const linked = await linkAdminPrintOrder(order, actor, true);
        return orderMatch(order, reservation.purpose, linked.ticketId);
      }),
    );
    return { status: 'possible_match' as const, matches };
  }
  return linkAdminPrintOrder(reservation.order, actor, reservation.reused);
}

export async function recoverAdminPrintOrder(storyId: string, intentId: string, actor: string) {
  const order = await db.transaction(async (tx) => {
    await lockAdminIntent(tx, intentId);
    return readAdminIntent(tx, intentId);
  });
  if (!order || order.request.storyId !== storyId) {
    throw new PrintError(
      'print_intent_not_found',
      'No order has been recorded for this attempt.',
      404,
    );
  }
  return linkAdminPrintOrder(order, actor, true);
}

export async function recoverLegacyPrintOrderLink(
  printRequestId: string,
  ticketId: string,
  actor: string,
) {
  const [order] = await readOrders(db)
    .where(
      and(
        eq(printRequests.id, printRequestId),
        eq(printFulfillments.status, 'awaiting_ticket'),
        sql`${printRequests.printingOptions}->>'legacyTicketId' = ${ticketId}`,
      ),
    )
    .limit(1);
  if (!order) return false;
  await linkAdminPrintOrder(order, actor, true);
  return true;
}

async function linkAdminPrintOrder(order: Order, actor: string, reused: boolean) {
  if (order.fulfillment.status === 'legacy_conflict') throw legacyUpgradeConflict();
  if (order.fulfillment.ticketId) {
    return {
      ticketId: order.fulfillment.ticketId,
      printRequestId: order.request.id,
      ...(reused ? { reused: true as const } : {}),
    };
  }

  const options = creationOptions(order);
  const requestedBy = options.requestedBy ?? actor;
  const proofRevision = options.staffProofRevision;
  let ticketId: string;
  try {
    ticketId =
      proofRevision && (options.dedicatedStaffProof || !options.adminPrintOrder)
        ? await createOrderTicket(order, { revision: proofRevision, requestedBy })
        : await createAdminOrderTicket(order, {
            requestedBy,
            orderKind: options.orderKind ?? 'admin_order',
            bookFormat: options.bookFormat ?? 'standard_a5',
            legacyTicketId: options.legacyTicketId,
            revision: proofRevision,
          });
  } catch (error) {
    if (error instanceof PrintError && error.code === 'print_legacy_conflict') {
      await db
        .update(printFulfillments)
        .set({ status: 'legacy_conflict', updatedAt: new Date() })
        .where(
          and(
            eq(printFulfillments.printRequestId, order.request.id),
            eq(printFulfillments.status, 'awaiting_ticket'),
          ),
        );
    }
    throw error;
  }

  await db
    .update(printFulfillments)
    .set({ ticketId, status: 'pending', updatedAt: new Date() })
    .where(
      and(
        eq(printFulfillments.printRequestId, order.request.id),
        eq(printFulfillments.status, 'awaiting_ticket'),
      ),
    );
  return { ticketId, printRequestId: order.request.id };
}

function legacyUpgradeConflict() {
  return new PrintError(
    'print_legacy_conflict',
    'This legacy ticket cannot be upgraded. Open the original ticket to review its current fulfillment path.',
  );
}
