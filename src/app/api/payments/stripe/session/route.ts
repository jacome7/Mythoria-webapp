import { NextRequest, NextResponse } from 'next/server';

import { fiscalDocumentService, paymentService } from '@/db/services';
import {
  buildCreditOrderConversionInput,
  buildPaymentOrderPurchasePayload,
} from '@/db/services/payment';
import type { CreditPackageConversionInput } from '@/lib/openai-ads/events';
import { getCurrentAuthor } from '@/lib/auth';

export const runtime = 'nodejs';

interface StripeMetadata {
  stripe?: {
    invoiceId?: string | null;
    invoiceHostedUrl?: string | null;
    invoicePdf?: string | null;
    paymentMethodType?: string | null;
    paymentStatus?: string | null;
  };
}

/**
 * The exact OpenAI Ads `order_created` input the server enqueued for this order, so the browser
 * Pixel sends the same value/contents. Omitted (never fails the request) when it cannot be built.
 */
function orderConversionFor(
  order: Parameters<typeof buildCreditOrderConversionInput>[0],
): CreditPackageConversionInput | undefined {
  if (order.status !== 'completed') return undefined;
  try {
    return buildCreditOrderConversionInput(order);
  } catch (error) {
    console.error('[AdConversion] order_created input could not be built', {
      error: error instanceof Error ? error.name : 'unknown',
    });
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const order = await paymentService.getOrderForAuthorByStripeSessionId(
      author.authorId,
      sessionId,
    );

    if (!order) {
      return NextResponse.json({ error: 'Stripe checkout session not found' }, { status: 404 });
    }

    const metadata = order.metadata as StripeMetadata | null;
    const creditBundle = order.creditBundle as { credits: number; price: number };
    const fiscalDocument = await fiscalDocumentService.getByOrderId(order.orderId);
    const adConversion = orderConversionFor(order);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      credits: creditBundle.credits,
      provider: order.provider,
      paymentStatus: metadata?.stripe?.paymentStatus || null,
      paymentMethodType: metadata?.stripe?.paymentMethodType || null,
      invoiceId: metadata?.stripe?.invoiceId || null,
      invoiceHostedUrl: metadata?.stripe?.invoiceHostedUrl || null,
      invoicePdf: metadata?.stripe?.invoicePdf || null,
      fiscalDocument: fiscalDocument
        ? {
            id: fiscalDocument.id,
            status: fiscalDocument.status,
            fullDocNumber: fiscalDocument.fullDocNumber,
            issuedAt: fiscalDocument.issuedAt,
            pdfUrl: fiscalDocumentService.fiscalPdfUrl(fiscalDocument),
            lastError: fiscalDocument.lastError,
          }
        : null,
      ecommerce: buildPaymentOrderPurchasePayload(order),
      ...(adConversion ? { adConversion } : {}),
    });
  } catch (error) {
    console.error('Error fetching Stripe checkout session:', error);
    return NextResponse.json({ error: 'Failed to fetch Stripe checkout session' }, { status: 500 });
  }
}
