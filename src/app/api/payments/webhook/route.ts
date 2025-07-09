import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/db/services';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('revolut-signature');
    const timestamp = request.headers.get('revolut-request-timestamp');

    if (!signature) {
      console.error('Missing Revolut signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!timestamp) {
      console.error('Missing Revolut timestamp header');
      return NextResponse.json({ error: 'Missing timestamp' }, { status: 400 });
    }

    // Verify webhook signature with timestamp
    if (!(await paymentService.verifyWebhookSignature(body, signature, timestamp))) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    let webhookPayload;
    try {
      webhookPayload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate required fields - Revolut sends order_id at top level, not in data object
    if (!webhookPayload.event || !webhookPayload.order_id) {
      console.error('Missing required webhook fields:', webhookPayload);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process the webhook
    const result = await paymentService.processWebhook(webhookPayload);

    if (!result.success) {
      console.error('Webhook processing failed:', result.message);
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message 
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint for webhook registration
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'revolut-webhook-handler',
    timestamp: new Date().toISOString()
  });
}
