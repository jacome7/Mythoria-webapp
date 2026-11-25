import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getEnvironmentConfig } from '@/config/environment';
import { db } from '@/db';
import { printFulfillments, printProviders, printRequests, stories } from '@/db/schema';
import { createOrderTicket, getPrintSettings } from './checkout';
import { allocatePrintRequestId, printOrderNumber } from './order-number';
import {
  luluPackageId,
  PrintError,
  validateLuluShipping,
  type PrintBinding,
  type PrintProvider,
  type PrintShippingAddress,
} from './contracts';
import { getPublishedSquareEdition, squareLuluAuthorization } from './premium-edition';

export async function createStaffPrintProof(
  input: { storyId: string; revision: string; shippingAddress: PrintShippingAddress },
  actor: string,
) {
  const { storyId, revision, shippingAddress } = input;
  const order = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`staff-proof:${storyId}:${revision}`}, 0))`,
    );
    const [previous] = await tx
      .select({ request: printRequests, fulfillment: printFulfillments })
      .from(printRequests)
      .innerJoin(printFulfillments, eq(printRequests.id, printFulfillments.printRequestId))
      .where(
        and(
          eq(printRequests.storyId, storyId),
          sql`${printRequests.printingOptions}->>'staffProofRevision' = ${revision}`,
        ),
      )
      .limit(1);
    if (previous) return previous;
    const [story] = await tx
      .select()
      .from(stories)
      .where(and(eq(stories.storyId, storyId), eq(stories.status, 'published')))
      .for('share');
    const published = story && (await getPublishedSquareEdition(story));
    if (!story || !published || published.edition.premiumBook.revision !== revision)
      throw new PrintError(
        'print_edition_changed',
        'Reload the current published edition before requesting a proof.',
      );

    const providers = await tx
      .select()
      .from(printProviders)
      .where(eq(printProviders.isActive, true))
      .orderBy(asc(printProviders.createdAt), asc(printProviders.id));
    const provider = providers.find(
      ({ availableCountries }) =>
        Array.isArray(availableCountries) &&
        availableCountries.includes(shippingAddress.country_code),
    );
    if (!provider)
      throw new PrintError(
        'country_unsupported',
        'Printing is unavailable for this destination.',
        400,
      );

    const id = await allocatePrintRequestId(tx);
    const [request] = await tx
      .insert(printRequests)
      .values({
        id,
        storyId,
        authorId: story.authorId,
        pdfUrl: '',
        printProviderId: provider.id,
        printingOptions: {
          staffProofRevision: revision,
          requestedBy: actor,
          premiumEdition: published.edition,
        },
      })
      .returning();
    const [fulfillment] = await tx
      .insert(printFulfillments)
      .values({
        printRequestId: id,
        authorId: story.authorId,
        intentId: id,
        binding: 'hardcover',
        provider: 'manual',
        status: 'awaiting_ticket',
        runId: randomUUID(),
        copies: 1,
        creditsSpent: 0,
        shippingSnapshot: shippingAddress,
        emailVariables: {
          email: shippingAddress.email,
          name: shippingAddress.name,
          storyTitle: `${story.title} (staff proof)`,
          OrderNumber: printOrderNumber(id),
          OrderDate: request.requestedAt.toISOString().slice(0, 10),
          CreditCost: 0,
          numberOfCopies: 1,
          CoverImageURL: '',
          line1: shippingAddress.street1,
          line2: shippingAddress.street2 ?? '',
          city: shippingAddress.city,
          stateRegion: shippingAddress.state_code ?? '',
          postalCode: shippingAddress.postcode,
          country: shippingAddress.country_code,
          phone: shippingAddress.phone_number,
          listenURL: 'https://mythoria.pt',
          contactURL: 'https://mythoria.pt/contactUs',
          language: 'en-US',
        },
      })
      .returning();
    return { request, fulfillment };
  });

  if (order.fulfillment.ticketId) return { ticketId: order.fulfillment.ticketId };
  const firstActor = (order.request.printingOptions as { requestedBy: string }).requestedBy;
  const ticketId = await createOrderTicket(order, { revision, requestedBy: firstActor });
  await db
    .update(printFulfillments)
    .set({ ticketId, status: 'pending', updatedAt: new Date() })
    .where(
      and(
        eq(printFulfillments.printRequestId, order.request.id),
        eq(printFulfillments.status, 'awaiting_ticket'),
      ),
    );
  return { ticketId };
}

export type AdminPrintOrderInput = {
  storyId: string;
  bookFormat: 'premium_square' | 'standard_a5';
  binding: PrintBinding;
  copies: number;
  orderKind: 'staff_proof' | 'admin_order';
  provider: PrintProvider;
  shippingAddress: PrintShippingAddress;
  legacyTicketId?: string;
};

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
    // Reconcilable via retry using the same legacyTicketId / story+idempotency lock.
  }
  throw new PrintError(
    'print_ticket_pending',
    'The admin print ticket could not be linked yet. Retry to finish linking.',
    503,
  );
}

export async function createAdminPrintOrder(input: AdminPrintOrderInput, actor: string) {
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
  const normalizedShipping =
    input.provider === 'lulu' ? validateLuluShipping(input.shippingAddress) : input.shippingAddress;
  if (input.bookFormat === 'standard_a5' && input.provider === 'lulu') {
    luluPackageId(input.binding);
  }

  const order = await db.transaction(async (tx) => {
    if (input.legacyTicketId) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`admin-ticket:${input.legacyTicketId}`}, 0))`,
      );
      const [existing] = await tx
        .select({ request: printRequests, fulfillment: printFulfillments })
        .from(printRequests)
        .innerJoin(printFulfillments, eq(printRequests.id, printFulfillments.printRequestId))
        .where(sql`${printRequests.printingOptions}->>'legacyTicketId' = ${input.legacyTicketId}`)
        .limit(1);
      if (existing) return existing;
    }

    const squareLulu = input.bookFormat === 'premium_square' && input.provider === 'lulu';
    const authorization = squareLulu
      ? squareLuluAuthorization(normalizedShipping.country_code, input.orderKind === 'staff_proof')
      : null;
    if (authorization?.error) throw authorization.error;
    if (squareLulu && (await getPrintSettings(tx)).maxEurPerCopy <= 0) {
      throw new PrintError('lulu_ceiling_unset', 'Set a positive landed EUR ceiling for Lulu.');
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
        intentId: id,
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

    return { request, fulfillment };
  });

  if (order.fulfillment.ticketId) {
    return { ticketId: order.fulfillment.ticketId, printRequestId: order.request.id };
  }

  const options = (order.request.printingOptions ?? {}) as {
    requestedBy?: string;
    orderKind?: AdminPrintOrderInput['orderKind'];
    bookFormat?: AdminPrintOrderInput['bookFormat'];
    legacyTicketId?: string;
    staffProofRevision?: string;
  };
  const ticketId = await createAdminOrderTicket(order, {
    requestedBy: options.requestedBy ?? actor,
    orderKind: options.orderKind ?? input.orderKind,
    bookFormat: options.bookFormat ?? input.bookFormat,
    legacyTicketId: options.legacyTicketId ?? input.legacyTicketId,
    revision: options.staffProofRevision,
  });

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
