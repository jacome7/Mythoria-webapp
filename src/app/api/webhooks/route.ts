import { NextRequest } from 'next/server';

// This endpoint was used for Clerk webhooks but is no longer needed after Auth0 migration
export async function POST(req: NextRequest) {
  console.warn('Deprecated Clerk webhook endpoint accessed - this should be removed or updated for Auth0');
  
  return new Response('This Clerk webhook endpoint is no longer active after Auth0 migration', {
    status: 410, // Gone
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function GET() {
  return new Response('Clerk webhook endpoint - no longer active', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
