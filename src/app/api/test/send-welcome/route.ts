// Deprecated test endpoint. The welcome email is now handled entirely by notification-engine.
// This endpoint returns 410 and should be removed.
import { NextResponse } from 'next/server';

export async function POST() {
  return new Response('Gone: /api/test/send-welcome removed. Implemented in notification-engine.', { status: 410 });
}

export async function GET() {
  return POST();
}
