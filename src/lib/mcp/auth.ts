import { createClerkClient } from '@clerk/backend';

import { authorService } from '@/db/services';
import type { authors } from '@/db/schema';
import type { ClerkUserForSync } from '@/types/clerk';

export type McpAuthor = typeof authors.$inferSelect;

export type McpAuthContext = {
  userId: string | null;
  author: McpAuthor | null;
  scopes: string[];
  tokenType: 'oauth_token' | 'session_token' | null;
  tokenPresented: boolean;
  authError: McpAuthError | null;
};

export class McpAuthError extends Error {
  status: number;
  oauthError: 'invalid_token' | 'insufficient_scope';
  requiredScopes: string[];

  constructor(
    message: string,
    status = 401,
    oauthError: 'invalid_token' | 'insufficient_scope' = 'invalid_token',
    requiredScopes: string[] = [],
  ) {
    super(message);
    this.name = 'McpAuthError';
    this.status = status;
    this.oauthError = oauthError;
    this.requiredScopes = requiredScopes;
  }
}

export const CLERK_STANDARD_SCOPES = Object.freeze([
  'openid',
  'profile',
  'email',
  'public_metadata',
  'private_metadata',
  'offline_access',
]);

// Protected MCP tools use a single Clerk-supported scope. Fine-grained authorization
// stays in Mythoria's ownership and action checks rather than custom OAuth scopes.
export const MCP_PROTECTED_TOOL_SCOPE = 'profile';
export const MCP_PROTECTED_TOOL_SCOPES = Object.freeze([MCP_PROTECTED_TOOL_SCOPE]);

export function getMcpScopesSupported() {
  // Protected-resource metadata should advertise the scopes this resource actually uses.
  // Exposing unrelated Clerk scopes here can cause clients to request scopes the OAuth app
  // is not allowed to use, which breaks ChatGPT linking.
  return [...MCP_PROTECTED_TOOL_SCOPES];
}

const MCP_PROTECTED_RESOURCE_PATH = '/.well-known/oauth-protected-resource';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveAppBaseUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt');
}

function decodeClerkDomainFromPublishableKey(key?: string | null) {
  if (!key) return null;
  const encoded = key.replace(/^pk_(live|test)_/, '');
  if (!encoded || encoded === key) return null;

  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : `${normalized}${'='.repeat(4 - pad)}`;

  try {
    const decoded = Buffer.from(padded, 'base64').toString('utf8').trim();
    const frontendApi = decoded.replace(/\$$/, '');
    if (!frontendApi) return null;
    if (frontendApi.startsWith('http://') || frontendApi.startsWith('https://')) {
      return trimTrailingSlash(frontendApi);
    }
    return `https://${trimTrailingSlash(frontendApi)}`;
  } catch {
    return null;
  }
}

export function getMcpResourceUrl() {
  const configured = process.env.MCP_RESOURCE_URL;
  if (configured) return trimTrailingSlash(configured);
  return `${resolveAppBaseUrl()}/api/mcp`;
}

export function getMcpProtectedResourceMetadataUrl() {
  return `${resolveAppBaseUrl()}${MCP_PROTECTED_RESOURCE_PATH}`;
}

export function getMcpAuthorizationServers() {
  const configured = process.env.MCP_AUTHORIZATION_SERVER_URL;
  if (configured) return [trimTrailingSlash(configured)];

  const fromPublishableKey = decodeClerkDomainFromPublishableKey(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return fromPublishableKey ? [fromPublishableKey] : [];
}

function escapeChallengeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildMcpWwwAuthenticate(error: McpAuthError) {
  const metadataUrl = getMcpProtectedResourceMetadataUrl();
  const scopePart =
    error.requiredScopes.length > 0
      ? `, scope="${escapeChallengeValue(error.requiredScopes.join(' '))}"`
      : '';

  return `Bearer resource_metadata="${escapeChallengeValue(metadataUrl)}", error="${error.oauthError}", error_description="${escapeChallengeValue(error.message)}"${scopePart}`;
}

export function toMcpAuthErrorResult(error: McpAuthError) {
  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text: error.message,
      },
    ],
    _meta: {
      'mcp/www_authenticate': [buildMcpWwwAuthenticate(error)],
    },
  };
}

function parseBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    throw new McpAuthError(
      'Invalid Authorization header format. Use: Bearer <token>.',
      401,
      'invalid_token',
    );
  }

  return token.trim();
}

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkClient = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

export async function resolveMcpAuthContext(request: Request): Promise<McpAuthContext> {
  let token: string | null = null;
  try {
    token = parseBearerToken(request);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return {
        userId: null,
        author: null,
        scopes: [],
        tokenType: null,
        tokenPresented: true,
        authError: error,
      };
    }
    throw error;
  }

  if (!token) {
    return {
      userId: null,
      author: null,
      scopes: [],
      tokenType: null,
      tokenPresented: false,
      authError: null,
    };
  }

  if (!clerkClient || !clerkSecretKey) {
    throw new McpAuthError('Clerk secret key is not configured for MCP.', 500, 'invalid_token');
  }
  if (!clerkPublishableKey) {
    throw new McpAuthError(
      'Clerk publishable key is not configured for MCP.',
      500,
      'invalid_token',
    );
  }

  const acceptsSessionToken = process.env.MCP_AUTH_ALLOW_SESSION_TOKEN === 'true';

  try {
    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: acceptsSessionToken ? ['oauth_token', 'session_token'] : 'oauth_token',
      publishableKey: clerkPublishableKey,
    });

    if (!requestState.isAuthenticated) {
      return {
        userId: null,
        author: null,
        scopes: [],
        tokenType: null,
        tokenPresented: true,
        authError: new McpAuthError('Access token is invalid or expired.', 401, 'invalid_token'),
      };
    }

    const authObject = requestState.toAuth() as {
      isAuthenticated: boolean;
      tokenType: string | null;
      userId: string | null;
      scopes?: string[] | null;
    };
    if (!authObject.isAuthenticated) {
      return {
        userId: null,
        author: null,
        scopes: [],
        tokenType: null,
        tokenPresented: true,
        authError: new McpAuthError('Access token is invalid or expired.', 401, 'invalid_token'),
      };
    }

    if (
      authObject.tokenType !== 'oauth_token' &&
      !(acceptsSessionToken && authObject.tokenType === 'session_token')
    ) {
      return {
        userId: null,
        author: null,
        scopes: [],
        tokenType: null,
        tokenPresented: true,
        authError: new McpAuthError('Unsupported token type for MCP access.', 401, 'invalid_token'),
      };
    }

    const userId = authObject.userId;
    if (!userId) {
      return {
        userId: null,
        author: null,
        scopes: [],
        tokenType: null,
        tokenPresented: true,
        authError: new McpAuthError('Token is missing a user subject.', 401, 'invalid_token'),
      };
    }

    const clerkUser = await clerkClient.users.getUser(userId);
    const author = await authorService.syncUserOnSignIn(clerkUser as ClerkUserForSync);

    const scopes =
      authObject.tokenType === 'oauth_token' && Array.isArray(authObject.scopes)
        ? authObject.scopes
        : authObject.tokenType === 'session_token' && acceptsSessionToken
          ? [...CLERK_STANDARD_SCOPES]
          : [];

    return {
      userId,
      author,
      scopes,
      tokenType:
        authObject.tokenType === 'oauth_token' || authObject.tokenType === 'session_token'
          ? authObject.tokenType
          : null,
      tokenPresented: true,
      authError: null,
    };
  } catch (error) {
    if (error instanceof McpAuthError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unable to verify MCP access token.';
    return {
      userId: null,
      author: null,
      scopes: [],
      tokenType: null,
      tokenPresented: true,
      authError: new McpAuthError(message, 401, 'invalid_token'),
    };
  }
}

export function requireAuthor(context: McpAuthContext, requiredScopes: string[] = []): McpAuthor {
  if (!context.author) {
    if (context.authError) {
      throw new McpAuthError(
        context.authError.message,
        context.authError.status,
        context.authError.oauthError,
        requiredScopes.length > 0 ? requiredScopes : context.authError.requiredScopes,
      );
    }
    throw new McpAuthError('Authentication required for this MCP tool.', 401, 'invalid_token', [
      ...requiredScopes,
    ]);
  }

  if (requiredScopes.length > 0) {
    const missingScopes = requiredScopes.filter((scope) => !context.scopes.includes(scope));
    if (missingScopes.length > 0) {
      throw new McpAuthError(
        'Missing required permissions for this MCP tool.',
        403,
        'insufficient_scope',
        missingScopes,
      );
    }
  }

  return context.author;
}
