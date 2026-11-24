import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db';
import {
  printFulfillments,
  printRequests,
  printProviders,
  printFulfillmentSettings,
} from '@/db/schema';
import { getEnvironmentConfig } from '@/config/environment';
import {
  findLuluJob,
  getLuluCoverDimensions,
  getLuluJob,
  getLuluJobCosts,
  LuluHttpError,
  quoteLuluOrder,
  submitLuluJob,
  validateLuluFile,
} from '@/lib/lulu/client';
import { getPrintSettings } from './checkout';
import {
  bindingSchema,
  emailVariablesSchema,
  luluPackageId,
  luluPageCountSupported,
  PrintError,
  proofSchema,
  providerSchema,
  quoteSchema,
  shippingSchema,
  vendorSchema,
  validateLuluShipping,
  type PrintShippingAddress,
  type PrintProof,
  type PrintProvider,
  type PrintVendor,
} from './contracts';
import { assetFile, renderOrderProof, signedProofLink } from './proof';

const duration = {
  preview: 20 * 60_000,
  customer: 6 * 24 * 60 * 60_000,
  supplier: 2 * 24 * 60 * 60_000,
  lease: 22 * 60_000,
};
const editable = ['pending', 'proof_ready', 'held', 'manual_review'];
const views = () =>
  db
    .select({ fulfillment: printFulfillments, request: printRequests })
    .from(printFulfillments)
    .innerJoin(printRequests, eq(printRequests.id, printFulfillments.printRequestId));

async function readOrder(id: string) {
  const [row] = await views().where(eq(printFulfillments.printRequestId, id));
  if (!row)
    throw new PrintError('print_order_not_found', 'The paid print order was not found.', 404);
  return row;
}

type Order = Awaited<ReturnType<typeof readOrder>>;
type Changes = Partial<typeof printFulfillments.$inferInsert>;

function renderInput(order: Order) {
  return {
    storyId: order.request.storyId,
    orderId: order.request.id,
    runId: order.fulfillment.runId,
    provider: providerSchema.parse(order.fulfillment.provider),
    binding: bindingSchema.parse(order.fulfillment.binding),
  };
}

const validationSchema = proofSchema.extend({
  podPackageId: z.string().optional(),
  interiorValidationId: z.string().optional(),
  coverValidationId: z.string().optional(),
});

function proofLinks(order: Order, proof: PrintProof, expires: number) {
  const input = renderInput(order);
  return Promise.all([
    signedProofLink(proof.interior, input, 'interior', expires),
    signedProofLink(proof.cover, input, 'cover', expires),
  ]);
}

async function leaseUpdate(order: Order, leaseId: string, changes: Changes) {
  const [row] = await db
    .update(printFulfillments)
    .set({ ...changes, updatedAt: new Date() })
    .where(
      and(
        eq(printFulfillments.printRequestId, order.request.id),
        eq(printFulfillments.leaseId, leaseId),
      ),
    )
    .returning();
  if (!row)
    throw new PrintError('stale_print_attempt', 'This order changed while the operation ran.');
  return { ...order, fulfillment: row };
}

function nextRevisionTime(order: Order) {
  return new Date(Math.max(Date.now(), order.fulfillment.updatedAt.getTime() + 1));
}

async function editableUpdate(
  order: Order,
  changes: Changes,
  writer: Pick<typeof db, 'update'> = db,
) {
  const [row] = await writer
    .update(printFulfillments)
    .set({ ...changes, updatedAt: nextRevisionTime(order) })
    .where(
      and(
        eq(printFulfillments.printRequestId, order.request.id),
        eq(printFulfillments.proofVersion, order.fulfillment.proofVersion),
        eq(printFulfillments.status, order.fulfillment.status),
        eq(printFulfillments.updatedAt, order.fulfillment.updatedAt),
        isNull(printFulfillments.leaseId),
      ),
    )
    .returning();
  if (!row)
    throw new PrintError(
      'stale_print_attempt',
      'The print order changed. Reload it and try again.',
    );
  return { ...order, fulfillment: row };
}

function requireEditable(order: Order) {
  if (!editable.includes(order.fulfillment.status) || order.fulfillment.leaseId) {
    throw new PrintError(
      'print_order_locked',
      'This order cannot be changed while fulfillment is active.',
    );
  }
}

async function notifyProof(order: Order, proof: PrintProof) {
  const config = getEnvironmentConfig();
  const variables = emailVariablesSchema.parse(order.fulfillment.emailVariables);
  const [interiorDownloadUrl, coverDownloadUrl] = await proofLinks(order, proof, duration.customer);
  const response = await fetch(new URL('/email/print-order-proof', config.notification.engineUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.notification.apiKey },
    body: JSON.stringify({
      printRequestId: order.request.id,
      proofVersion: order.fulfillment.proofVersion,
      recipient: { email: variables.email, name: variables.name, language: variables.language },
      variables: {
        ...variables,
        readStoryURL: new URL(
          `/${variables.language}/stories/read/${order.request.storyId}`,
          variables.listenURL,
        ).href,
        shareStoryURL: new URL(
          `/${variables.language}/stories/${order.request.storyId}`,
          variables.listenURL,
        ).href,
      },
      interiorUri: `gs://${proof.interior.bucket}/${proof.interior.object}`,
      coverUri: `gs://${proof.cover.bucket}/${proof.cover.object}`,
      interiorGeneration: proof.interior.generation,
      coverGeneration: proof.cover.generation,
      interiorSha256: proof.interior.sha256,
      coverSha256: proof.cover.sha256,
      interiorDownloadUrl,
      coverDownloadUrl,
      revised: variables.previousProofMayHaveSent ?? false,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (response.status !== 200)
    throw new PrintError('print_proof_email_pending', 'Proof email delivery is pending.', 502);
}

async function generateProof(order: Order, leaseId: string) {
  const input = renderInput(order);
  if (input.provider === 'manual')
    return { order, proof: proofSchema.parse(await renderOrderProof(input)) };
  const preliminary = await renderOrderProof(input);
  assetFile(preliminary.interior, input, 'interior');
  if (!luluPageCountSupported(input.binding, preliminary.pageCount)) {
    if (input.binding === 'hardcover')
      throw new PrintError(
        'unsupported_hardcover',
        'The hardcover page count is outside Lulu limits. Review fulfillment manually.',
      );
    const fallback = await leaseUpdate(order, leaseId, {
      provider: 'manual',
      runId: randomUUID(),
      lastError: 'Lulu page count is out of range. Use manual fulfillment.',
    });
    return {
      order: fallback,
      proof: proofSchema.parse(await renderOrderProof(renderInput(fallback))),
    };
  }
  const podPackageId = luluPackageId(input.binding);
  const dimensions = await getLuluCoverDimensions({
    podPackageId,
    pageCount: preliminary.pageCount,
  });
  const proof = proofSchema.parse(await renderOrderProof(input, dimensions));
  if (
    proof.pageCount !== preliminary.pageCount ||
    proof.interior.sha256 !== preliminary.interior.sha256
  ) {
    throw new PrintError('print_proof_mismatch', 'The interior changed while preparing the cover.');
  }
  return { order, proof: { ...proof, podPackageId } };
}

export async function processPrintProof(id: string) {
  let order = await readOrder(id);
  const leaseId = randomUUID();
  const now = new Date();
  const [claimed] = await db
    .update(printFulfillments)
    .set({
      status: 'preparing',
      leaseId,
      leaseUntil: new Date(now.getTime() + duration.lease),
      updatedAt: now,
    })
    .where(
      and(
        eq(printFulfillments.printRequestId, id),
        inArray(printFulfillments.status, ['pending', 'preparing']),
        or(isNull(printFulfillments.leaseId), lt(printFulfillments.leaseUntil, now)),
      ),
    )
    .returning();
  if (!claimed) return order;
  order = { ...order, fulfillment: claimed };
  try {
    if (!order.fulfillment.ticketId)
      throw new PrintError('missing_print_ticket', 'Paid print ticket is unavailable.', 500);
    let proof = proofSchema.nullable().parse(order.fulfillment.proof);
    if (!proof) {
      const result = await generateProof(order, leaseId);
      order = result.order;
      proof = result.proof;
      const input = renderInput(order);
      assetFile(proof.interior, input, 'interior');
      assetFile(proof.cover, input, 'cover');
      order = await leaseUpdate(order, leaseId, { proof });
    }
    if (!proof.qaPassed || proof.qaCriticalCount > 0) {
      return leaseUpdate(order, leaseId, {
        status: 'manual_review',
        lastError: 'Proof QA requires review.',
        leaseId: null,
        leaseUntil: null,
      });
    }
    if (!order.fulfillment.proofSentAt) {
      const variables = emailVariablesSchema.parse(order.fulfillment.emailVariables);
      if (!variables.proofEmailAttempted) {
        order = await leaseUpdate(order, leaseId, {
          emailVariables: { ...variables, proofEmailAttempted: true },
        });
      }
      await notifyProof(order, proof);
      order = await leaseUpdate(order, leaseId, { proofSentAt: new Date() });
    }
    let quote = quoteSchema.nullable().parse(order.fulfillment.quote);
    if (order.fulfillment.provider === 'lulu' && !quote) {
      try {
        quote = await quoteForOrder(order, leaseId);
        order = await leaseUpdate(order, leaseId, { quote });
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'LULU_NO_TRACKED_SHIPPING') throw error;
        if (order.fulfillment.binding === 'hardcover') {
          return leaseUpdate(order, leaseId, {
            status: 'held',
            holdReason: 'No tracked hardcover shipping is available.',
            leaseId: null,
            leaseUntil: null,
          });
        }
        const variables = emailVariablesSchema.parse(order.fulfillment.emailVariables);
        return leaseUpdate(order, leaseId, {
          emailVariables: {
            ...variables,
            previousProofMayHaveSent: true,
            proofEmailAttempted: false,
          },
          status: 'pending',
          provider: 'manual',
          runId: randomUUID(),
          proofVersion: order.fulfillment.proofSentAt
            ? order.fulfillment.proofVersion + 1
            : order.fulfillment.proofVersion,
          proof: null,
          proofSentAt: null,
          quote: null,
          leaseId: null,
          leaseUntil: null,
          lastError: 'Lulu has no tracked shipping for the destination. Preparing a manual proof.',
        });
      }
    }
    return leaseUpdate(order, leaseId, {
      quote,
      status: 'proof_ready',
      leaseId: null,
      leaseUntil: null,
    });
  } catch (error) {
    const supplierIssue =
      error instanceof Error
        ? {
            LULU_INTERIOR_REJECTED: 'Lulu rejected the interior PDF.',
            LULU_COVER_REJECTED: 'Lulu rejected the cover PDF.',
            LULU_INTERIOR_MISMATCH: 'Lulu reported a different final page count or product.',
            LULU_NO_TRACKED_SHIPPING: 'Lulu returned no tracked shipping option for this address.',
            LULU_ADDRESS_CONFIRMATION_REQUIRED:
              'Lulu requires the shipping address to be reviewed.',
          }[error.message]
        : undefined;
    if (error instanceof PrintError && error.code === 'unsupported_hardcover') {
      return leaseUpdate(order, leaseId, {
        status: 'held',
        holdReason: error.message,
        leaseId: null,
        leaseUntil: null,
      });
    }
    if (error instanceof Error && error.message === 'LULU_ADDRESS_CONFIRMATION_REQUIRED') {
      return leaseUpdate(order, leaseId, {
        status: 'held',
        holdReason: supplierIssue,
        leaseId: null,
        leaseUntil: null,
      });
    }
    return leaseUpdate(order, leaseId, {
      status:
        supplierIssue || (error instanceof PrintError && error.status < 500)
          ? 'manual_review'
          : 'pending',
      lastError:
        supplierIssue ??
        (error instanceof PrintError ? error.message : 'Print proof preparation is pending.'),
      leaseId: null,
      leaseUntil: null,
    });
  }
}

async function quoteForOrder(order: Order, leaseId: string) {
  const proof = validationSchema.parse(order.fulfillment.proof);
  const input = renderInput(order);
  const [interiorUrl, coverUrl] = await proofLinks(order, proof, duration.supplier);
  const podPackageId = luluPackageId(input.binding);
  if (proof.podPackageId && proof.podPackageId !== podPackageId) {
    throw new PrintError(
      'lulu_print_profile_changed',
      'Prepare a new proof for the configured Lulu product.',
    );
  }
  const options = { podPackageId, pageCount: proof.pageCount };
  const shippingAddress = validateLuluShipping(
    shippingSchema.parse(order.fulfillment.shippingSnapshot),
  );
  const interiorValidationId = await validateLuluFile(
    'interior',
    { ...options, sourceUrl: interiorUrl },
    proof.interiorValidationId,
    async (id) => {
      await leaseUpdate(order, leaseId, {
        proof: { ...proof, podPackageId, interiorValidationId: id },
      });
    },
  );
  await validateLuluFile(
    'cover',
    { ...options, sourceUrl: coverUrl },
    proof.coverValidationId,
    async (id) => {
      await leaseUpdate(order, leaseId, {
        proof: { ...proof, podPackageId, interiorValidationId, coverValidationId: id },
      });
    },
  );
  const quote = await quoteLuluOrder({
    ...options,
    copies: order.fulfillment.copies,
    shippingAddress,
  });
  return quoteSchema.parse({
    ...quote,
    perCopyEur: quote.totalEur / order.fulfillment.copies,
    confirmationId: randomUUID(),
    podPackageId,
  });
}

export async function withPrintTicket(id: string, ticketId: string) {
  const order = await readOrder(id);
  if (order.fulfillment.ticketId !== ticketId) {
    throw new PrintError(
      'print_ticket_mismatch',
      'This ticket is not linked to the paid print order.',
      404,
    );
  }
  return order;
}

export async function hasPaidOrderForStory(storyId: string, requestedThrough?: Date) {
  const [order] = await db
    .select({ id: printFulfillments.printRequestId })
    .from(printFulfillments)
    .innerJoin(printRequests, eq(printRequests.id, printFulfillments.printRequestId))
    .where(
      and(
        eq(printRequests.storyId, storyId),
        requestedThrough
          ? lt(printRequests.requestedAt, new Date(requestedThrough.getTime() + 1))
          : undefined,
      ),
    )
    .limit(1);
  return Boolean(order);
}

export async function printOrderView(order: Order) {
  const row = order.fulfillment;
  const proof = proofSchema.nullable().parse(row.proof);
  const [interiorUrl, coverUrl] = proof
    ? await proofLinks(order, proof, duration.preview)
    : [null, null];
  const settings = await getPrintSettings();
  const { recipient_tax_id: taxId, ...shippingAddress } = shippingSchema.parse(
    row.shippingSnapshot,
  );
  return {
    shippingAddress,
    taxIdPresent: Boolean(taxId),
    printRequestId: row.printRequestId,
    ticketId: row.ticketId,
    provider: row.provider,
    status: row.status,
    binding: row.binding,
    copies: row.copies,
    proofVersion: row.proofVersion,
    proof: proof && {
      pageCount: proof.pageCount,
      qaPassed: proof.qaPassed && !proof.qaCriticalCount,
      issues: proof.issues,
      sentAt: row.proofSentAt,
      interiorUrl,
      coverUrl,
    },
    holdReason: row.holdReason,
    quote: row.quote,
    vendor: row.vendor,
    lastError: row.lastError,
    maxEurPerCopy: settings.maxEurPerCopy,
  };
}

export async function queuePrintPreparation(order: Order) {
  if (order.fulfillment.status === 'preparing' || order.fulfillment.status === 'pending')
    return order;
  requireEditable(order);
  if (order.fulfillment.holdReason || order.fulfillment.status === 'proof_ready') return order;
  return editableUpdate(order, { status: 'pending', lastError: null });
}

export async function setPrintHold(order: Order, reason: string | null) {
  requireEditable(order);
  return editableUpdate(order, {
    holdReason: reason,
    status: reason
      ? 'held'
      : order.fulfillment.proofSentAt &&
          (order.fulfillment.provider === 'manual' || order.fulfillment.quote)
        ? 'proof_ready'
        : 'pending',
  });
}

export async function revisePrintProof(order: Order, provider?: PrintProvider) {
  requireEditable(order);
  const row = order.fulfillment;
  const chosen = provider ?? providerSchema.parse(row.provider);
  if (provider && chosen === row.provider) return order;
  if (chosen === 'lulu') {
    luluPackageId(bindingSchema.parse(row.binding));
    validateLuluShipping(shippingSchema.parse(row.shippingSnapshot));
  }
  const variables = emailVariablesSchema.parse(row.emailVariables);
  return editableUpdate(order, {
    emailVariables: {
      ...variables,
      previousProofMayHaveSent:
        variables.previousProofMayHaveSent ||
        variables.proofEmailAttempted ||
        Boolean(row.proofSentAt),
      proofEmailAttempted: false,
    },
    provider: chosen,
    proofVersion: row.proofVersion + 1,
    runId: randomUUID(),
    proof: null,
    proofSentAt: null,
    quote: null,
    lastError: null,
    status: row.holdReason ? 'held' : 'pending',
  });
}

export async function submitPrintOrder(
  order: Order,
  input: { confirmationId: string; confirmedTotalEur: number },
  actor: string,
) {
  const row = order.fulfillment;
  if (row.status === 'submitted' || row.status === 'submitting' || row.status === 'uncertain')
    return order;
  const proof = proofSchema.nullable().parse(row.proof);
  const quote = quoteSchema.nullable().parse(row.quote);
  if (
    row.provider !== 'lulu' ||
    row.status !== 'proof_ready' ||
    row.holdReason ||
    !row.proofSentAt ||
    !proof?.qaPassed ||
    proof.qaCriticalCount > 0 ||
    !quote ||
    quote.confirmationId !== input.confirmationId ||
    quote.totalEur !== input.confirmedTotalEur
  ) {
    throw new PrintError(
      'print_not_approved',
      'Confirm the current emailed proof and landed price first.',
    );
  }
  if (quote.podPackageId !== luluPackageId(bindingSchema.parse(row.binding))) {
    throw new PrintError(
      'lulu_print_profile_changed',
      'Prepare a new proof for the configured Lulu product.',
    );
  }
  const shippingAddress = validateLuluShipping(shippingSchema.parse(row.shippingSnapshot));
  const fresh = await quoteLuluOrder({
    shippingAddress,
    copies: row.copies,
    podPackageId: quote.podPackageId,
    pageCount: proof.pageCount,
  }).catch((error: unknown) => {
    if (
      error instanceof Error &&
      ['LULU_ADDRESS_CONFIRMATION_REQUIRED', 'LULU_NO_TRACKED_SHIPPING'].includes(error.message)
    )
      return null;
    throw error;
  });
  if (!fresh) {
    return editableUpdate(order, {
      status: 'held',
      quote: null,
      holdReason:
        'Lulu shipping changed. Review the address and available fulfillment before releasing.',
    });
  }
  const currentQuote = quoteSchema.parse({
    ...fresh,
    podPackageId: quote.podPackageId,
    perCopyEur: fresh.totalEur / row.copies,
    confirmationId: randomUUID(),
  });
  if (
    currentQuote.totalEur !== quote.totalEur ||
    currentQuote.shippingLevel !== quote.shippingLevel ||
    currentQuote.podPackageId !== quote.podPackageId
  ) {
    return editableUpdate(order, {
      quote: currentQuote,
      lastError: 'Lulu pricing changed. Confirm the revised price.',
    });
  }
  const [interiorUrl, coverUrl] = await proofLinks(order, proof, duration.supplier);
  order = await db.transaction(async (tx) => {
    const [setting] = await tx
      .select({ max: printFulfillmentSettings.maxEurPerCopy })
      .from(printFulfillmentSettings)
      .where(eq(printFulfillmentSettings.id, 'global'))
      .for('share');
    const ceiling = Number(setting?.max ?? 0);
    if (
      ceiling <= 0 ||
      Math.round(currentQuote.totalEur * 100) > Math.round(ceiling * 100) * row.copies
    ) {
      throw new PrintError(
        'lulu_ceiling_exceeded',
        'The landed EUR cost exceeds the per-copy ceiling.',
      );
    }
    return editableUpdate(
      order,
      { status: 'submitting', approvedAt: new Date(), approvedBy: actor, lastError: null },
      tx,
    );
  });
  let receipt: PrintVendor;
  try {
    receipt = vendorSchema.parse(
      await submitLuluJob({
        externalId: order.request.id,
        podPackageId: quote.podPackageId,
        copies: row.copies,
        shippingAddress,
        interiorUrl,
        coverUrl,
        shippingLevel: quote.shippingLevel,
        title: emailVariablesSchema.parse(row.emailVariables).storyTitle,
      }),
    );
    if (!vendorMatchesOrder(order.request.id, receipt)) throw new Error('LULU_CREATE_MISMATCH');
  } catch (error) {
    if (error instanceof LuluHttpError && error.status === 400) {
      return editableUpdate(order, {
        status: 'manual_review',
        quote: null,
        lastError: 'Lulu rejected the print order before creating a job.',
      });
    }
    return editableUpdate(order, {
      status: 'uncertain',
      lastError:
        'Lulu submission may have succeeded. Reconcile this order before any further action.',
    });
  }
  return recordVendor(order, receipt);
}

function statusForVendor(status: string) {
  switch (status.toUpperCase()) {
    case 'IN_PRODUCTION':
      return 'in_printing' as const;
    case 'SHIPPED':
      return 'shipped' as const;
    case 'DELIVERED':
      return 'delivered' as const;
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelled' as const;
    case 'ERROR':
    case 'REJECTED':
      return 'error' as const;
    default:
      return null;
  }
}

function vendorMatchesOrder(orderId: string, vendor: PrintVendor) {
  return (
    vendor.externalId === orderId &&
    vendor.lines?.length === 1 &&
    vendor.lines[0].external_id === orderId + '-1'
  );
}

function priorVendor(order: Order) {
  return vendorSchema.nullable().parse(order.fulfillment.vendor);
}

async function recordVendor(order: Order, value: PrintVendor) {
  if (!vendorMatchesOrder(order.request.id, value)) return order;
  const previous = priorVendor(order);
  const costs = await getLuluJobCosts(value.id).catch(() => previous?.costs);
  const vendor = { ...value, costs };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(printFulfillments)
      .set({ status: 'submitted', vendor, lastError: null, updatedAt: nextRevisionTime(order) })
      .where(
        and(
          eq(printFulfillments.printRequestId, order.request.id),
          eq(printFulfillments.updatedAt, order.fulfillment.updatedAt),
          inArray(printFulfillments.status, ['submitting', 'uncertain', 'submitted']),
        ),
      )
      .returning();
    if (!row)
      throw new PrintError(
        'stale_print_attempt',
        'The Lulu order status was updated concurrently.',
      );
    const status = statusForVendor(vendor.status);
    if (status)
      await tx
        .update(printRequests)
        .set({ status, updatedAt: new Date() })
        .where(eq(printRequests.id, order.request.id));
    return { ...order, fulfillment: row };
  });
}

export async function reconcilePrintOrder(order: Order) {
  const row = order.fulfillment;
  if (
    row.status === 'manual_dispatching' &&
    row.approvedAt &&
    Date.now() - row.approvedAt.getTime() >= duration.lease
  ) {
    return editableUpdate(order, {
      status: 'manual_uncertain',
      lastError: 'Manual dispatch may have succeeded. Check the provider email.',
    });
  }
  if (!['submitting', 'uncertain', 'submitted'].includes(row.status)) return order;
  const vendor = priorVendor(order);
  const result = vendor ? await getLuluJob(vendor.id) : await findLuluJob(order.request.id);
  if (result) return recordVendor(order, vendorSchema.parse(result));
  if (row.status === 'submitting' && row.updatedAt.getTime() < Date.now() - 2 * 60_000) {
    return editableUpdate(order, {
      status: 'uncertain',
      lastError: 'No Lulu job has been found. Keep the order on hold while you reconcile it.',
    });
  }
  return order;
}

export async function pendingPrintOrders(limit = 3) {
  return db
    .select({ id: printFulfillments.printRequestId })
    .from(printFulfillments)
    .where(
      and(
        inArray(printFulfillments.status, ['pending', 'preparing']),
        or(isNull(printFulfillments.leaseId), lt(printFulfillments.leaseUntil, new Date())),
      ),
    )
    .orderBy(printFulfillments.updatedAt)
    .limit(limit);
}

export async function pollLuluOrders() {
  const now = Date.now();
  const candidates = await views()
    .where(
      and(
        eq(printFulfillments.provider, 'lulu'),
        inArray(printFulfillments.status, ['submitting', 'uncertain', 'submitted']),
        lt(printFulfillments.updatedAt, new Date(now - 2 * 60_000)),
        or(
          inArray(printFulfillments.status, ['submitting', 'uncertain']),
          inArray(printRequests.status, ['requested', 'in_printing', 'packing']),
          and(
            eq(printRequests.status, 'shipped'),
            lt(printFulfillments.updatedAt, new Date(now - 60 * 60_000)),
          ),
        ),
      ),
    )
    .orderBy(printFulfillments.updatedAt)
    .limit(10);
  return Promise.allSettled(
    candidates.map(async (order) => {
      const row = order.fulfillment;
      try {
        const updated = await reconcilePrintOrder(order);
        if (updated.fulfillment.updatedAt.getTime() === row.updatedAt.getTime()) {
          await editableUpdate(order, {});
        }
      } catch {
        try {
          await editableUpdate(order, {});
        } catch {
          /* a newer update won */
        }
        console.warn('[PrintOrder] Lulu status poll deferred', {
          printRequestId: order.request.id,
        });
      }
    }),
  );
}

export async function reconcileLuluWebhook(id: string, externalId?: string) {
  if (externalId) {
    const [order] = await views().where(eq(printFulfillments.printRequestId, externalId));
    if (order && ['submitting', 'uncertain', 'submitted'].includes(order.fulfillment.status)) {
      const existing = vendorSchema.nullable().parse(order.fulfillment.vendor);
      if (existing && existing.id !== id) return;
      const result = existing ? await getLuluJob(id) : await findLuluJob(externalId);
      if (result?.id === id) await recordVendor(order, vendorSchema.parse(result));
    }
  }
}

export async function reserveManualPrint(
  order: Order,
  input: { partnerId: string; proofVersion: number; checkedInbox: true },
  actor: string,
) {
  const row = order.fulfillment;
  const proof = proofSchema.nullable().parse(row.proof);
  if (
    row.provider !== 'manual' ||
    !input.checkedInbox ||
    row.proofVersion !== input.proofVersion ||
    row.status !== 'proof_ready' ||
    row.holdReason ||
    !row.proofSentAt ||
    !proof?.qaPassed ||
    proof.qaCriticalCount > 0
  ) {
    throw new PrintError(
      'manual_print_not_ready',
      'The current emailed proof must pass QA before dispatch.',
    );
  }
  const [provider] = await db
    .select({ id: printProviders.id })
    .from(printProviders)
    .where(eq(printProviders.id, order.request.printProviderId));
  if (!provider)
    throw new PrintError('print_partner_unavailable', 'The manual print provider is unavailable.');
  const context = renderInput(order);
  assetFile(proof.interior, context, 'interior');
  assetFile(proof.cover, context, 'cover');
  const reservationId = randomUUID();
  // Use scoped links for a large printer delivery before reserving the dispatch.
  const downloads =
    proof.interior.size + proof.cover.size > 17 * 1024 * 1024
      ? await proofLinks(order, proof, duration.customer)
      : null;
  await editableUpdate(order, {
    status: 'manual_dispatching',
    vendor: { reservationId, partnerId: input.partnerId },
    approvedBy: actor,
    approvedAt: new Date(),
  });
  return {
    reservationId,
    ...(downloads ? { downloadLinks: { interior: downloads[0], cover: downloads[1] } } : {}),
    interiorUri: `gs://${proof.interior.bucket}/${proof.interior.object}`,
    coverUri: `gs://${proof.cover.bucket}/${proof.cover.object}`,
    proofFiles: {
      interior: { generation: proof.interior.generation, sha256: proof.interior.sha256 },
      cover: { generation: proof.cover.generation, sha256: proof.cover.sha256 },
    },
  };
}

export async function finalizeManualPrint(
  order: Order,
  reservationId: string,
  outcome: 'sent' | 'uncertain',
) {
  const row = order.fulfillment;
  const reservation = row.vendor as { reservationId?: string; partnerId?: string } | null;
  if (
    !['manual_dispatching', 'manual_sent', 'manual_uncertain'].includes(row.status) ||
    reservation?.reservationId !== reservationId
  ) {
    throw new PrintError(
      'manual_reservation_mismatch',
      'The manual dispatch reference did not match.',
    );
  }
  if (row.status === 'manual_sent' || row.status === 'manual_uncertain') return order;
  return editableUpdate(order, {
    status: outcome === 'sent' ? 'manual_sent' : 'manual_uncertain',
    vendor: { ...reservation, id: reservationId, status: outcome, tracking: [] },
    lastError:
      outcome === 'uncertain'
        ? 'Manual dispatch may have succeeded. Check the provider email before taking further action.'
        : null,
  });
}

export async function correctPrintShipping(
  order: Order,
  correction: PrintShippingAddress,
  actor: string,
) {
  requireEditable(order);
  const row = order.fulfillment;
  if (row.status !== 'held' || !row.holdReason) {
    throw new PrintError(
      'print_order_hold_required',
      'Place the order on hold before correcting its shipping address.',
    );
  }
  const previous = shippingSchema.parse(row.shippingSnapshot);
  const recipientTaxId =
    correction.recipient_tax_id ??
    (correction.country_code === previous.country_code ? previous.recipient_tax_id : undefined);
  const shipping = shippingSchema.parse({ ...correction, recipient_tax_id: recipientTaxId });
  const providers = await db
    .select({ countries: printProviders.availableCountries })
    .from(printProviders)
    .where(eq(printProviders.isActive, true));
  if (
    !providers.some(
      ({ countries }) => Array.isArray(countries) && countries.includes(shipping.country_code),
    )
  ) {
    throw new PrintError('country_unsupported', 'Printing is unavailable for this country.', 404);
  }
  if (row.provider === 'lulu') validateLuluShipping(shipping);
  const variables = emailVariablesSchema.parse(row.emailVariables);
  return editableUpdate(order, {
    shippingSnapshot: {
      addressId: (row.shippingSnapshot as { addressId?: string }).addressId,
      buyerRecipient: (row.shippingSnapshot as { buyerRecipient?: unknown }).buyerRecipient,
      ...shipping,
      correctedBy: actor,
      correctedAt: new Date().toISOString(),
    },
    emailVariables: {
      ...variables,
      previousProofMayHaveSent:
        variables.previousProofMayHaveSent ||
        variables.proofEmailAttempted ||
        Boolean(row.proofSentAt),
      proofEmailAttempted: false,
      line1: shipping.street1,
      line2: shipping.street2 ?? '',
      city: shipping.city,
      stateRegion: shipping.state_code ?? '',
      postalCode: shipping.postcode,
      country: shipping.country_code,
      phone: shipping.phone_number,
    },
    proof: null,
    proofSentAt: null,
    quote: null,
    proofVersion: row.proofVersion + 1,
    runId: randomUUID(),
    lastError: null,
  });
}
