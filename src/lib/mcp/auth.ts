import { createClerkClient } from '@clerk/backend';

import { authorService } from '@/db/services';
import type { authors } from '@/db/schema';
import type { ClerkUserForSync } from '@/types/clerk';

export type McpAuthor = typeof authors.$inferSelect;

export type McpAuthContext = {
  userId: string | null;
  author: McpAuthor | null;
};

export class McpAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'McpAuthError';
    this.status = status;
  }
}

function parseBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new McpAuthError('Invalid Authorization header format. Use: Bearer <token>.', 401);
  }

  return token.trim();
}

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkClient = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;

export async function resolveMcpAuthContext(request: Request): Promise<McpAuthContext> {
  const token = parseBearerToken(request);

  if (!token) {
    return { userId: null, author: null };
  }

  if (!clerkClient || !clerkSecretKey) {
    throw new McpAuthError('Clerk secret key is not configured for MCP.', 500);
  }

  try {
    const verified = await clerkClient.verifyToken(token);
    const userId = verified.sub;
    if (!userId) {
      throw new McpAuthError('Token verified but subject is missing.', 403);
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    const author = await authorService.syncUserOnSignIn(clerkUser as ClerkUserForSync);

    return { userId, author };
  } catch (error) {
    if (error instanceof McpAuthError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Unable to verify Clerk token for MCP request.';
    throw new McpAuthError(message, 403);
  }
}

export function requireAuthor(context: McpAuthContext): McpAuthor {
  if (!context.author) {
    throw new McpAuthError('Authentication required for this MCP tool.', 401);
  }

  return context.author;
}
