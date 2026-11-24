const { readFileSync } = require('node:fs');
if (
  process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1' ||
  process.env.CLERK_SECRET_KEY !== 'sk_live_fixture'
)
  throw new Error('Fixture credentials required');
const publicKey = JSON.parse(readFileSync('clerk-public.jwk', 'utf8'));
const identity = {
  object: 'user',
  id: 'user_isolated_fixture',
  first_name: 'Browser',
  last_name: 'Fixture',
  primary_email_address_id: 'idn_fixture',
  email_addresses: [
    {
      object: 'email_address',
      id: 'idn_fixture',
      email_address: 'author@fixture.invalid',
      verification: { status: 'verified', strategy: 'ticket' },
      linked_to: [],
    },
  ],
  phone_numbers: [],
  web3_wallets: [],
  external_accounts: [],
  passkeys: [],
  public_metadata: {},
  private_metadata: {},
  unsafe_metadata: {},
  created_at: Date.now(),
  updated_at: Date.now(),
};
const send = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin !== 'https://api.clerk.com') return send(input, init);

  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  const endpoint = '/v1/' + url.pathname.replace(/^\/(v1\/)?/, '');
  if (endpoint === '/v1/jwks' && method === 'GET') {
    return Response.json({ keys: [publicKey] });
  }
  if (endpoint === '/v1/users/' + identity.id && method === 'GET') return Response.json(identity);
  if (endpoint === '/v1/users' && method === 'GET') return Response.json([identity]);
  if (endpoint === '/v1/users/count' && method === 'GET') return Response.json({ total_count: 1 });
  if (endpoint === '/v1/sign_in_tokens' && method === 'POST') {
    return Response.json({
      object: 'sign_in_token',
      id: 'sit_fixture',
      token: 'fixture-ticket',
      status: 'pending',
      user_id: identity.id,
    });
  }
  if (endpoint === '/v1/oauth_applications/access_tokens/verify' && method === 'POST') {
    const body = JSON.parse(init?.body || (await input.text()));
    if (body.access_token === process.env.MCP_E2E_BEARER_TOKEN) {
      return Response.json({
        object: 'clerk_idp_oauth_access_token',
        id: 'oat_fixture',
        client_id: 'oauth_fixture',
        type: 'bearer',
        subject: identity.id,
        scopes: ['profile'],
        revoked: false,
        expired: false,
      });
    }
  }
  console.error('Unhandled Clerk fixture request', method, endpoint);
  return Response.json(
    { errors: [{ code: 'not_found', message: 'Unknown Clerk fixture endpoint' }] },
    { status: 404 },
  );
};
