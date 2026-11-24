import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { stories } from '@/db/schema';
import { toPremiumBookReaderData } from '@/lib/premium-children-book/reader';
import {
  downloadPremiumReadingImage,
  loadPublishedPremiumBook,
} from '@/lib/premium-children-book/storage';
import { getPrintSettings, setPrintSettings } from '@/lib/print/checkout';
import { PrintError, providerSchema, shippingSchema } from '@/lib/print/contracts';
import {
  finalizeManualPrint,
  correctPrintShipping,
  correctSquareEdition,
  hasPaidOrderForStory,
  printOrderView,
  queuePrintPreparation,
  reconcilePrintOrder,
  reserveManualPrint,
  revisePrintProof,
  setPrintHold,
  submitPrintOrder,
  withPrintTicket,
} from '@/lib/print/fulfillment';
import { verifyPrintIdentity } from '@/lib/print/oidc';
import { createStaffPrintProof } from '@/lib/print/staff-proof';

export const dynamic = 'force-dynamic';

const ticket = z.object({ printRequestId: z.string().uuid(), ticketId: z.string().uuid() });
const commandSchema = z.object({
  actor: z.object({ email: z.string().email().max(255) }),
  operation: z.enum([
    'getConfig',
    'setConfig',
    'hasPaidOrderForStory',
    'getPremiumEdition',
    'getPremiumEditionImage',
    'createStaffProof',
    'get',
    'select',
    'prepare',
    'hold',
    'clear',
    'revise',
    'submit',
    'reconcile',
    'reserveManual',
    'finalizeManual',
    'correctShipping',
    'correctSquareEdition',
  ]),
  input: z.unknown(),
});
const noStore = { 'cache-control': 'private, no-store' };

async function readPremiumEdition(storyId: string) {
  const [story] = await db
    .select({ authorId: stories.authorId, features: stories.features })
    .from(stories)
    .where(and(eq(stories.storyId, storyId), eq(stories.status, 'published')));
  const edition =
    story && (await loadPublishedPremiumBook(storyId, story.authorId, story.features));
  if (!edition)
    throw new PrintError('edition_unavailable', 'Published premium edition not found.', 404);
  return edition;
}

async function runCommand({ actor, operation, input }: z.infer<typeof commandSchema>) {
  if (operation === 'getConfig') return getPrintSettings();
  if (operation === 'getPremiumEdition') {
    const { storyId } = z.object({ storyId: z.uuid().toLowerCase() }).parse(input);
    const book = await readPremiumEdition(storyId);
    return { ...toPremiumBookReaderData(book), revision: book.revision };
  }
  if (operation === 'getPremiumEditionImage') {
    const { storyId, revision, image } = z
      .object({
        storyId: z.uuid().toLowerCase(),
        revision: z.uuid().toLowerCase(),
        image: z.string().regex(/^(front|back|motif|[1-9]\d?)$/),
      })
      .parse(input);
    const book = await readPremiumEdition(storyId);
    if (book.revision !== revision)
      throw new PrintError('edition_changed', 'The published edition changed.', 404);
    const asset =
      image === 'front' || image === 'back'
        ? book.covers[image]
        : image === 'motif'
          ? book.motifArtwork
          : book.pages[Number(image) - 1]?.reading;
    if (!asset) throw new PrintError('edition_image_missing', 'Image not found.', 404);
    const { bytes, contentType } = await downloadPremiumReadingImage(storyId, asset);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...noStore,
        'content-type': contentType,
        'x-content-type-options': 'nosniff',
      },
    });
  }
  if (operation === 'createStaffProof') {
    const values = z
      .object({
        storyId: z.uuid().toLowerCase(),
        revision: z.uuid().toLowerCase(),
        shippingAddress: shippingSchema.extend({ phone_number: z.string().trim().min(1).max(30) }),
      })
      .parse(input);
    return createStaffPrintProof(values, actor.email);
  }
  if (operation === 'hasPaidOrderForStory') {
    const { storyId, requestedThrough } = z
      .object({
        storyId: z.string().uuid(),
        requestedThrough: z.iso.datetime({ offset: true }).optional(),
      })
      .parse(input);
    return hasPaidOrderForStory(storyId, requestedThrough ? new Date(requestedThrough) : undefined);
  }
  if (operation === 'setConfig') {
    const values = z
      .object({
        defaultProvider: z.enum(['none', 'lulu']),
        maxEurPerCopy: z.number().min(0).max(99999999.99),
        hardcoverCredits: z.number().int().positive().max(1000000).nullable().optional(),
      })
      .parse(input);
    return setPrintSettings(
      { ...values, maxEurPerCopy: Number(values.maxEurPerCopy.toFixed(2)) },
      actor.email,
    );
  }
  const { printRequestId, ticketId } = ticket.parse(input);
  const order = await withPrintTicket(printRequestId, ticketId);

  switch (operation) {
    case 'get':
      return printOrderView(order);
    case 'prepare':
      return printOrderView(await queuePrintPreparation(order));
    case 'select': {
      const { provider } = z.object({ provider: providerSchema }).parse(input);
      return printOrderView(await revisePrintProof(order, provider));
    }
    case 'revise':
      return printOrderView(await revisePrintProof(order));
    case 'correctSquareEdition': {
      const correction = z
        .object({
          expectedRevision: z.uuid(),
          correctedRevision: z.uuid(),
          reason: z.string().trim().min(1).max(500),
        })
        .parse(input);
      return printOrderView(await correctSquareEdition(order, correction, actor.email));
    }
    case 'hold': {
      const { reason } = z.object({ reason: z.string().trim().min(1).max(800) }).parse(input);
      return printOrderView(await setPrintHold(order, reason));
    }
    case 'clear':
      return printOrderView(await setPrintHold(order, null));
    case 'submit': {
      const approval = z
        .object({
          confirmationId: z.string().uuid(),
          checkedInbox: z.literal(true),
          confirmedTotalEur: z.number().positive(),
          proofVersion: z.number().int().positive().optional(),
        })
        .parse(input);
      return printOrderView(await submitPrintOrder(order, approval, actor.email));
    }
    case 'reconcile':
      return printOrderView(await reconcilePrintOrder(order));
    case 'correctShipping': {
      const { shippingAddress } = z
        .object({ customerConfirmed: z.literal(true), shippingAddress: shippingSchema })
        .parse(input);
      return printOrderView(await correctPrintShipping(order, shippingAddress, actor.email));
    }
    case 'reserveManual': {
      const approval = z
        .object({
          partnerId: z.string().uuid(),
          proofVersion: z.number().int().positive(),
          checkedInbox: z.literal(true),
        })
        .parse(input);
      return reserveManualPrint(order, approval, actor.email);
    }
    case 'finalizeManual': {
      const values = z
        .object({ reservationId: z.string().uuid(), outcome: z.enum(['sent', 'uncertain']) })
        .parse(input);
      return printOrderView(await finalizeManualPrint(order, values.reservationId, values.outcome));
    }
  }
}

export async function POST(request: Request) {
  try {
    await verifyPrintIdentity(request, 'admin');
    const command = commandSchema.parse(await request.json());
    const data = await runCommand(command);
    if (data instanceof Response) return data;
    return Response.json({ data }, { headers: noStore });
  } catch (error) {
    if (error instanceof PrintError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: noStore },
      );
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json(
        { error: { code: 'invalid_print_command', message: 'Invalid print command.' } },
        { status: 400, headers: noStore },
      );
    }
    console.error('[PrintOrder] Internal print command failed');
    return Response.json(
      { error: { code: 'print_command_failed', message: 'Print command failed.' } },
      { status: 502, headers: noStore },
    );
  }
}
