import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { printFulfillments, printProviders, printRequests, stories } from '@/db/schema';
import { createOrderTicket } from './checkout';
import { PrintError, type PrintShippingAddress } from './contracts';
import { getPublishedSquareEdition } from './premium-edition';

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

    const id = randomUUID();
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
          OrderNumber: id.slice(0, 8).toUpperCase(),
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
