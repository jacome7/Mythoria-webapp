import { NextRequest } from 'next/server';

import { handleMcpHttpRequest } from '@/lib/mcp/server';

export const runtime = 'nodejs';

async function routeHandler(request: NextRequest) {
  return handleMcpHttpRequest(request);
}

export { routeHandler as DELETE, routeHandler as GET, routeHandler as POST };
