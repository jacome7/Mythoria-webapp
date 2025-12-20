import { NextRequest, NextResponse } from 'next/server';

import { handleMcpHttpRequest } from '@/lib/mcp/server';

export const runtime = 'nodejs';

async function routeHandler(request: NextRequest) {
  const response = await handleMcpHttpRequest(request);
  return NextResponse.from(response);
}

export { routeHandler as DELETE, routeHandler as GET, routeHandler as POST };
