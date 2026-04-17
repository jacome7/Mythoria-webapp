import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';

type CliOptions = {
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  redirectUri?: string;
  scope?: string;
  resource?: string;
  noResource?: boolean;
  timeoutMs?: number;
  noOpen?: boolean;
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type OAuthClientMetadata = {
  authorizeUrl?: string;
  tokenFetchUrl?: string;
  isPublic?: boolean;
  redirectUris: string[];
  scopes: string[];
};

function loadLocalEnv() {
  // Mirror Next.js local loading order for this standalone script:
  // 1) .env
  // 2) .env.local (override)
  loadDotenv({ path: '.env', quiet: true });
  loadDotenv({ path: '.env.local', override: true, quiet: true });
}

function normalizeAuthServerBase(input?: string) {
  if (!input) return input;
  const trimmed = input.replace(/\/+$/, '');
  return trimmed
    .replace(/\/oauth\/authorize$/i, '')
    .replace(/\/oauth\/token$/i, '')
    .replace(/\/\.well-known\/oauth-authorization-server$/i, '');
}

function parseScopeList(value?: string | null) {
  if (!value) return [] as string[];
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickDefaultRedirectUri(redirectUris: string[]) {
  if (redirectUris.length === 0) return undefined;
  const loopback = redirectUris.find((uri) =>
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(uri),
  );
  return loopback || redirectUris[0];
}

async function loadOAuthClientMetadata(clientId?: string): Promise<OAuthClientMetadata | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || !clientId) return null;

  try {
    const response = await fetch('https://api.clerk.com/v1/oauth_applications?limit=100', {
      headers: {
        authorization: `Bearer ${secretKey}`,
        accept: 'application/json',
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Clerk API returned ${response.status} while listing OAuth applications: ${body.slice(0, 200)}`,
      );
    }

    const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const app = payload.data?.find((candidate) => candidate.client_id === clientId);
    if (!app) return null;

    const scopes = parseScopeList(typeof app.scopes === 'string' ? app.scopes : '');
    const redirectUris = Array.isArray(app.redirect_uris)
      ? app.redirect_uris.map((uri) => String(uri))
      : [];

    return {
      authorizeUrl: typeof app.authorize_url === 'string' ? app.authorize_url : undefined,
      tokenFetchUrl: typeof app.token_fetch_url === 'string' ? app.token_fetch_url : undefined,
      isPublic: typeof app.public === 'boolean' ? app.public : undefined,
      redirectUris,
      scopes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[oauth] Warning: unable to load OAuth app metadata from Clerk: ${message}`);
    return null;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith('--') ? next : undefined;

    if (key === 'no-open') {
      options.noOpen = true;
      continue;
    }
    if (key === 'no-resource') {
      options.noResource = true;
      continue;
    }

    if (key === 'client-id') options.clientId = value;
    if (key === 'client-secret') options.clientSecret = value;
    if (key === 'authorization-url') options.authorizationUrl = value;
    if (key === 'token-url') options.tokenUrl = value;
    if (key === 'redirect-uri') options.redirectUri = value;
    if (key === 'scope') options.scope = value;
    if (key === 'resource') options.resource = value;
    if (key === 'timeout-ms' && value) options.timeoutMs = Number(value);

    if (value) i += 1;
  }
  return options;
}

function base64UrlEncode(input: Buffer | string) {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createPkceVerifier() {
  return base64UrlEncode(randomBytes(48));
}

function createPkceChallenge(verifier: string) {
  const digest = createHash('sha256').update(verifier).digest();
  return base64UrlEncode(digest);
}

function openBrowser(url: string) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true });
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true });
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
}

async function waitForAuthorizationCode(
  redirectUri: string,
  expectedState: string,
  timeoutMs: number,
) {
  const url = new URL(redirectUri);
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const pathName = url.pathname || '/';
  const host = url.hostname;

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`Timeout waiting for OAuth callback (${timeoutMs}ms).`));
    }, timeoutMs);

    const server = createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end('Missing URL');
        return;
      }

      const requestUrl = new URL(req.url, `${url.protocol}//${req.headers.host}`);
      if (requestUrl.pathname !== pathName) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const state = requestUrl.searchParams.get('state');
      const code = requestUrl.searchParams.get('code');
      const error = requestUrl.searchParams.get('error');
      const errorDescription = requestUrl.searchParams.get('error_description');

      if (error) {
        res.statusCode = 400;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end('<h1>OAuth failed</h1><p>You can close this window.</p>');
        clearTimeout(timer);
        server.close();
        reject(
          new Error(
            `OAuth authorization failed: ${error}${errorDescription ? ` (${errorDescription})` : ''}`,
          ),
        );
        return;
      }

      if (!state || state !== expectedState) {
        res.statusCode = 400;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end('<h1>OAuth failed</h1><p>State mismatch. You can close this window.</p>');
        clearTimeout(timer);
        server.close();
        reject(new Error('State validation failed on OAuth callback.'));
        return;
      }

      if (!code) {
        res.statusCode = 400;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end('<h1>OAuth failed</h1><p>Missing code. You can close this window.</p>');
        clearTimeout(timer);
        server.close();
        reject(new Error('OAuth callback missing "code" query parameter.'));
        return;
      }

      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(
        '<h1>Authentication successful</h1><p>You can close this window and return to terminal.</p>',
      );
      clearTimeout(timer);
      server.close();
      resolve(code);
    });

    server.listen(port, host, () => {
      console.log(`[oauth] Waiting for callback at ${redirectUri}`);
    });

    server.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function exchangeToken(params: {
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.clientId,
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });
  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret);
  }

  const response = await fetch(params.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: body.toString(),
  });

  const text = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Token endpoint returned non-JSON response: ${text}`);
  }

  if (!response.ok) {
    throw new Error(
      `Token exchange failed (${response.status}): ${json.error ?? 'unknown_error'} ${json.error_description ?? ''}`.trim(),
    );
  }

  if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
    throw new Error('Token endpoint response did not include access_token.');
  }

  return json as TokenResponse;
}

async function main() {
  loadLocalEnv();

  const cli = parseArgs(process.argv.slice(2));
  const clientId = cli.clientId || process.env.CLERK_OAUTH_CLIENT_ID;
  const clientMetadata = await loadOAuthClientMetadata(clientId);

  const authServerBaseRaw =
    cli.authorizationUrl || cli.tokenUrl
      ? undefined
      : process.env.MCP_AUTHORIZATION_SERVER_URL || 'https://clerk.mythoria.pt';
  const authServerBase = normalizeAuthServerBase(authServerBaseRaw);

  const envClientSecret = process.env.CLERK_OAUTH_CLIENT_SECRET;
  const clientSecret = cli.clientSecret || (clientMetadata?.isPublic ? undefined : envClientSecret);
  const authorizationUrl =
    cli.authorizationUrl ||
    clientMetadata?.authorizeUrl ||
    (authServerBase ? `${authServerBase.replace(/\/+$/, '')}/oauth/authorize` : undefined);
  const tokenUrl =
    cli.tokenUrl ||
    clientMetadata?.tokenFetchUrl ||
    (authServerBase ? `${authServerBase.replace(/\/+$/, '')}/oauth/token` : undefined);
  const redirectUri =
    cli.redirectUri ||
    process.env.MCP_E2E_REDIRECT_URI ||
    pickDefaultRedirectUri(clientMetadata?.redirectUris || []) ||
    'http://127.0.0.1:8799/callback';
  const scope =
    cli.scope ||
    process.env.MCP_E2E_SCOPE ||
    (clientMetadata?.scopes.length
      ? clientMetadata.scopes.join(' ')
      : ['profile', 'email'].join(' '));
  const requestedScopes = parseScopeList(scope);
  const resource = cli.noResource
    ? ''
    : cli.resource ||
      process.env.MCP_E2E_RESOURCE ||
      process.env.MCP_RESOURCE_URL ||
      `${(process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt').replace(/\/+$/, '')}/api/mcp`;
  const timeoutMs = cli.timeoutMs || Number(process.env.MCP_E2E_AUTH_TIMEOUT_MS || 180000);

  if (!clientId) {
    throw new Error('Missing OAuth client id. Set CLERK_OAUTH_CLIENT_ID or pass --client-id.');
  }
  if (!authorizationUrl) {
    throw new Error(
      'Missing authorization URL. Set MCP_AUTHORIZATION_SERVER_URL or pass --authorization-url.',
    );
  }
  if (!tokenUrl) {
    throw new Error('Missing token URL. Set MCP_AUTHORIZATION_SERVER_URL or pass --token-url.');
  }
  if (clientMetadata?.redirectUris.length && !clientMetadata.redirectUris.includes(redirectUri)) {
    throw new Error(
      `Redirect URI "${redirectUri}" is not allowed for OAuth client ${clientId}. Allowed redirect URIs: ${clientMetadata.redirectUris.join(', ')}`,
    );
  }
  if (clientMetadata?.scopes.length) {
    const disallowedScopes = requestedScopes.filter(
      (candidate) => !clientMetadata.scopes.includes(candidate),
    );
    if (disallowedScopes.length) {
      throw new Error(
        `Requested scope(s) are not allowed for OAuth client ${clientId}: ${disallowedScopes.join(', ')}. Allowed scopes: ${clientMetadata.scopes.join(' ')}`,
      );
    }
  }

  if (clientMetadata?.isPublic && envClientSecret && !cli.clientSecret) {
    console.log('[oauth] OAuth client is public; skipping CLERK_OAUTH_CLIENT_SECRET.');
  }
  if (clientMetadata) {
    const supportedScopes =
      clientMetadata.scopes.length > 0
        ? clientMetadata.scopes.join(' ')
        : '(no explicit scopes configured)';
    console.log(`[oauth] OAuth client detected: ${clientId}`);
    console.log(`[oauth] Allowed redirect URIs: ${clientMetadata.redirectUris.join(', ')}`);
    console.log(`[oauth] Allowed scopes: ${supportedScopes}`);
  }

  const verifier = createPkceVerifier();
  const challenge = createPkceChallenge(verifier);
  const state = base64UrlEncode(randomBytes(24));

  const authorizeUrl = new URL(authorizationUrl);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', scope);
  if (resource) {
    authorizeUrl.searchParams.set('resource', resource);
  }
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  console.log('[oauth] Authorization URL:');
  console.log(authorizeUrl.toString());
  if (!cli.noOpen) {
    openBrowser(authorizeUrl.toString());
    console.log('[oauth] Browser opened. Complete sign-in/consent.');
  } else {
    console.log('[oauth] --no-open enabled. Open the URL manually.');
  }

  const code = await waitForAuthorizationCode(redirectUri, state, timeoutMs);
  const token = await exchangeToken({
    tokenUrl,
    clientId,
    clientSecret,
    code,
    redirectUri,
    codeVerifier: verifier,
  });

  console.log('\n[oauth] Token exchange successful.');
  console.log(`[oauth] token_type: ${token.token_type ?? 'unknown'}`);
  console.log(`[oauth] expires_in: ${token.expires_in ?? 'unknown'} seconds`);
  console.log(`[oauth] scope: ${token.scope ?? scope}`);
  if (token.refresh_token) {
    console.log('[oauth] refresh_token: present');
  }

  console.log('\nAccess token:\n');
  console.log(token.access_token);

  console.log('\nPowerShell quick use:\n');
  console.log(`$env:MCP_E2E_BEARER_TOKEN="${token.access_token}"`);
  console.log('npm run test:e2e:mcp:auth');
}

main().catch((error) => {
  console.error(`[oauth] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
