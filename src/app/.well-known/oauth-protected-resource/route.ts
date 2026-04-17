import {
  getMcpAuthorizationServers,
  getMcpResourceUrl,
  getMcpScopesSupported,
} from '@/lib/mcp/auth';

export const runtime = 'nodejs';

export async function GET() {
  const authorizationServers = getMcpAuthorizationServers();
  const payload = {
    resource: getMcpResourceUrl(),
    authorization_servers: authorizationServers,
    scopes_supported: getMcpScopesSupported(),
    resource_documentation: 'https://mythoria.pt/docs/mcp',
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300',
    },
  });
}
