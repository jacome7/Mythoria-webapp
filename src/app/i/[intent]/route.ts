import { NextRequest } from 'next/server';
import { buildLegacyIntentResponse } from '@/app/i/route-utils';

export async function GET(request: NextRequest, context: { params: Promise<{ intent: string }> }) {
  const { intent } = await context.params;
  return buildLegacyIntentResponse(request, intent);
}
