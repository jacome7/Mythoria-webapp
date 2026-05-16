import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { paymentService } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { ga4Service } from '@/lib/analytics/ga4';
import { normalizeLocale } from '@/utils/locale-utils';

export const runtime = 'nodejs';

interface StripeCheckoutRequest {
  creditPackages: Array<{
    packageId: number;
    quantity: number;
  }>;
  locale?: string;
}

function getRequestOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const origin = request.headers.get('origin');
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  const host = request.headers.get('host');
  if (host && !host.includes('0.0.0.0')) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return `${protocol}://${host}`;
  }

  return (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function validateCreditPackages(
  creditPackages: StripeCheckoutRequest['creditPackages'],
): Promise<NextResponse | null> {
  if (!creditPackages || !Array.isArray(creditPackages) || creditPackages.length === 0) {
    return NextResponse.json({ error: 'Credit packages are required' }, { status: 400 });
  }

  for (const pkg of creditPackages) {
    if (!Number.isInteger(pkg.packageId) || !Number.isInteger(pkg.quantity) || pkg.quantity <= 0) {
      return NextResponse.json({ error: 'Invalid package data' }, { status: 400 });
    }

    const creditPackage = await paymentService.getCreditPackage(pkg.packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: `Invalid package ID: ${pkg.packageId}` }, { status: 400 });
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: StripeCheckoutRequest = await request.json();
    const validationError = await validateCreditPackages(body.creditPackages);
    if (validationError) {
      return validationError;
    }

    const locale = normalizeLocale(body.locale || author.preferredLocale || undefined);
    const origin = getRequestOrigin(request);
    const successUrl = `${origin}/${locale}/buy-credits?payment=stripe_success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/${locale}/buy-credits?payment=cancel`;
    const gaCookie = request.cookies.get('_ga')?.value;

    const { order, checkoutSession } = await paymentService.createStripeCheckoutSession({
      userId: author.authorId,
      email: author.email,
      displayName: author.displayName,
      phone: author.mobilePhone,
      creditPackages: body.creditPackages,
      locale,
      successUrl,
      cancelUrl,
      idempotencyKey: uuidv4(),
      clientId: ga4Service.extractClientId(gaCookie),
      sessionId: request.cookies.get('_ga_G3P')?.value,
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Stripe checkout URL was not created' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      credits: (order.creditBundle as { credits: number }).credits,
    });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);

    if (error instanceof Error && error.message.includes('STRIPE_SECRET_KEY')) {
      return NextResponse.json(
        { error: 'Stripe payment service is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create Stripe checkout session' },
      { status: 500 },
    );
  }
}
