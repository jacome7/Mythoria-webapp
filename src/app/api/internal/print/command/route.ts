import { z } from 'zod';
import { getPrintSettings, setPrintSettings } from '@/lib/print/checkout';
import { PrintError, providerSchema, shippingSchema } from '@/lib/print/contracts';
import {
  finalizeManualPrint,
  correctPrintShipping,
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

export const dynamic = 'force-dynamic';

const ticket = z.object({ printRequestId: z.string().uuid(), ticketId: z.string().uuid() });
const commandSchema = z.object({
  actor: z.object({ email: z.string().email().max(255) }),
  operation: z.enum([
    'getConfig',
    'setConfig',
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
  ]),
  input: z.unknown(),
});
const noStore = { 'cache-control': 'private, no-store' };

async function runCommand({ actor, operation, input }: z.infer<typeof commandSchema>) {
  if (operation === 'getConfig') return getPrintSettings();
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
      const { partnerId } = z.object({ partnerId: z.string().uuid() }).parse(input);
      return reserveManualPrint(order, partnerId, actor.email);
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
