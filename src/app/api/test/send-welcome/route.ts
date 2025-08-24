import { NextResponse } from 'next/server';
import { sendWelcomeNotification } from '@/lib/notifications/welcome';

/**
 * Test endpoint: manually trigger welcome email without creating a new Clerk user.
 * Path: /api/test/send-welcome
 * Method: POST (idempotent for testing)
 * Security: Optionally require a simple shared secret via header or env (MINIMAL – adjust as needed).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-test-secret');
  const requiredSecret = process.env.WELCOME_TEST_SECRET;

  if (requiredSecret && authHeader !== requiredSecret) {
    return new Response('Forbidden', { status: 403 });
  }

  const email = 'rodrigovieirajacome@gmail.com';
  const name = 'Rodrigo Jácome';

  try {
    await sendWelcomeNotification({ email, name, source: 'manual_test' });
    return NextResponse.json({ status: 'ok', email, name });
  } catch (error: unknown) {
    console.error('Failed to send test welcome notification', error);
    return new Response('Failed to send welcome email', { status: 500 });
  }
}

// Allow a quick GET for convenience (optional)
export async function GET(request: Request) {
  return POST(request);
}
