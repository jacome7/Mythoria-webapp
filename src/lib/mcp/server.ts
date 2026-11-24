import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { type McpAuthContext, McpAuthError, resolveMcpAuthContext } from './auth';
import { registerCreditTools } from './credit-tools';
import { registerDiscoveryTools } from './discovery-tools';
import { registerFulfillmentTools } from './fulfillment-tools';
import { registerHelpTools } from './help-tools';
import { registerSharingTools } from './sharing-tools';
import { registerStoryTools } from './story-tools';
import { installToolListMetadataHandler, registerUiResources } from './tool-metadata';
import { registerTransactionTools } from './transaction-tools';

const MCP_SERVER_INFO = {
  name: 'mythoria-mcp',
  version: '0.9.0',
  description: 'Model Context Protocol server for Mythoria',
};

export function createMcpServer(authContext: McpAuthContext) {
  const server = new McpServer(MCP_SERVER_INFO);
  registerUiResources(server);

  registerDiscoveryTools(server, authContext);
  registerHelpTools(server, authContext);
  registerStoryTools(server, authContext);
  registerSharingTools(server, authContext);
  registerCreditTools(server, authContext);
  registerFulfillmentTools(server, authContext);
  registerTransactionTools(server, authContext);
  installToolListMetadataHandler(server);

  return server;
}

export async function handleMcpHttpRequest(request: Request) {
  let authContext: McpAuthContext = {
    author: null,
    userId: null,
    scopes: [],
    tokenType: null,
    tokenPresented: false,
    authError: null,
  };

  try {
    authContext = await resolveMcpAuthContext(request);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw error;
  }

  const server = createMcpServer(authContext);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();

  return response;
}
