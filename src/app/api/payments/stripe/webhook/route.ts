import { NextRequest, NextResponse } from 'next/server';

import { paymentService } from '@/db/services';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch (error) {
    console.error('Failed to read Stripe webhook body:', error);
    return NextResponse.json({ error: 'Invalid webhook body' }, { status: 400 });
  }

  let event;
  try {
    event = await paymentService.constructStripeWebhookEvent(body, signature);
  } catch (error) {
    console.error('Invalid Stripe webhook signature:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const result = await paymentService.processStripeWebhook(event);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'stripe-webhook-handler',
    timestamp: new Date().toISOString(),
  });
}
